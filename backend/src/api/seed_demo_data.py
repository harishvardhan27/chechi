"""
Demo Data Seed Script — SensAI Intelligence Layer

Inserts realistic dummy data to demo all intelligence endpoints.

Usage:
    cd sensai-backend-hackathon/src
    python -m api.seed_demo_data

Creates:
  - 1 org, 1 cohort, 1 course, 3 tasks (quiz, assignment, learning material)
  - 8 learners + 1 mentor
  - Chat history with struggle signals (repetition, struggle language, escalation)
  - Task completions with velocity patterns (some learners dropping off)
  - question_scorecards entries
"""

import asyncio
import sys
import os

# Ensure src/ is on the path when running as a script
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.utils.db import get_new_db_connection
from api.db import init_db


SEED_SQL = """
-- ============================================================
-- ORGANIZATION
-- ============================================================
INSERT OR IGNORE INTO organizations (id, slug, name) VALUES
  (99, 'demo-org', 'Demo Academy');

INSERT OR IGNORE INTO user_organizations (user_id, org_id, role) VALUES
  (1, 99, 'owner');

-- ============================================================
-- USERS (8 learners + 1 mentor)
-- ============================================================
INSERT OR IGNORE INTO users (id, email, first_name, last_name) VALUES
  (1,  'mentor@demo.com',  'Alex',    'Mentor'),
  (2,  'alice@demo.com',   'Alice',   'Chen'),
  (3,  'bob@demo.com',     'Bob',     'Kumar'),
  (4,  'carol@demo.com',   'Carol',   'Osei'),
  (5,  'david@demo.com',   'David',   'Park'),
  (6,  'emma@demo.com',    'Emma',    'Nwosu'),
  (7,  'frank@demo.com',   'Frank',   'Diaz'),
  (8,  'grace@demo.com',   'Grace',   'Lim'),
  (9,  'henry@demo.com',   'Henry',   'Müller');

-- ============================================================
-- COHORT
-- ============================================================
INSERT OR IGNORE INTO cohorts (id, name, org_id) VALUES
  (10, 'Python Bootcamp — Cohort 1', 99);

INSERT OR IGNORE INTO user_cohorts (user_id, cohort_id, role) VALUES
  (1, 10, 'mentor'),
  (2, 10, 'learner'),
  (3, 10, 'learner'),
  (4, 10, 'learner'),
  (5, 10, 'learner'),
  (6, 10, 'learner'),
  (7, 10, 'learner'),
  (8, 10, 'learner'),
  (9, 10, 'learner');

-- ============================================================
-- COURSE + MILESTONES
-- ============================================================
INSERT OR IGNORE INTO courses (id, org_id, name) VALUES
  (20, 99, 'Python Fundamentals');

INSERT OR IGNORE INTO course_cohorts (course_id, cohort_id) VALUES
  (20, 10);

INSERT OR IGNORE INTO milestones (id, org_id, name, color) VALUES
  (30, 99, 'Module 1: Basics',    '#4CAF50'),
  (31, 99, 'Module 2: Functions', '#2196F3'),
  (32, 99, 'Module 3: OOP',       '#FF5722');

INSERT OR IGNORE INTO course_milestones (course_id, milestone_id, ordering) VALUES
  (20, 30, 1), (20, 31, 2), (20, 32, 3);

-- ============================================================
-- TASKS
-- ============================================================
INSERT OR IGNORE INTO tasks (id, org_id, type, title, status) VALUES
  (40, 99, 'learning_material', 'Intro to Python Variables',    'published'),
  (41, 99, 'quiz',              'Functions & Scope Quiz',        'published'),
  (42, 99, 'assignment',        'OOP: Build a Bank Account',     'published');

INSERT OR IGNORE INTO course_tasks (task_id, course_id, ordering, milestone_id) VALUES
  (40, 20, 1, 30),
  (41, 20, 2, 31),
  (42, 20, 3, 32);

-- ============================================================
-- QUESTIONS (for quiz task 41)
-- ============================================================
INSERT OR IGNORE INTO questions (id, task_id, type, blocks, answer, input_type, response_type, position, is_feedback_shown, title) VALUES
  (50, 41, 'subjective', '[]', '[]', 'text', 'chat', 1, 1, 'Explain variable scope in Python'),
  (51, 41, 'subjective', '[]', '[]', 'text', 'chat', 2, 1, 'What is a closure?'),
  (52, 41, 'subjective', '[]', '[]', 'code', 'chat', 3, 1, 'Write a decorator function');

-- ============================================================
-- TASK COMPLETIONS (velocity patterns)
-- ============================================================
-- Alice: completed all 3 tasks (high performer)
INSERT OR IGNORE INTO task_completions (user_id, task_id, created_at) VALUES
  (2, 40, datetime('now', '-14 days')),
  (2, 41, datetime('now', '-10 days')),
  (2, 42, datetime('now', '-6 days'));

INSERT OR IGNORE INTO task_completions (user_id, question_id, created_at) VALUES
  (2, 50, datetime('now', '-10 days')),
  (2, 51, datetime('now', '-10 days')),
  (2, 52, datetime('now', '-10 days'));

-- Bob: completed task 40 only, then dropped off (velocity risk)
INSERT OR IGNORE INTO task_completions (user_id, task_id, created_at) VALUES
  (3, 40, datetime('now', '-12 days'));

-- Carol: completed tasks 40 + 41 (partial)
INSERT OR IGNORE INTO task_completions (user_id, task_id, created_at) VALUES
  (4, 40, datetime('now', '-13 days')),
  (4, 41, datetime('now', '-11 days'));

INSERT OR IGNORE INTO task_completions (user_id, question_id, created_at) VALUES
  (4, 50, datetime('now', '-11 days')),
  (4, 51, datetime('now', '-11 days'));

-- David: completed task 40 only
INSERT OR IGNORE INTO task_completions (user_id, task_id, created_at) VALUES
  (5, 40, datetime('now', '-10 days'));

-- Emma: no completions (at-risk)
-- Frank: completed task 40 only
INSERT OR IGNORE INTO task_completions (user_id, task_id, created_at) VALUES
  (7, 40, datetime('now', '-8 days'));

-- Grace: completed all 3
INSERT OR IGNORE INTO task_completions (user_id, task_id, created_at) VALUES
  (8, 40, datetime('now', '-15 days')),
  (8, 41, datetime('now', '-12 days')),
  (8, 42, datetime('now', '-9 days'));

INSERT OR IGNORE INTO task_completions (user_id, question_id, created_at) VALUES
  (8, 50, datetime('now', '-12 days')),
  (8, 51, datetime('now', '-12 days')),
  (8, 52, datetime('now', '-12 days'));

-- Henry: completed task 40 only
INSERT OR IGNORE INTO task_completions (user_id, task_id, created_at) VALUES
  (9, 40, datetime('now', '-7 days'));

-- ============================================================
-- CHAT HISTORY — struggle signals
-- ============================================================

-- Bob: HIGH repetition on question 50 (8 turns, same day) + struggle language
INSERT OR IGNORE INTO chat_history (user_id, question_id, role, content, created_at) VALUES
  (3, 50, 'user', 'I dont understand what scope means', datetime('now', '-9 days', '+1 hour')),
  (3, 50, 'assistant', 'Scope refers to...', datetime('now', '-9 days', '+1 hour', '+2 minutes')),
  (3, 50, 'user', 'im confused, can you explain again?', datetime('now', '-9 days', '+1 hour', '+5 minutes')),
  (3, 50, 'assistant', 'Sure, let me try differently...', datetime('now', '-9 days', '+1 hour', '+7 minutes')),
  (3, 50, 'user', 'still dont get it, this doesnt make sense', datetime('now', '-9 days', '+1 hour', '+12 minutes')),
  (3, 50, 'assistant', 'Think of it like...', datetime('now', '-9 days', '+1 hour', '+14 minutes')),
  (3, 50, 'user', 'why does this work differently inside a function?', datetime('now', '-9 days', '+1 hour', '+20 minutes')),
  (3, 50, 'assistant', 'Because Python uses LEGB rule...', datetime('now', '-9 days', '+1 hour', '+22 minutes')),
  (3, 50, 'user', 'im lost, not sure why this is different', datetime('now', '-9 days', '+1 hour', '+30 minutes')),
  (3, 50, 'assistant', 'Here is a code example...', datetime('now', '-9 days', '+1 hour', '+32 minutes')),
  (3, 50, 'user', 'ok i think i get it now but still not sure', datetime('now', '-9 days', '+1 hour', '+45 minutes')),
  (3, 50, 'assistant', 'Let me show you the full solution...', datetime('now', '-9 days', '+1 hour', '+47 minutes'));

-- Emma: struggle language + no submission on question 51
INSERT OR IGNORE INTO chat_history (user_id, question_id, role, content, created_at) VALUES
  (6, 51, 'user', 'what does this mean exactly?', datetime('now', '-8 days')),
  (6, 51, 'assistant', 'A closure is...', datetime('now', '-8 days', '+2 minutes')),
  (6, 51, 'user', 'i dont understand, can you explain more simply?', datetime('now', '-8 days', '+5 minutes')),
  (6, 51, 'assistant', 'Think of it as...', datetime('now', '-8 days', '+7 minutes')),
  (6, 51, 'user', 'im still confused about when to use this', datetime('now', '-8 days', '+15 minutes')),
  (6, 51, 'assistant', 'You use closures when...', datetime('now', '-8 days', '+17 minutes')),
  (6, 51, 'user', 'this doesnt work in my code', datetime('now', '-8 days', '+25 minutes')),
  (6, 51, 'assistant', 'Here is the corrected version...', datetime('now', '-8 days', '+27 minutes'));

-- David: escalation ladder on question 52 (text → code escalation)
INSERT OR IGNORE INTO chat_history (user_id, question_id, role, content, response_type, created_at) VALUES
  (5, 52, 'user', 'How do I write a decorator?', NULL, datetime('now', '-7 days')),
  (5, 52, 'assistant', 'A decorator is a function that wraps another function...', 'text', datetime('now', '-7 days', '+3 minutes')),
  (5, 52, 'user', 'I still dont understand, can you show me?', NULL, datetime('now', '-7 days', '+8 minutes')),
  (5, 52, 'assistant', 'Here is a hint: use @functools.wraps...', 'text', datetime('now', '-7 days', '+10 minutes')),
  (5, 52, 'user', 'not sure why this isnt working', NULL, datetime('now', '-7 days', '+20 minutes')),
  (5, 52, 'assistant', 'def my_decorator(func):\n    def wrapper(*args):\n        return func(*args)\n    return wrapper', 'code', datetime('now', '-7 days', '+22 minutes'));

-- Frank: moderate chat on question 50 (medium friction)
INSERT OR IGNORE INTO chat_history (user_id, question_id, role, content, created_at) VALUES
  (7, 50, 'user', 'Can you explain local vs global scope?', datetime('now', '-6 days')),
  (7, 50, 'assistant', 'Local scope is...', datetime('now', '-6 days', '+2 minutes')),
  (7, 50, 'user', 'What about nested functions?', datetime('now', '-6 days', '+5 minutes')),
  (7, 50, 'assistant', 'In nested functions...', datetime('now', '-6 days', '+7 minutes')),
  (7, 50, 'user', 'I see, but what does this mean for closures?', datetime('now', '-6 days', '+12 minutes')),
  (7, 50, 'assistant', 'Closures capture the enclosing scope...', datetime('now', '-6 days', '+14 minutes'));

-- Henry: struggle on question 52 (no submission)
INSERT OR IGNORE INTO chat_history (user_id, question_id, role, content, created_at) VALUES
  (9, 52, 'user', 'im confused about how decorators work', datetime('now', '-5 days')),
  (9, 52, 'assistant', 'Decorators are...', datetime('now', '-5 days', '+2 minutes')),
  (9, 52, 'user', 'still dont get it, can you explain again?', datetime('now', '-5 days', '+6 minutes')),
  (9, 52, 'assistant', 'Let me use an analogy...', datetime('now', '-5 days', '+8 minutes')),
  (9, 52, 'user', 'this doesnt make sense to me', datetime('now', '-5 days', '+15 minutes')),
  (9, 52, 'assistant', 'Here is a simpler example...', datetime('now', '-5 days', '+17 minutes'));

-- ============================================================
-- SCORECARDS (for rubric heatmap demo)
-- ============================================================
INSERT OR IGNORE INTO scorecards (id, org_id, title, criteria, status) VALUES
  (60, 99, 'Python Quiz Rubric', '[{"name":"Correctness","min_score":0,"max_score":5,"pass_score":3},{"name":"Clarity","min_score":0,"max_score":5,"pass_score":3}]', 'published');

INSERT OR IGNORE INTO question_scorecards (question_id, scorecard_id) VALUES
  (50, 60), (51, 60), (52, 60);
"""


async def seed():
    await init_db()

    async with get_new_db_connection() as conn:
        try:
            await conn.executescript(SEED_SQL)
            await conn.commit()
            print("✅ Demo data seeded successfully.")
            print("\nReady to test:")
            print("  GET  /intelligence/mentor/10/briefing")
            print("  GET  /intelligence/creator/20/signals")
            print("  GET  /intelligence/cohort/10/signals")
            print("  GET  /intelligence/cohort/10/insights?persona=mentor")
            print("  GET  /intelligence/learner/3/preread?cohort_id=10")
            print("  GET  /intelligence/learner/3/velocity?cohort_id=10")
            print("  GET  /intelligence/task/41/classify?cohort_id=10")
            print("  POST /intelligence/actions/trigger  {learner_id:3, task_id:50, cohort_id:10}")
        except Exception as e:
            print(f"❌ Seed failed: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(seed())
