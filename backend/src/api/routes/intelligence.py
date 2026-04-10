"""
Intelligence Routes — Mentor & Creator Intelligence Platform

Endpoints:
  GET  /intelligence/cohort/{cohort_id}/signals          — raw signals (existing)
  GET  /intelligence/cohort/{cohort_id}/insights         — AI insights (existing)
  GET  /intelligence/cohort/{cohort_id}/insights/stream  — streaming insights (existing)
  GET  /intelligence/mentor/{cohort_id}/briefing         — top 5 at-risk + friction scores
  GET  /intelligence/creator/{course_id}/signals         — systemic issues + weak modules
  POST /intelligence/actions/trigger                     — generate intervention message
  GET  /intelligence/learner/{learner_id}/preread        — mentor pre-read for one learner
  GET  /intelligence/learner/{learner_id}/velocity       — completion velocity
  GET  /intelligence/task/{task_id}/classify             — individual vs systemic classifier
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from typing import AsyncGenerator, Literal, Optional
from pydantic import BaseModel, Field
from aiocache import cached, SimpleMemoryCache

from api.db.intelligence import get_all_signals, get_systemic_issues
from api.signal_engine import (
    compute_friction_score,
    classify_signal,
    compute_completion_velocity,
    build_mentor_preread,
    get_top_at_risk_learners,
)
from api.action_engine import recommend_action, generate_action_message
from api.llm import run_llm_with_openai, stream_llm_with_openai
from api.config import openai_plan_to_model_name
from api.utils.db import execute_db_operation
from api.config import (
    course_cohorts_table_name,
    course_tasks_table_name,
    tasks_table_name,
    courses_table_name,
    chat_history_table_name,
    task_completions_table_name,
    questions_table_name,
    user_cohorts_table_name,
    users_table_name,
)
import json

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class TriggerActionRequest(BaseModel):
    learner_id: int
    task_id: int
    cohort_id: int
    learner_name: Optional[str] = None


class RecommendedAction(BaseModel):
    action_type: Literal["outreach", "content_revision", "cohort_intervention", "resource_assignment"]
    target: str
    description: str
    urgency: Literal["immediate", "this_week", "monitor"]


class PriorityInsight(BaseModel):
    issue_type: Literal["individual", "systemic"]
    severity: Literal["high", "medium", "low"]
    affected_entity: str
    description: str
    evidence: str
    recommended_action: RecommendedAction


class InsightOutput(BaseModel):
    summary: str = Field(description="One sentence summary of the cohort's current state")
    insights: list[PriorityInsight] = Field(description="Prioritized list of insights, highest severity first")


class LearnerScores(BaseModel):
    engagement: float = Field(description="0-10 score for how actively the learner engages with the material")
    understanding: float = Field(description="0-10 score for conceptual understanding based on chat quality and completions")
    persistence: float = Field(description="0-10 score for how much the learner keeps trying when stuck")
    velocity: float = Field(description="0-10 score for pace of task completion relative to cohort")
    independence: float = Field(description="0-10 score for how self-sufficient the learner is (low AI reliance = high independence)")


class LearnerCharacteristics(BaseModel):
    learning_style: str = Field(description="e.g. 'visual-conceptual', 'trial-and-error', 'methodical'")
    strengths: list[str] = Field(description="2-3 specific strengths observed from behavior")
    struggle_areas: list[str] = Field(description="2-3 specific areas where the learner consistently struggles")
    behavioral_pattern: str = Field(description="One sentence describing the learner's overall behavioral pattern")
    recommended_intervention: str = Field(description="Most impactful next action a mentor should take")


class LearnerProfile(BaseModel):
    scores: LearnerScores
    characteristics: LearnerCharacteristics
    summary: str = Field(description="2-3 sentence narrative summary of this learner for a mentor")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_signals_prompt(signals: dict, persona: str) -> str:
    lines = [f"Persona: {persona}\n"]
    lines.append(
        f"Summary: {signals['summary']['total_at_risk_learners']} at-risk learners, "
        f"{signals['summary']['total_struggling_learners']} struggling, "
        f"{signals['summary']['total_systemic_issues']} systemic content issues.\n"
    )
    if signals["individual_issues"]:
        lines.append("Individual Learner Signals:")
        for learner in signals["individual_issues"][:10]:
            lines.append(f"  - {learner['user_name']} (severity: {learner['severity']}):")
            for s in learner["signals"][:3]:
                lines.append(f"      [{s['signal']}] {s['description']} (task: {s['task_title']})")
    if signals["systemic_issues"]:
        lines.append("\nSystemic Content Issues:")
        for issue in signals["systemic_issues"][:5]:
            lines.append(f"  - {issue['task_title']}: {issue['description']}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Existing endpoints (preserved)
# ---------------------------------------------------------------------------

@router.get("/cohort/{cohort_id}/signals")
async def get_cohort_signals(cohort_id: int):
    """Raw signal data — all 5 chat_history signals + systemic issues."""
    return await get_all_signals(cohort_id)


@router.get("/cohort/{cohort_id}/insights")
async def get_cohort_insights(
    cohort_id: int,
    persona: Literal["mentor", "creator", "operator"] = "mentor",
):
    """AI-generated prioritized insights for a specific persona."""
    signals = await get_all_signals(cohort_id)

    if not signals["individual_issues"] and not signals["systemic_issues"]:
        return {
            "summary": "All learners are on track. No issues detected.",
            "insights": [],
            "signals": signals,
        }

    persona_instructions = {
        "mentor": "Focus on individual learners who need immediate 1:1 support. Prioritize by urgency. Recommend specific outreach or resource assignment actions.",
        "creator": "Focus on systemic content issues where multiple learners are stuck on the same task. Recommend content revisions or prerequisite additions.",
        "operator": "Focus on cohort-wide patterns and engagement trends. Recommend cohort-level interventions.",
    }

    system_prompt = (
        f"You are an AI learning intelligence system analyzing learner behavior signals from a real LMS.\n"
        f"{persona_instructions[persona]}\n"
        "Generate insights that are specific, evidence-based, and immediately actionable.\n"
        "Only reference data that is explicitly provided. Do not invent learner names or statistics."
    )

    result = await run_llm_with_openai(
        model=openai_plan_to_model_name["text-mini"],
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": _build_signals_prompt(signals, persona)},
        ],
        response_model=InsightOutput,
        max_output_tokens=2048,
        api_mode="chat_completions",
    )

    return {
        "summary": result.summary,
        "insights": [i.model_dump() for i in result.insights],
        "signals": signals,
    }


@router.get("/cohort/{cohort_id}/insights/stream")
async def stream_cohort_insights(
    cohort_id: int,
    persona: Literal["mentor", "creator", "operator"] = "mentor",
):
    """Streaming version of insights for live UI updates."""
    async def generate() -> AsyncGenerator[str, None]:
        signals = await get_all_signals(cohort_id)
        yield json.dumps({"type": "signals", "data": signals}) + "\n"

        if not signals["individual_issues"] and not signals["systemic_issues"]:
            yield json.dumps({"type": "done", "data": {"summary": "All learners are on track."}}) + "\n"
            return

        persona_instructions = {
            "mentor": "Focus on individual learners needing immediate support. Recommend outreach or resource assignment.",
            "creator": "Focus on systemic content issues. Recommend content revisions.",
            "operator": "Focus on cohort-wide patterns. Recommend cohort-level interventions.",
        }

        system_prompt = (
            f"You are an AI learning intelligence system.\n"
            f"{persona_instructions[persona]}\n"
            "Be specific, evidence-based, and actionable. Only use data provided."
        )

        async for chunk in stream_llm_with_openai(
            model=openai_plan_to_model_name["text-mini"],
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": _build_signals_prompt(signals, persona)},
            ],
            response_model=InsightOutput,
            max_output_tokens=2048,
            api_mode="chat_completions",
        ):
            yield json.dumps({"type": "chunk", "data": chunk.model_dump()}) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson")


# ---------------------------------------------------------------------------
# NEW: Mentor Briefing — top 5 at-risk learners with friction scores
# TTL: 60 seconds
# ---------------------------------------------------------------------------

@router.get("/mentor/{cohort_id}/briefing")
async def get_mentor_briefing(cohort_id: int):
    return await _cached_mentor_briefing(cohort_id)


@cached(ttl=60, cache=SimpleMemoryCache)
async def _cached_mentor_briefing(cohort_id: int):
    """
    Returns top 5 high-risk learners with friction scores, reasons, and confidence.

    Cached for 60 seconds.
    """
    at_risk = await get_top_at_risk_learners(cohort_id, top_n=5)

    if not at_risk:
        return {
            "cohort_id": cohort_id,
            "high_risk_learners": [],
            "summary": "No at-risk learners detected in this cohort.",
        }

    # Enrich each learner with recommended action
    enriched = []
    for learner in at_risk:
        action = recommend_action(learner)
        enriched.append({
            "learner_id": learner["learner_id"],
            "name": learner["name"],
            "email": learner["email"],
            "friction_score": learner["friction_score"],
            "risk_level": _friction_to_risk(learner["friction_score"]),
            "reasons": learner["reasons"],
            "confidence": learner["confidence"],
            "velocity_risk": learner["velocity_risk"],
            "recommended_action": action,
        })

    return {
        "cohort_id": cohort_id,
        "high_risk_learners": enriched,
        "summary": {
            "critical": sum(1 for l in enriched if l["risk_level"] == "critical"),
            "high": sum(1 for l in enriched if l["risk_level"] == "high"),
            "medium": sum(1 for l in enriched if l["risk_level"] == "medium"),
        },
    }


def _friction_to_risk(score: float) -> str:
    if score >= 0.75:
        return "critical"
    if score >= 0.50:
        return "high"
    if score >= 0.25:
        return "medium"
    return "low"


# ---------------------------------------------------------------------------
# NEW: Creator Signals — systemic issues + weak modules + rubric heatmap
# TTL: 300 seconds
# ---------------------------------------------------------------------------

@router.get("/creator/{course_id}/signals")
async def get_creator_signals(course_id: int):
    return await _cached_creator_signals(course_id)


@cached(ttl=300, cache=SimpleMemoryCache)
async def _cached_creator_signals(course_id: int):
    """
    Returns systemic issues, weak modules, and rubric heatmap data for a course.

    Cached for 300 seconds.
    """
    # Get cohort_id for this course (use first active cohort)
    cohort_row = await execute_db_operation(
        f"""
        SELECT cohort_id FROM {course_cohorts_table_name}
        WHERE course_id = ? AND deleted_at IS NULL
        LIMIT 1
        """,
        (course_id,),
        fetch_one=True,
    )

    cohort_id = cohort_row[0] if cohort_row else None

    # Systemic issues (tasks where >35% learners are stuck)
    systemic = await get_systemic_issues(cohort_id, threshold=0.35) if cohort_id else []

    # Weak modules: tasks with lowest completion rates in this course
    weak_modules = await _get_weak_modules(course_id)

    # Rubric heatmap: per-task chat volume (proxy for confusion)
    heatmap = await _get_rubric_heatmap(course_id)

    return {
        "course_id": course_id,
        "systemic_issues": systemic,
        "weak_modules": weak_modules,
        "rubric_heatmap": heatmap,
        "summary": {
            "total_systemic_issues": len(systemic),
            "total_weak_modules": len(weak_modules),
            "most_confused_task": heatmap[0]["task_title"] if heatmap else None,
        },
    }


async def _get_weak_modules(course_id: int) -> list:
    """Tasks with lowest completion rates in a course."""
    rows = await execute_db_operation(
        f"""
        SELECT
            t.id,
            t.title,
            COUNT(DISTINCT tc.user_id) as completions,
            COUNT(DISTINCT ch_users.user_id) as attempted
        FROM {tasks_table_name} t
        JOIN {course_tasks_table_name} ct ON t.id = ct.task_id
        LEFT JOIN {task_completions_table_name} tc ON tc.task_id = t.id
        LEFT JOIN (
            SELECT DISTINCT ch.user_id, q.task_id
            FROM {chat_history_table_name} ch
            JOIN {questions_table_name} q ON ch.question_id = q.id
        ) ch_users ON ch_users.task_id = t.id
        WHERE ct.course_id = ? AND t.deleted_at IS NULL
        GROUP BY t.id, t.title
        HAVING attempted > 0
        ORDER BY (CAST(completions AS FLOAT) / attempted) ASC
        LIMIT 5
        """,
        (course_id,),
        fetch_all=True,
    )
    return [
        {
            "task_id": r[0],
            "task_title": r[1],
            "completions": r[2],
            "attempted": r[3],
            "completion_rate_pct": round(r[2] / r[3] * 100, 1) if r[3] > 0 else 0,
            "weakness_signal": "low_completion_rate",
        }
        for r in rows
    ]


async def _get_rubric_heatmap(course_id: int) -> list:
    """Per-task chat volume — high volume = confusion hotspot."""
    rows = await execute_db_operation(
        f"""
        SELECT
            t.id,
            t.title,
            COUNT(ch.id) as total_messages,
            COUNT(DISTINCT ch.user_id) as unique_learners
        FROM {tasks_table_name} t
        JOIN {course_tasks_table_name} ct ON t.id = ct.task_id
        JOIN {questions_table_name} q ON q.task_id = t.id
        JOIN {chat_history_table_name} ch ON ch.question_id = q.id
        WHERE ct.course_id = ? AND t.deleted_at IS NULL
          AND ch.role = 'user' AND ch.deleted_at IS NULL
        GROUP BY t.id, t.title
        ORDER BY total_messages DESC
        """,
        (course_id,),
        fetch_all=True,
    )
    return [
        {
            "task_id": r[0],
            "task_title": r[1],
            "total_messages": r[2],
            "unique_learners": r[3],
            "avg_messages_per_learner": round(r[2] / r[3], 1) if r[3] > 0 else 0,
            "confusion_level": "high" if r[2] / max(r[3], 1) >= 8 else "medium" if r[2] / max(r[3], 1) >= 4 else "low",
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
# NEW: Trigger Action — generate intervention message
# ---------------------------------------------------------------------------

@router.post("/actions/trigger")
async def trigger_action(request: TriggerActionRequest):
    """
    Computes friction score for a learner+task, recommends an action,
    and generates an AI-powered intervention message.
    """
    friction = await compute_friction_score(
        request.learner_id, request.task_id, request.cohort_id
    )
    classification = await classify_signal(request.task_id, request.cohort_id)
    velocity = await compute_completion_velocity(request.learner_id, request.cohort_id)

    # Merge signals for rule engine
    signal_context = {
        **friction,
        "velocity_risk": velocity["velocity_risk"],
        "classification": classification["classification"],
    }

    action = recommend_action(signal_context)

    # Get task title for message context
    task_row = await execute_db_operation(
        f"SELECT title FROM {tasks_table_name} WHERE id = ?",
        (request.task_id,),
        fetch_one=True,
    )
    task_title = task_row[0] if task_row else f"Task {request.task_id}"

    message = await generate_action_message({
        "learner_name": request.learner_name or f"Learner #{request.learner_id}",
        "action_type": action["action_type"],
        "reasons": friction["reasons"],
        "task_title": task_title,
        "friction_score": friction["friction_score"],
        "velocity_risk": velocity["velocity_risk"],
    })

    return {
        "learner_id": request.learner_id,
        "task_id": request.task_id,
        "friction": friction,
        "classification": classification,
        "velocity": velocity,
        "recommended_action": action,
        "intervention_message": message,
    }


# ---------------------------------------------------------------------------
# NEW: Mentor Pre-Read for a specific learner
# ---------------------------------------------------------------------------

@router.get("/learner/{learner_id}/preread")
async def get_learner_preread(learner_id: int, cohort_id: int):
    """
    Returns a structured pre-read summary for a mentor:
    struggles, recent activity, velocity, and suggested action.
    """
    preread = await build_mentor_preread(learner_id, cohort_id)
    return preread


# ---------------------------------------------------------------------------
# NEW: Completion Velocity for a learner
# ---------------------------------------------------------------------------

@router.get("/learner/{learner_id}/velocity")
async def get_learner_velocity(learner_id: int, cohort_id: int):
    """Returns completion velocity and drop detection for a learner."""
    return await compute_completion_velocity(learner_id, cohort_id)


# ---------------------------------------------------------------------------
# NEW: Individual vs Systemic Classifier for a task
# ---------------------------------------------------------------------------

@router.get("/task/{task_id}/classify")
async def classify_task_signal(task_id: int, cohort_id: int):
    """
    Classifies whether a task's difficulty is SYSTEMIC (>35% learners stuck)
    or INDIVIDUAL.
    """
    return await classify_signal(task_id, cohort_id)


# ---------------------------------------------------------------------------
# NEW: Friction score for a specific learner+task
# ---------------------------------------------------------------------------

@router.get("/learner/{learner_id}/friction")
async def get_friction_score(learner_id: int, task_id: int, cohort_id: int):
    """Returns the friction score and contributing signals for a learner on a task."""
    return await compute_friction_score(learner_id, task_id, cohort_id)


# ---------------------------------------------------------------------------
# NEW: Learner Profile — OpenAI-powered scores + characteristics
# ---------------------------------------------------------------------------

async def _build_learner_context(learner_id: int, cohort_id: int) -> str:
    """Fetch raw learner data from DB and format it as a prompt context string."""
    from api.db.intelligence import (
        get_repetition_signals,
        get_struggle_language_signals,
        get_no_submission_signals,
        get_escalation_ladder_signals,
        get_time_on_task_signals,
    )

    # Learner info
    learner_row = await execute_db_operation(
        f"SELECT first_name, last_name, email FROM {users_table_name} WHERE id = ? AND deleted_at IS NULL",
        (learner_id,),
        fetch_one=True,
    )
    if not learner_row:
        raise HTTPException(status_code=404, detail="Learner not found")
    name = f"{learner_row[0] or ''} {learner_row[1] or ''}".strip() or learner_row[2]

    # Total tasks completed in cohort
    completed_row = await execute_db_operation(
        f"""
        SELECT COUNT(DISTINCT tc.task_id)
        FROM {task_completions_table_name} tc
        JOIN {course_tasks_table_name} ct ON tc.task_id = ct.task_id
        JOIN {course_cohorts_table_name} cc ON ct.course_id = cc.course_id
        WHERE tc.user_id = ? AND cc.cohort_id = ?
        """,
        (learner_id, cohort_id),
        fetch_one=True,
    )
    tasks_completed = completed_row[0] if completed_row else 0

    # Total tasks in cohort
    total_tasks_row = await execute_db_operation(
        f"""
        SELECT COUNT(DISTINCT ct.task_id)
        FROM {course_tasks_table_name} ct
        JOIN {course_cohorts_table_name} cc ON ct.course_id = cc.course_id
        WHERE cc.cohort_id = ?
        """,
        (cohort_id,),
        fetch_one=True,
    )
    total_tasks = total_tasks_row[0] if total_tasks_row else 0

    # Total chat messages sent
    chat_row = await execute_db_operation(
        f"""
        SELECT COUNT(*)
        FROM {chat_history_table_name} ch
        JOIN {questions_table_name} q ON ch.question_id = q.id
        JOIN {course_tasks_table_name} ct ON q.task_id = ct.task_id
        JOIN {course_cohorts_table_name} cc ON ct.course_id = cc.course_id
        WHERE ch.user_id = ? AND cc.cohort_id = ? AND ch.role = 'user' AND ch.deleted_at IS NULL
        """,
        (learner_id, cohort_id),
        fetch_one=True,
    )
    total_chat_messages = chat_row[0] if chat_row else 0

    # Velocity
    velocity = await compute_completion_velocity(learner_id, cohort_id)

    # Signals for this learner
    all_signals = [
        s for signals in [
            await get_repetition_signals(cohort_id),
            await get_struggle_language_signals(cohort_id),
            await get_no_submission_signals(cohort_id),
            await get_escalation_ladder_signals(cohort_id),
            await get_time_on_task_signals(cohort_id),
        ]
        for s in signals
        if s["user_id"] == learner_id
    ]

    # Recent completed tasks
    recent_rows = await execute_db_operation(
        f"""
        SELECT t.title, tc.created_at
        FROM {task_completions_table_name} tc
        JOIN {tasks_table_name} t ON tc.task_id = t.id
        JOIN {course_tasks_table_name} ct ON tc.task_id = ct.task_id
        JOIN {course_cohorts_table_name} cc ON ct.course_id = cc.course_id
        WHERE tc.user_id = ? AND cc.cohort_id = ? AND tc.task_id IS NOT NULL
        ORDER BY tc.created_at DESC LIMIT 5
        """,
        (learner_id, cohort_id),
        fetch_all=True,
    )

    lines = [
        f"Learner: {name}",
        f"Tasks completed: {tasks_completed}/{total_tasks}",
        f"Total chat messages sent: {total_chat_messages}",
        f"Completion velocity — recent: {velocity['tasks_per_day_recent']}/day, prior: {velocity['tasks_per_day_prior']}/day, drop: {velocity['drop_pct']}%, risk: {velocity['velocity_risk']}",
    ]

    if recent_rows:
        lines.append("Recently completed tasks: " + ", ".join(r[0] for r in recent_rows))

    if all_signals:
        lines.append(f"\nBehavioral signals ({len(all_signals)} total):")
        for s in all_signals[:10]:
            lines.append(f"  [{s['signal']}] {s['description']} (task: {s.get('task_title', 'unknown')}, severity: {s['severity']})")
    else:
        lines.append("\nNo struggle signals detected.")

    return "\n".join(lines)


@router.get("/learner/{learner_id}/profile")
async def get_learner_profile(learner_id: int, cohort_id: int):
    """
    Uses OpenAI to generate scores and characteristics for a learner
    based on their activity data in a cohort.
    """
    context = await _build_learner_context(learner_id, cohort_id)

    system_prompt = (
        "You are an expert learning analyst. Given a learner's behavioral data from an LMS, "
        "produce accurate scores (0-10) and qualitative characteristics. "
        "Base everything strictly on the data provided. Do not invent information."
    )

    result = await run_llm_with_openai(
        model=openai_plan_to_model_name["text-mini"],
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": context},
        ],
        response_model=LearnerProfile,
        max_output_tokens=1024,
        api_mode="chat_completions",
    )

    return {
        "learner_id": learner_id,
        "cohort_id": cohort_id,
        "scores": result.scores.model_dump(),
        "characteristics": result.characteristics.model_dump(),
        "summary": result.summary,
    }
