"""
Demo Data Seed Script — SensAI Intelligence Layer (Rich Dataset)

Creates ~150+ data samples across all intelligence features:
  - 1 org, 2 cohorts, 2 courses, 5 tasks, 5 questions
  - 20 learners + 2 mentors with varied struggle profiles
  - 150+ chat messages with all 5 signal types
  - Task completions with velocity patterns
  - Friction computations + bandit arm history (all 16 arms)
  - Interventions with reward outcomes
  - Rubric scorecards with heatmap data

Usage:
    cd backend
    uv run python -m api.seed_demo_data
"""

import asyncio
import sys
import os
import uuid
import random
import math

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.utils.db import get_new_db_connection
from api.db import init_db

# ---------------------------------------------------------------------------
# Static SQL — schema fixtures
# ---------------------------------------------------------------------------

STATIC_SQL = """
-- ORG
INSERT OR IGNORE INTO organizations (id, slug, name) VALUES
  (99, 'demo-org', 'Demo Academy');

-- USERS: 2 mentors + 20 learners (ids 1-22)
INSERT OR IGNORE INTO users (id, email, first_name, last_name) VALUES
  (1,  'mentor1@demo.com', 'Alex',    'Mentor'),
  (2,  'mentor2@demo.com', 'Sara',    'Coach'),
  (3,  'alice@demo.com',   'Alice',   'Chen'),
  (4,  'bob@demo.com',     'Bob',     'Kumar'),
  (5,  'carol@demo.com',   'Carol',   'Osei'),
  (6,  'david@demo.com',   'David',   'Park'),
  (7,  'emma@demo.com',    'Emma',    'Nwosu'),
  (8,  'frank@demo.com',   'Frank',   'Diaz'),
  (9,  'grace@demo.com',   'Grace',   'Lim'),
  (10, 'henry@demo.com',   'Henry',   'Muller'),
  (11, 'ivan@demo.com',    'Ivan',    'Petrov'),
  (12, 'julia@demo.com',   'Julia',   'Santos'),
  (13, 'kai@demo.com',     'Kai',     'Tanaka'),
  (14, 'lena@demo.com',    'Lena',    'Vogel'),
  (15, 'marco@demo.com',   'Marco',   'Rossi'),
  (16, 'nina@demo.com',    'Nina',    'Patel'),
  (17, 'omar@demo.com',    'Omar',    'Hassan'),
  (18, 'priya@demo.com',   'Priya',   'Sharma'),
  (19, 'quinn@demo.com',   'Quinn',   'Brooks'),
  (20, 'ravi@demo.com',    'Ravi',    'Gupta'),
  (21, 'sofia@demo.com',   'Sofia',   'Moreau'),
  (22, 'tom@demo.com',     'Tom',     'Walsh');

INSERT OR IGNORE INTO user_organizations (user_id, org_id, role) VALUES
  (1, 99, 'owner'), (2, 99, 'admin');

-- COHORTS
INSERT OR IGNORE INTO cohorts (id, name, org_id) VALUES
  (10, 'Python Bootcamp — Cohort 1', 99),
  (11, 'Python Bootcamp — Cohort 2', 99);

INSERT OR IGNORE INTO user_cohorts (user_id, cohort_id, role) VALUES
  (1,  10, 'mentor'), (2,  10, 'mentor'),
  (3,  10, 'learner'), (4,  10, 'learner'), (5,  10, 'learner'),
  (6,  10, 'learner'), (7,  10, 'learner'), (8,  10, 'learner'),
  (9,  10, 'learner'), (10, 10, 'learner'), (11, 10, 'learner'),
  (12, 10, 'learner'), (13, 10, 'learner'), (14, 10, 'learner'),
  (2,  11, 'mentor'),
  (15, 11, 'learner'), (16, 11, 'learner'), (17, 11, 'learner'),
  (18, 11, 'learner'), (19, 11, 'learner'), (20, 11, 'learner'),
  (21, 11, 'learner'), (22, 11, 'learner');

-- COURSES
INSERT OR IGNORE INTO courses (id, org_id, name) VALUES
  (20, 99, 'Python Fundamentals'),
  (21, 99, 'Data Structures in Python');

INSERT OR IGNORE INTO course_cohorts (course_id, cohort_id) VALUES
  (20, 10), (21, 11);

-- MILESTONES
INSERT OR IGNORE INTO milestones (id, org_id, name, color) VALUES
  (30, 99, 'Module 1: Basics',       '#4CAF50'),
  (31, 99, 'Module 2: Functions',    '#2196F3'),
  (32, 99, 'Module 3: OOP',          '#FF5722'),
  (33, 99, 'Module 4: Lists',        '#9C27B0'),
  (34, 99, 'Module 5: Dicts & Sets', '#FF9800');

INSERT OR IGNORE INTO course_milestones (course_id, milestone_id, ordering) VALUES
  (20, 30, 1), (20, 31, 2), (20, 32, 3),
  (21, 33, 1), (21, 34, 2);

-- TASKS (5 total)
INSERT OR IGNORE INTO tasks (id, org_id, type, title, status) VALUES
  (40, 99, 'learning_material', 'Intro to Python Variables',    'published'),
  (41, 99, 'quiz',              'Functions & Scope Quiz',        'published'),
  (42, 99, 'assignment',        'OOP: Build a Bank Account',     'published'),
  (43, 99, 'quiz',              'Lists & Iteration Quiz',        'published'),
  (44, 99, 'quiz',              'Dicts & Sets Quiz',             'published');

INSERT OR IGNORE INTO course_tasks (task_id, course_id, ordering, milestone_id) VALUES
  (40, 20, 1, 30), (41, 20, 2, 31), (42, 20, 3, 32),
  (43, 21, 1, 33), (44, 21, 2, 34);

-- QUESTIONS (5 questions across tasks 41, 43, 44)
INSERT OR IGNORE INTO questions (id, task_id, type, blocks, answer, input_type, response_type, position, is_feedback_shown, title) VALUES
  (50, 41, 'subjective', '[]', '[]', 'text', 'chat', 1, 1, 'Explain variable scope in Python'),
  (51, 41, 'subjective', '[]', '[]', 'text', 'chat', 2, 1, 'What is a closure?'),
  (52, 41, 'subjective', '[]', '[]', 'code', 'chat', 3, 1, 'Write a decorator function'),
  (53, 43, 'subjective', '[]', '[]', 'code', 'chat', 1, 1, 'Reverse a list without slicing'),
  (54, 44, 'subjective', '[]', '[]', 'code', 'chat', 1, 1, 'Count word frequency with a dict');

-- SCORECARDS
INSERT OR IGNORE INTO scorecards (id, org_id, title, criteria, status) VALUES
  (60, 99, 'Python Quiz Rubric',
   '[{"name":"Correctness","min_score":0,"max_score":5,"pass_score":3},{"name":"Clarity","min_score":0,"max_score":5,"pass_score":3}]',
   'published'),
  (61, 99, 'DS Quiz Rubric',
   '[{"name":"Correctness","min_score":0,"max_score":5,"pass_score":3},{"name":"Efficiency","min_score":0,"max_score":5,"pass_score":3}]',
   'published');

INSERT OR IGNORE INTO question_scorecards (question_id, scorecard_id) VALUES
  (50, 60), (51, 60), (52, 60), (53, 61), (54, 61);
"""

# ---------------------------------------------------------------------------
# Learner profiles — drives realistic data generation
# ---------------------------------------------------------------------------

# (user_id, cohort_id, tasks_completed_ids, struggle_question_ids, profile)
# profiles: 'high', 'medium', 'low', 'dropout', 'struggling'
LEARNER_PROFILES = [
    # Cohort 10 learners
    (3,  10, [40, 41, 42], [],     'high'),
    (4,  10, [40, 41],     [50],   'medium'),
    (5,  10, [40],         [50, 51], 'struggling'),
    (6,  10, [40, 41, 42], [],     'high'),
    (7,  10, [],           [51, 52], 'dropout'),
    (8,  10, [40],         [52],   'struggling'),
    (9,  10, [40, 41],     [50],   'medium'),
    (10, 10, [40, 41, 42], [],     'high'),
    (11, 10, [],           [50, 51, 52], 'dropout'),
    (12, 10, [40],         [51],   'struggling'),
    (13, 10, [40, 41],     [52],   'medium'),
    (14, 10, [40, 41, 42], [],     'high'),
    # Cohort 11 learners
    (15, 11, [43, 44],     [],     'high'),
    (16, 11, [43],         [53],   'medium'),
    (17, 11, [],           [53, 54], 'dropout'),
    (18, 11, [43, 44],     [],     'high'),
    (19, 11, [43],         [54],   'struggling'),
    (20, 11, [],           [53],   'struggling'),
    (21, 11, [43, 44],     [],     'high'),
    (22, 11, [43],         [53, 54], 'medium'),
]

# Struggle message templates per signal type
STRUGGLE_MESSAGES = [
    "i dont understand what this means",
    "im confused, can you explain again?",
    "still dont get it, this doesnt make sense",
    "why does this work differently?",
    "im lost, not sure why this is different",
    "can you explain more simply?",
    "im still confused about when to use this",
    "this doesnt work in my code",
    "not sure why this isnt working",
    "what does this mean exactly?",
    "i dont understand, can you help?",
    "this doesnt make sense to me",
    "still dont get it after trying again",
    "im not sure how to approach this",
]

NEUTRAL_MESSAGES = [
    "Can you explain this concept?",
    "What is the difference between these two?",
    "How do I use this in practice?",
    "Can you show me an example?",
    "What happens if I do it this way?",
    "Is this the right approach?",
    "Can you clarify this part?",
    "What does this error mean?",
]

ASSISTANT_RESPONSES = [
    "Great question! Let me explain...",
    "Sure, here is how it works...",
    "Think of it like this...",
    "Here is a code example...",
    "The key concept here is...",
    "Let me break this down step by step...",
    "Here is a hint to guide you...",
    "Consider this approach instead...",
]

BANDIT_ARM_NAMES = [
    "balanced", "llm_dominant", "llm_heavy", "chat_heavy", "attempt_heavy",
    "score_heavy", "time_sensitive", "no_time", "no_llm", "llm_chat",
    "llm_attempt", "llm_score", "outcome_focused", "effort_focused",
    "pure_llm", "equal",
]


def days_ago(n, extra_minutes=0):
    return f"datetime('now', '-{n} days', '+{extra_minutes} minutes')"


async def seed_dynamic(conn):
    """Generate all dynamic data: completions, chat, friction, bandit, interventions."""
    cursor = await conn.cursor()
    rng = random.Random(42)  # deterministic

    # -----------------------------------------------------------------------
    # 1. Task completions
    # -----------------------------------------------------------------------
    for uid, cohort_id, completed_tasks, _, profile in LEARNER_PROFILES:
        base_day = rng.randint(8, 20)
        for i, task_id in enumerate(completed_tasks):
            day = base_day - i * rng.randint(1, 3)
            await cursor.execute(
                "INSERT OR IGNORE INTO task_completions (user_id, task_id, created_at) VALUES (?, ?, datetime('now', ?))",
                (uid, task_id, f"-{day} days"),
            )
            # question completions for quiz tasks
            q_map = {41: [50, 51, 52], 43: [53], 44: [54]}
            for qid in q_map.get(task_id, []):
                await cursor.execute(
                    "INSERT OR IGNORE INTO task_completions (user_id, question_id, created_at) VALUES (?, ?, datetime('now', ?))",
                    (uid, qid, f"-{day} days"),
                )

    # -----------------------------------------------------------------------
    # 2. Chat history — 150+ messages with all signal types
    # -----------------------------------------------------------------------
    chat_rows = []

    for uid, cohort_id, completed_tasks, struggle_qids, profile in LEARNER_PROFILES:
        base_day = rng.randint(3, 15)

        # Determine message count by profile
        msg_counts = {
            'high': (2, 4),
            'medium': (4, 7),
            'struggling': (7, 12),
            'dropout': (5, 9),
        }
        lo, hi = msg_counts.get(profile, (3, 6))

        for qid in struggle_qids:
            n_turns = rng.randint(lo, hi)
            day = base_day - rng.randint(0, 3)
            minute = 0

            for turn in range(n_turns):
                minute += rng.randint(2, 8)
                # User message — mix struggle + neutral
                use_struggle = profile in ('struggling', 'dropout') or (profile == 'medium' and turn < 3)
                content = rng.choice(STRUGGLE_MESSAGES if use_struggle else NEUTRAL_MESSAGES)
                chat_rows.append((uid, qid, 'user', content, None, day, minute))

                minute += rng.randint(1, 3)
                # Assistant response — escalate to code on later turns
                resp_type = 'code' if turn >= n_turns - 1 and profile in ('struggling', 'dropout') else 'text'
                a_content = rng.choice(ASSISTANT_RESPONSES)
                chat_rows.append((uid, qid, 'assistant', a_content, resp_type, day, minute))

        # High performers still ask a couple of questions
        if profile == 'high' and completed_tasks:
            qid = rng.choice([50, 51, 52, 53, 54])
            for turn in range(rng.randint(1, 3)):
                minute = turn * 5
                chat_rows.append((uid, qid, 'user', rng.choice(NEUTRAL_MESSAGES), None, base_day, minute))
                chat_rows.append((uid, qid, 'assistant', rng.choice(ASSISTANT_RESPONSES), 'text', base_day, minute + 2))

    for uid, qid, role, content, resp_type, day, minute in chat_rows:
        await cursor.execute(
            """INSERT OR IGNORE INTO chat_history
               (user_id, question_id, role, content, response_type, created_at)
               VALUES (?, ?, ?, ?, ?, datetime('now', ?, ?))""",
            (uid, qid, role, content, resp_type, f"-{day} days", f"+{minute} minutes"),
        )

    # -----------------------------------------------------------------------
    # 3. Bandit weight history — all 16 arms with varied pull counts + rewards
    # -----------------------------------------------------------------------
    # Simulate convergence: chat_heavy and balanced get higher rewards
    arm_reward_bias = {
        "balanced": 0.85, "chat_heavy": 0.92, "llm_chat": 0.78,
        "attempt_heavy": 0.88, "outcome_focused": 0.72, "score_heavy": 0.65,
        "llm_dominant": 0.55, "llm_heavy": 0.60, "no_llm": 0.58,
        "time_sensitive": 0.45, "time_heavy": 0.42, "no_time": 0.62,
        "llm_attempt": 0.70, "llm_score": 0.68, "pure_llm": 0.50,
        "equal": 0.55, "effort_focused": 0.75,
    }

    for cohort_id in [10, 11]:
        total_pulls = 0
        arm_states = {}

        for arm_id in BANDIT_ARM_NAMES:
            pulls = rng.randint(1, 8)
            bias = arm_reward_bias.get(arm_id, 0.6)
            rewards = [rng.gauss(bias, 0.15) for _ in range(pulls)]
            avg_reward = sum(rewards) / len(rewards)
            total_pulls += pulls
            arm_states[arm_id] = (pulls, avg_reward)

        for arm_id, (pulls, avg_reward) in arm_states.items():
            if total_pulls > 0 and pulls > 0:
                ucb = avg_reward + 1.41 * math.sqrt(math.log(total_pulls) / pulls)
            else:
                ucb = float('inf')

            # Delete existing row for this cohort+arm before inserting fresh data
            await cursor.execute(
                "DELETE FROM bandit_weight_history WHERE cohort_id = ? AND arm_id = ?",
                (cohort_id, arm_id),
            )
            row_id = str(uuid.uuid4())
            await cursor.execute(
                """INSERT INTO bandit_weight_history
                   (id, cohort_id, arm_id, pull_count, avg_reward, ucb_score)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (row_id, cohort_id, arm_id, pulls, round(avg_reward, 4), round(ucb, 4)),
            )

    # -----------------------------------------------------------------------
    # 4. Friction computations — one per struggling learner per task
    # -----------------------------------------------------------------------
    friction_ids = {}  # (uid, task_id) -> fc_id

    for uid, cohort_id, completed_tasks, struggle_qids, profile in LEARNER_PROFILES:
        friction_by_profile = {
            'high': (0.05, 0.25),
            'medium': (0.25, 0.50),
            'struggling': (0.55, 0.80),
            'dropout': (0.65, 0.90),
        }
        lo, hi = friction_by_profile.get(profile, (0.3, 0.6))

        # Pick the most-struggled task
        q_to_task = {50: 41, 51: 41, 52: 41, 53: 43, 54: 44}
        task_ids_for_learner = list({q_to_task[q] for q in struggle_qids}) or [40]

        for task_id in task_ids_for_learner:
            friction = round(rng.uniform(lo, hi), 3)
            arm_id = rng.choice(BANDIT_ARM_NAMES)
            signals = {
                "chat": round(rng.uniform(0.2, 0.9), 2),
                "attempts": round(rng.uniform(0.1, 0.7), 2),
                "score": round(rng.uniform(0.2, 0.8), 2),
                "time": round(rng.uniform(0.1, 0.6), 2),
                "llm": round(rng.uniform(0.1, 0.9), 2),
            }
            import json
            fc_id = str(uuid.uuid4())
            friction_ids[(uid, task_id)] = (fc_id, arm_id, cohort_id)
            await cursor.execute(
                """INSERT OR IGNORE INTO friction_computations
                   (id, user_id, cohort_id, task_id, arm_id, friction_score, signals_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (fc_id, uid, cohort_id, task_id, arm_id, friction, json.dumps(signals)),
            )

    # -----------------------------------------------------------------------
    # 5. Interventions — for struggling/dropout learners
    # -----------------------------------------------------------------------
    for uid, cohort_id, _, struggle_qids, profile in LEARNER_PROFILES:
        if profile not in ('struggling', 'dropout'):
            continue

        q_to_task = {50: 41, 51: 41, 52: 41, 53: 43, 54: 44}
        for qid in struggle_qids[:1]:  # one intervention per learner
            task_id = q_to_task.get(qid, 41)
            key = (uid, task_id)
            if key not in friction_ids:
                continue
            fc_id, arm_id, _ = friction_ids[key]

            # Simulate outcome: struggling learners have ~60% positive response
            reward_status = rng.choice(['positive', 'positive', 'positive', 'negative', 'neutral'])
            status = 'sent'
            mentor_id = 1 if cohort_id == 10 else 2

            iv_id = str(uuid.uuid4())
            await cursor.execute(
                """INSERT OR IGNORE INTO interventions
                   (id, user_id, mentor_id, task_id, friction_computation_id,
                    message_sent, status, reward_status)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (iv_id, uid, mentor_id, task_id, fc_id,
                 f"Hey, noticed you've been working hard on task {task_id}. Want to chat?",
                 status, reward_status),
            )

    await conn.commit()
    print(f"  ✓ {len(chat_rows)} chat messages")
    print(f"  ✓ {len(friction_ids)} friction computations")
    print(f"  ✓ {len(BANDIT_ARM_NAMES) * 2} bandit arm records (2 cohorts × 16 arms)")


async def seed():
    await init_db()

    async with get_new_db_connection() as conn:
        try:
            # Static fixtures
            await conn.executescript(STATIC_SQL)
            await conn.commit()
            print("✓ Static fixtures inserted")

            # Dynamic rich data
            await seed_dynamic(conn)

            print("\n✅ Rich demo data seeded successfully (~150+ samples)")
            print("\nReady to test:")
            print("  GET  /intelligence/mentor/10/briefing")
            print("  GET  /intelligence/creator/20/signals")
            print("  GET  /intelligence/cohort/10/signals")
            print("  GET  /intelligence/cohort/10/insights?persona=mentor")
            print("  GET  /intelligence/learner/5/preread?cohort_id=10")
            print("  GET  /intelligence/learner/5/velocity?cohort_id=10")
            print("  GET  /intelligence/task/41/classify?cohort_id=10")
            print("  GET  /intelligence/bandit/10/state")
            print("  GET  /intelligence/bandit/10/learner-scores")
            print("  POST /intelligence/actions/trigger  {learner_id:5, task_id:41, cohort_id:10}")
            print("  POST /intelligence/bandit/10/process-rewards  {demo_mode:false}")
        except Exception as e:
            print(f"❌ Seed failed: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(seed())
