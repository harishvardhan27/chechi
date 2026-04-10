"""
Signal Engine — Core intelligence layer for SensAI.

Computes friction scores, classifies signals as individual vs systemic,
and detects completion velocity drops.
"""

from typing import Dict, List, Optional
from api.utils.db import execute_db_operation
from api.config import (
    chat_history_table_name,
    task_completions_table_name,
    course_tasks_table_name,
    course_cohorts_table_name,
    questions_table_name,
    tasks_table_name,
    user_cohorts_table_name,
    users_table_name,
    friction_computations_table_name,
)

from api.bandit import UCB1Bandit
import uuid
import json

# --- Weights are now managed dynamically by RL (UCB1Bandit) in bandit.py ---

# Thresholds for normalization
MAX_CHAT_TURNS = 20            # 20+ turns → full weight
MAX_ATTEMPTS = 5               # 5+ attempts → full weight
MIN_PASSING_SCORE = 0.6        # Below 60% = low score signal
MAX_TIME_MINUTES = 60          # 60+ minutes → full weight

SYSTEMIC_THRESHOLD = 0.35      # >35% learners struggling → systemic
VELOCITY_DROP_THRESHOLD = 0.50 # >50% drop in tasks/day → risk


# ---------------------------------------------------------------------------
# Raw data fetchers
# ---------------------------------------------------------------------------

async def _get_chat_turns(learner_id: int, task_id: int) -> int:
    row = await execute_db_operation(
        f"""
        SELECT COUNT(ch.id)
        FROM {chat_history_table_name} ch
        JOIN {questions_table_name} q ON ch.question_id = q.id
        WHERE ch.user_id = ? AND q.task_id = ? AND ch.role = 'user'
          AND ch.deleted_at IS NULL AND q.deleted_at IS NULL
        """,
        (learner_id, task_id),
        fetch_one=True,
    )
    return row[0] if row else 0


async def _get_attempt_count(learner_id: int, task_id: int) -> int:
    row = await execute_db_operation(
        f"""
        SELECT COUNT(*)
        FROM {task_completions_table_name}
        WHERE user_id = ? AND task_id = ?
        """,
        (learner_id, task_id),
        fetch_one=True,
    )
    return row[0] if row else 0


async def _get_avg_score(learner_id: int, task_id: int) -> Optional[float]:
    """
    Returns a normalized score proxy [0,1] based on question completion ratio.
    A learner who completed all questions scores 1.0; none completed = 0.0.
    Falls back to None if no questions exist for the task.
    """
    total_row = await execute_db_operation(
        f"""
        SELECT COUNT(*) FROM {questions_table_name}
        WHERE task_id = ? AND deleted_at IS NULL
        """,
        (task_id,),
        fetch_one=True,
    )
    total_questions = total_row[0] if total_row else 0
    if total_questions == 0:
        return None

    completed_row = await execute_db_operation(
        f"""
        SELECT COUNT(*) FROM {task_completions_table_name}
        WHERE user_id = ? AND question_id IN (
            SELECT id FROM {questions_table_name} WHERE task_id = ? AND deleted_at IS NULL
        )
        """,
        (learner_id, task_id),
        fetch_one=True,
    )
    completed = completed_row[0] if completed_row else 0
    return completed / total_questions


async def _get_time_on_task_minutes(learner_id: int, task_id: int) -> float:
    """Returns total minutes spent across all sessions on this task."""
    row = await execute_db_operation(
        f"""
        SELECT ROUND(SUM(session_minutes), 1)
        FROM (
            SELECT (JULIANDAY(MAX(ch.created_at)) - JULIANDAY(MIN(ch.created_at))) * 24 * 60 AS session_minutes
            FROM {chat_history_table_name} ch
            JOIN {questions_table_name} q ON ch.question_id = q.id
            WHERE ch.user_id = ? AND q.task_id = ? AND ch.deleted_at IS NULL
            GROUP BY DATE(ch.created_at)
        )
        """,
        (learner_id, task_id),
        fetch_one=True,
    )
    return row[0] if row and row[0] else 0.0


# ---------------------------------------------------------------------------
# Core: compute_friction_score
# ---------------------------------------------------------------------------

async def compute_friction_score(
    learner_id: int, task_id: int, cohort_id: int
) -> Dict:
    """
    Returns a friction score [0.0, 1.0] and contributing signals.

    Score breakdown:
      - chat_turns:  normalized chat volume (confusion proxy)
      - attempts:    normalized retry count
      - low_score:   inverted normalized scorecard score
      - time_spent:  normalized time on task
    """
    bandit = UCB1Bandit(cohort_id)
    arm_id, weights = await bandit.select_arm()

    chat_turns = await _get_chat_turns(learner_id, task_id)
    attempts = await _get_attempt_count(learner_id, task_id)
    avg_score = await _get_avg_score(learner_id, task_id)
    time_minutes = await _get_time_on_task_minutes(learner_id, task_id)

    # Normalize each signal to [0, 1]
    chat_norm = min(chat_turns / MAX_CHAT_TURNS, 1.0)
    attempt_norm = min(attempts / MAX_ATTEMPTS, 1.0)
    score_norm = (1.0 - avg_score) if avg_score is not None else 0.5
    time_norm = min(time_minutes / MAX_TIME_MINUTES, 1.0)

    # LLM Sentiment Extraction (optional — falls back to 0.5 if unavailable)
    try:
        from api.agentic_engine import extract_sentiment_score
        llm_sentiment = await extract_sentiment_score(learner_id, task_id)
    except Exception:
        llm_sentiment = 0.5

    friction = (
        weights.chat * chat_norm
        + weights.attempts * attempt_norm
        + weights.score * score_norm
        + weights.time * time_norm
        + weights.llm * llm_sentiment
    )

    # Save to Friction computations for feedback loop
    fc_id = str(uuid.uuid4())
    signals_json = json.dumps({
        "chat": chat_norm, "attempts": attempt_norm, "score": score_norm, "time": time_norm, "llm": llm_sentiment
    })
    await execute_db_operation(
        f"""
        INSERT INTO {friction_computations_table_name} 
        (id, user_id, cohort_id, task_id, arm_id, friction_score, signals_json) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (fc_id, learner_id, cohort_id, task_id, arm_id, friction, signals_json)
    )

    reasons = []
    if chat_norm >= 0.5:
        reasons.append(f"high_chat_volume ({chat_turns} turns)")
    if attempt_norm >= 0.4:
        reasons.append(f"multiple_retries ({attempts} attempts)")
    if avg_score is not None and avg_score < MIN_PASSING_SCORE:
        reasons.append(f"low_score ({round(avg_score * 100)}%)")
    if time_norm >= 0.5:
        reasons.append(f"long_time_on_task ({time_minutes:.0f} min)")
    if llm_sentiment >= 0.6:
        reasons.append(f"high_frustration_detected")

    confidence = _compute_confidence(chat_turns, attempts, avg_score)

    return {
        "learner_id": learner_id,
        "task_id": task_id,
        "friction_score": round(friction, 3),
        "reasons": reasons,
        "confidence": confidence,
        "raw": {
            "chat_turns": chat_turns,
            "attempts": attempts,
            "avg_score_pct": round(avg_score * 100, 1) if avg_score is not None else None,
            "time_minutes": time_minutes,
        },
    }


def _compute_confidence(chat_turns: int, attempts: int, avg_score: Optional[float]) -> str:
    """Confidence is higher when more signal sources have data."""
    data_points = sum([
        chat_turns > 0,
        attempts > 0,
        avg_score is not None,
    ])
    if data_points == 3:
        return "high"
    if data_points == 2:
        return "medium"
    return "low"


# ---------------------------------------------------------------------------
# Core: classify_signal
# ---------------------------------------------------------------------------

async def classify_signal(task_id: int, cohort_id: int) -> Dict:
    """
    Classifies whether a task's difficulty is SYSTEMIC or INDIVIDUAL.

    SYSTEMIC: >35% of cohort learners are struggling on this task.
    INDIVIDUAL: fewer learners affected.
    """
    total_row = await execute_db_operation(
        f"""
        SELECT COUNT(DISTINCT uc.user_id)
        FROM {user_cohorts_table_name} uc
        WHERE uc.cohort_id = ? AND uc.role = 'learner' AND uc.deleted_at IS NULL
        """,
        (cohort_id,),
        fetch_one=True,
    )
    total_learners = total_row[0] if total_row else 0
    if total_learners == 0:
        return {"classification": "unknown", "reason": "no learners in cohort"}

    # Learners who chatted on this task but haven't completed it
    stuck_row = await execute_db_operation(
        f"""
        SELECT COUNT(DISTINCT ch.user_id)
        FROM {chat_history_table_name} ch
        JOIN {questions_table_name} q ON ch.question_id = q.id
        LEFT JOIN {task_completions_table_name} tc
            ON tc.task_id = q.task_id AND tc.user_id = ch.user_id
        WHERE q.task_id = ? AND ch.deleted_at IS NULL
          AND tc.id IS NULL
        """,
        (task_id,),
        fetch_one=True,
    )
    stuck_count = stuck_row[0] if stuck_row else 0
    stuck_ratio = stuck_count / total_learners

    classification = "systemic" if stuck_ratio >= SYSTEMIC_THRESHOLD else "individual"

    return {
        "task_id": task_id,
        "cohort_id": cohort_id,
        "classification": classification,
        "stuck_count": stuck_count,
        "total_learners": total_learners,
        "stuck_pct": round(stuck_ratio * 100, 1),
        "threshold_pct": round(SYSTEMIC_THRESHOLD * 100, 1),
    }


# ---------------------------------------------------------------------------
# Feature: Completion Velocity Detector
# ---------------------------------------------------------------------------

async def compute_completion_velocity(learner_id: int, cohort_id: int) -> Dict:
    """
    Computes tasks completed per day over two windows (recent vs prior).
    Flags a >50% drop as a velocity risk.
    """
    rows = await execute_db_operation(
        f"""
        SELECT DATE(tc.created_at) as day, COUNT(*) as completions
        FROM {task_completions_table_name} tc
        JOIN {course_tasks_table_name} ct ON tc.task_id = ct.task_id
        JOIN {course_cohorts_table_name} cc ON ct.course_id = cc.course_id
        WHERE tc.user_id = ? AND cc.cohort_id = ?
          AND tc.task_id IS NOT NULL
        GROUP BY DATE(tc.created_at)
        ORDER BY day ASC
        """,
        (learner_id, cohort_id),
        fetch_all=True,
    )

    if not rows:
        return {
            "learner_id": learner_id,
            "velocity_risk": False,
            "tasks_per_day_recent": 0.0,
            "tasks_per_day_prior": 0.0,
            "drop_pct": 0.0,
            "active_days": 0,
        }

    daily = [(r[0], r[1]) for r in rows]
    mid = len(daily) // 2 or 1

    prior_window = daily[:mid]
    recent_window = daily[mid:]

    prior_avg = sum(d[1] for d in prior_window) / len(prior_window) if prior_window else 0.0
    recent_avg = sum(d[1] for d in recent_window) / len(recent_window) if recent_window else 0.0

    drop_pct = ((prior_avg - recent_avg) / prior_avg) if prior_avg > 0 else 0.0
    velocity_risk = drop_pct >= VELOCITY_DROP_THRESHOLD

    return {
        "learner_id": learner_id,
        "velocity_risk": velocity_risk,
        "tasks_per_day_recent": round(recent_avg, 2),
        "tasks_per_day_prior": round(prior_avg, 2),
        "drop_pct": round(drop_pct * 100, 1),
        "active_days": len(daily),
    }


# ---------------------------------------------------------------------------
# Feature: Mentor Pre-Read builder
# ---------------------------------------------------------------------------

async def build_mentor_preread(learner_id: int, cohort_id: int) -> Dict:
    """
    Builds a structured pre-read summary for a mentor about a specific learner:
    - Recent activity
    - Struggles (signals)
    - Velocity status
    - Suggested action
    """
    from api.db.intelligence import (
        get_repetition_signals,
        get_struggle_language_signals,
        get_no_submission_signals,
    )

    # Gather signals for this learner
    rep = await get_repetition_signals(cohort_id)
    struggle = await get_struggle_language_signals(cohort_id)
    no_sub = await get_no_submission_signals(cohort_id)

    learner_signals = [
        s for s in (rep + struggle + no_sub)
        if s["user_id"] == learner_id
    ]

    velocity = await compute_completion_velocity(learner_id, cohort_id)

    # Recent activity: last 3 completed tasks
    recent_rows = await execute_db_operation(
        f"""
        SELECT t.title, tc.created_at
        FROM {task_completions_table_name} tc
        JOIN {tasks_table_name} t ON tc.task_id = t.id
        JOIN {course_tasks_table_name} ct ON tc.task_id = ct.task_id
        JOIN {course_cohorts_table_name} cc ON ct.course_id = cc.course_id
        WHERE tc.user_id = ? AND cc.cohort_id = ? AND tc.task_id IS NOT NULL
        ORDER BY tc.created_at DESC
        LIMIT 3
        """,
        (learner_id, cohort_id),
        fetch_all=True,
    )
    recent_activity = [{"task": r[0], "completed_at": r[1]} for r in recent_rows]

    # Determine suggested action
    if not learner_signals and not velocity["velocity_risk"]:
        suggested_action = "No immediate action needed. Monitor progress."
    elif velocity["velocity_risk"] and not learner_signals:
        suggested_action = "Check in on engagement — completion pace has dropped significantly."
    elif len(learner_signals) >= 3:
        suggested_action = "Schedule a 1:1 session — multiple struggle signals detected."
    else:
        top_signal = learner_signals[0]["signal"] if learner_signals else "unknown"
        suggested_action = f"Send a targeted resource or hint related to: {top_signal}."

    return {
        "learner_id": learner_id,
        "recent_activity": recent_activity,
        "struggles": [
            {"signal": s["signal"], "task": s.get("task_title", ""), "description": s["description"]}
            for s in learner_signals[:5]
        ],
        "velocity": velocity,
        "suggested_action": suggested_action,
    }


# ---------------------------------------------------------------------------
# Cohort-level: top at-risk learners with friction scores
# ---------------------------------------------------------------------------

async def get_top_at_risk_learners(cohort_id: int, top_n: int = 5) -> List[Dict]:
    """
    Returns top N at-risk learners in a cohort, ranked by friction score
    across their most-struggled task.
    """
    # Get all learners
    learners = await execute_db_operation(
        f"""
        SELECT u.id, u.first_name, u.last_name, u.email
        FROM {users_table_name} u
        JOIN {user_cohorts_table_name} uc ON u.id = uc.user_id
        WHERE uc.cohort_id = ? AND uc.role = 'learner'
          AND uc.deleted_at IS NULL AND u.deleted_at IS NULL
        """,
        (cohort_id,),
        fetch_all=True,
    )

    # For each learner, find their highest-friction task
    results = []
    for row in learners:
        uid, first, last, email = row

        # Find the task with most chat turns for this learner in cohort
        task_row = await execute_db_operation(
            f"""
            SELECT q.task_id, COUNT(*) as turns
            FROM {chat_history_table_name} ch
            JOIN {questions_table_name} q ON ch.question_id = q.id
            JOIN {course_tasks_table_name} ct ON q.task_id = ct.task_id
            JOIN {course_cohorts_table_name} cc ON ct.course_id = cc.course_id
            WHERE ch.user_id = ? AND cc.cohort_id = ? AND ch.role = 'user'
              AND ch.deleted_at IS NULL
            GROUP BY q.task_id
            ORDER BY turns DESC
            LIMIT 1
            """,
            (uid, cohort_id),
            fetch_one=True,
        )

        if not task_row:
            continue

        task_id = task_row[0]
        friction = await compute_friction_score(uid, task_id, cohort_id)
        velocity = await compute_completion_velocity(uid, cohort_id)

        results.append({
            "learner_id": uid,
            "name": f"{first or ''} {last or ''}".strip() or email,
            "email": email,
            "friction_score": friction["friction_score"],
            "reasons": friction["reasons"],
            "confidence": friction["confidence"],
            "velocity_risk": velocity["velocity_risk"],
            "top_struggle_task_id": task_id,
        })

    results.sort(key=lambda x: x["friction_score"], reverse=True)
    return results[:top_n]
