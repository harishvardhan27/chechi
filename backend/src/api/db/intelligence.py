from typing import Dict, List
from collections import defaultdict
from api.utils.db import execute_db_operation
from api.config import (
    chat_history_table_name,
    questions_table_name,
    tasks_table_name,
    task_completions_table_name,
    course_tasks_table_name,
    course_cohorts_table_name,
    users_table_name,
    user_cohorts_table_name,
)

STRUGGLE_PHRASES = [
    "i don't understand",
    "i dont understand",
    "why does this",
    "this doesn't make sense",
    "this doesnt make sense",
    "i'm confused",
    "im confused",
    "not sure why",
    "can you explain",
    "what does this mean",
    "i'm lost",
    "im lost",
    "doesn't work",
    "doesnt work",
    "still don't get",
    "still dont get",
]


async def get_cohort_learner_ids(cohort_id: int) -> List[Dict]:
    rows = await execute_db_operation(
        f"""
        SELECT u.id, u.first_name, u.last_name, u.email
        FROM {users_table_name} u
        JOIN {user_cohorts_table_name} uc ON u.id = uc.user_id
        WHERE uc.cohort_id = ? AND uc.role = 'learner' AND uc.deleted_at IS NULL AND u.deleted_at IS NULL
        """,
        (cohort_id,),
        fetch_all=True,
    )
    return [{"id": r[0], "first_name": r[1], "last_name": r[2], "email": r[3]} for r in rows]


async def get_repetition_signals(cohort_id: int, min_repeats: int = 3) -> List[Dict]:
    """Learners who sent >= min_repeats messages on the same question in one session (same day)."""
    rows = await execute_db_operation(
        f"""
        SELECT
            ch.user_id,
            u.first_name, u.last_name,
            ch.question_id,
            t.title as task_title,
            DATE(ch.created_at) as session_date,
            COUNT(*) as message_count
        FROM {chat_history_table_name} ch
        JOIN {users_table_name} u ON ch.user_id = u.id
        JOIN {questions_table_name} q ON ch.question_id = q.id
        JOIN {tasks_table_name} t ON q.task_id = t.id
        JOIN {course_tasks_table_name} ct ON t.id = ct.task_id
        JOIN {course_cohorts_table_name} cc ON ct.course_id = cc.course_id
        WHERE cc.cohort_id = ?
          AND ch.role = 'user'
          AND ch.deleted_at IS NULL
          AND q.deleted_at IS NULL
        GROUP BY ch.user_id, ch.question_id, DATE(ch.created_at)
        HAVING COUNT(*) >= ?
        ORDER BY message_count DESC
        """,
        (cohort_id, min_repeats),
        fetch_all=True,
    )
    return [
        {
            "user_id": r[0],
            "user_name": f"{r[1] or ''} {r[2] or ''}".strip(),
            "question_id": r[3],
            "task_title": r[4],
            "session_date": r[5],
            "message_count": r[6],
            "signal": "repetition",
            "severity": "high" if r[6] >= 6 else "medium",
            "description": f"Sent {r[6]} messages on the same question in one session — conceptual gap detected",
        }
        for r in rows
    ]


async def get_time_on_task_signals(cohort_id: int, threshold_minutes: int = 30) -> List[Dict]:
    """Learners who spent significantly more time than expected on a single question."""
    rows = await execute_db_operation(
        f"""
        SELECT
            ch.user_id,
            u.first_name, u.last_name,
            ch.question_id,
            t.title as task_title,
            DATE(ch.created_at) as session_date,
            ROUND((JULIANDAY(MAX(ch.created_at)) - JULIANDAY(MIN(ch.created_at))) * 24 * 60, 1) as minutes_spent
        FROM {chat_history_table_name} ch
        JOIN {users_table_name} u ON ch.user_id = u.id
        JOIN {questions_table_name} q ON ch.question_id = q.id
        JOIN {tasks_table_name} t ON q.task_id = t.id
        JOIN {course_tasks_table_name} ct ON t.id = ct.task_id
        JOIN {course_cohorts_table_name} cc ON ct.course_id = cc.course_id
        WHERE cc.cohort_id = ?
          AND ch.deleted_at IS NULL
          AND q.deleted_at IS NULL
        GROUP BY ch.user_id, ch.question_id, DATE(ch.created_at)
        HAVING minutes_spent >= ?
        ORDER BY minutes_spent DESC
        """,
        (cohort_id, threshold_minutes),
        fetch_all=True,
    )
    return [
        {
            "user_id": r[0],
            "user_name": f"{r[1] or ''} {r[2] or ''}".strip(),
            "question_id": r[3],
            "task_title": r[4],
            "session_date": r[5],
            "minutes_spent": r[6],
            "signal": "time_on_task",
            "severity": "high" if r[6] >= 60 else "medium",
            "description": f"Spent {r[6]} minutes on a single question — time-on-task anomaly",
        }
        for r in rows
    ]


async def get_struggle_language_signals(cohort_id: int) -> List[Dict]:
    """Learners whose messages contain struggle phrases."""
    rows = await execute_db_operation(
        f"""
        SELECT
            ch.user_id,
            u.first_name, u.last_name,
            ch.question_id,
            t.title as task_title,
            ch.content,
            ch.created_at
        FROM {chat_history_table_name} ch
        JOIN {users_table_name} u ON ch.user_id = u.id
        JOIN {questions_table_name} q ON ch.question_id = q.id
        JOIN {tasks_table_name} t ON q.task_id = t.id
        JOIN {course_tasks_table_name} ct ON t.id = ct.task_id
        JOIN {course_cohorts_table_name} cc ON ct.course_id = cc.course_id
        WHERE cc.cohort_id = ?
          AND ch.role = 'user'
          AND ch.deleted_at IS NULL
          AND q.deleted_at IS NULL
          AND ch.content IS NOT NULL
        ORDER BY ch.created_at DESC
        """,
        (cohort_id,),
        fetch_all=True,
    )

    # Group by user+question, flag if any message contains struggle phrase
    seen = set()
    signals = []
    for r in rows:
        user_id, first_name, last_name, question_id, task_title, content, created_at = r
        if not content:
            continue
        content_lower = content.lower()
        matched = [p for p in STRUGGLE_PHRASES if p in content_lower]
        if matched:
            key = (user_id, question_id)
            if key not in seen:
                seen.add(key)
                signals.append({
                    "user_id": user_id,
                    "user_name": f"{first_name or ''} {last_name or ''}".strip(),
                    "question_id": question_id,
                    "task_title": task_title,
                    "matched_phrases": matched[:3],
                    "last_seen": created_at,
                    "signal": "struggle_language",
                    "severity": "high",
                    "description": f"Used struggle language: \"{matched[0]}\" — sentiment-tagged confusion",
                })
    return signals


async def get_escalation_ladder_signals(cohort_id: int) -> List[Dict]:
    """Questions where AI response_type escalated: text → code/hint → solution across turns."""
    rows = await execute_db_operation(
        f"""
        SELECT
            ch.user_id,
            u.first_name, u.last_name,
            ch.question_id,
            t.title as task_title,
            GROUP_CONCAT(ch.response_type ORDER BY ch.created_at) as response_sequence
        FROM {chat_history_table_name} ch
        JOIN {users_table_name} u ON ch.user_id = u.id
        JOIN {questions_table_name} q ON ch.question_id = q.id
        JOIN {tasks_table_name} t ON q.task_id = t.id
        JOIN {course_tasks_table_name} ct ON t.id = ct.task_id
        JOIN {course_cohorts_table_name} cc ON ct.course_id = cc.course_id
        WHERE cc.cohort_id = ?
          AND ch.role = 'assistant'
          AND ch.response_type IS NOT NULL
          AND ch.deleted_at IS NULL
          AND q.deleted_at IS NULL
        GROUP BY ch.user_id, ch.question_id
        HAVING COUNT(*) >= 3
        """,
        (cohort_id,),
        fetch_all=True,
    )

    signals = []
    for r in rows:
        user_id, first_name, last_name, question_id, task_title, response_sequence = r
        if not response_sequence:
            continue
        types = [x.strip() for x in response_sequence.split(",") if x.strip()]
        # Escalation: sequence ends with 'code' after starting with 'text'
        if len(types) >= 3 and types[0] == "text" and types[-1] == "code":
            signals.append({
                "user_id": user_id,
                "user_name": f"{first_name or ''} {last_name or ''}".strip(),
                "question_id": question_id,
                "task_title": task_title,
                "response_sequence": types,
                "signal": "escalation_ladder",
                "severity": "medium",
                "description": f"AI escalated from explanation to solution across {len(types)} turns — learner needed progressive help",
            })
    return signals


async def get_no_submission_signals(cohort_id: int, min_messages: int = 5) -> List[Dict]:
    """Learners who chatted extensively but never completed the question."""
    rows = await execute_db_operation(
        f"""
        SELECT
            ch.user_id,
            u.first_name, u.last_name,
            ch.question_id,
            t.title as task_title,
            COUNT(*) as message_count,
            MAX(ch.created_at) as last_active
        FROM {chat_history_table_name} ch
        JOIN {users_table_name} u ON ch.user_id = u.id
        JOIN {questions_table_name} q ON ch.question_id = q.id
        JOIN {tasks_table_name} t ON q.task_id = t.id
        JOIN {course_tasks_table_name} ct ON t.id = ct.task_id
        JOIN {course_cohorts_table_name} cc ON ct.course_id = cc.course_id
        LEFT JOIN {task_completions_table_name} tc
            ON tc.question_id = ch.question_id AND tc.user_id = ch.user_id
        WHERE cc.cohort_id = ?
          AND ch.role = 'user'
          AND ch.deleted_at IS NULL
          AND q.deleted_at IS NULL
          AND tc.id IS NULL
        GROUP BY ch.user_id, ch.question_id
        HAVING COUNT(*) >= ?
        ORDER BY message_count DESC
        """,
        (cohort_id, min_messages),
        fetch_all=True,
    )
    return [
        {
            "user_id": r[0],
            "user_name": f"{r[1] or ''} {r[2] or ''}".strip(),
            "question_id": r[3],
            "task_title": r[4],
            "message_count": r[5],
            "last_active": r[6],
            "signal": "no_submission",
            "severity": "high",
            "description": f"Sent {r[5]} messages but never submitted — engagement without conversion",
        }
        for r in rows
    ]


async def get_systemic_issues(cohort_id: int, threshold: float = 0.3) -> List[Dict]:
    """Tasks where >= threshold fraction of cohort learners are stuck (chatted but not completed)."""
    learners = await get_cohort_learner_ids(cohort_id)
    total = len(learners)
    if total == 0:
        return []

    learner_ids_str = ",".join(str(l["id"]) for l in learners)

    rows = await execute_db_operation(
        f"""
        SELECT
            q.id as question_id,
            t.id as task_id,
            t.title as task_title,
            COUNT(DISTINCT ch.user_id) as stuck_count
        FROM {chat_history_table_name} ch
        JOIN {questions_table_name} q ON ch.question_id = q.id
        JOIN {tasks_table_name} t ON q.task_id = t.id
        JOIN {course_tasks_table_name} ct ON t.id = ct.task_id
        JOIN {course_cohorts_table_name} cc ON ct.course_id = cc.course_id
        LEFT JOIN {task_completions_table_name} tc
            ON tc.question_id = ch.question_id AND tc.user_id = ch.user_id
        WHERE cc.cohort_id = ?
          AND ch.user_id IN ({learner_ids_str})
          AND ch.role = 'user'
          AND ch.deleted_at IS NULL
          AND q.deleted_at IS NULL
          AND tc.id IS NULL
        GROUP BY q.id, t.id, t.title
        HAVING CAST(stuck_count AS FLOAT) / ? >= ?
        ORDER BY stuck_count DESC
        """,
        (cohort_id, total, threshold),
        fetch_all=True,
    )
    return [
        {
            "question_id": r[0],
            "task_id": r[1],
            "task_title": r[2],
            "stuck_count": r[3],
            "total_learners": total,
            "stuck_pct": round(r[3] / total * 100, 1),
            "issue_type": "systemic",
            "severity": "high" if r[3] / total >= 0.5 else "medium",
            "description": f"{r[3]}/{total} learners ({round(r[3]/total*100,1)}%) stuck on this task — content issue, not individual struggle",
            "recommended_action": "Revise explanation or add prerequisite reinforcement module",
        }
        for r in rows
    ]


async def get_all_signals(cohort_id: int) -> Dict:
    """Aggregate all 5 signals + systemic issues for a cohort."""
    repetition = await get_repetition_signals(cohort_id)
    time_on_task = await get_time_on_task_signals(cohort_id)
    struggle_language = await get_struggle_language_signals(cohort_id)
    escalation = await get_escalation_ladder_signals(cohort_id)
    no_submission = await get_no_submission_signals(cohort_id)
    systemic = await get_systemic_issues(cohort_id)

    # Merge individual signals per user
    individual_map: Dict[int, Dict] = defaultdict(lambda: {
        "signals": [], "severity": "low", "user_name": "", "user_id": None
    })

    severity_rank = {"high": 3, "medium": 2, "low": 1}

    for signal in repetition + time_on_task + struggle_language + escalation + no_submission:
        uid = signal["user_id"]
        individual_map[uid]["user_id"] = uid
        individual_map[uid]["user_name"] = signal["user_name"]
        individual_map[uid]["signals"].append(signal)
        if severity_rank[signal["severity"]] > severity_rank[individual_map[uid]["severity"]]:
            individual_map[uid]["severity"] = signal["severity"]

    # Sort individuals by severity then signal count
    individuals = sorted(
        individual_map.values(),
        key=lambda x: (severity_rank[x["severity"]], len(x["signals"])),
        reverse=True,
    )

    return {
        "individual_issues": individuals,
        "systemic_issues": systemic,
        "summary": {
            "total_at_risk_learners": len([i for i in individuals if i["severity"] == "high"]),
            "total_struggling_learners": len([i for i in individuals if i["severity"] == "medium"]),
            "total_systemic_issues": len(systemic),
            "signal_breakdown": {
                "repetition": len(repetition),
                "time_on_task": len(time_on_task),
                "struggle_language": len(struggle_language),
                "escalation_ladder": len(escalation),
                "no_submission": len(no_submission),
            },
        },
    }
