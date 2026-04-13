# SensAI LMS: Complete Feature Inventory

This document is an exhaustive, granular inventory of **every single feature** built into the SensAI Learning Management System, bridging the backend architecture, frontend interfaces, integrations, and the autonomous Agentic Engine.

---

## 1. Core Architecture & Multi-Tenancy
The foundational system designed to support schools, cohorts, and varying user roles securely.
- **Organization Management (`org`)**: Create and manage distinct "Schools" or organizations.
- **Role-Based Access Control (RBAC)**: Secure routing for `admin`, `creator`, `mentor`, and `learner` roles.
- **Cohort Grouping (`cohort`)**: Group learners into cohorts with specific timelines, metrics, and assigned mentors.
- **Batch Processing (`batch`)**: Manage automated batch operations across entire cohorts.

## 2. Curriculum & Content Creation (Creator Studio)
A powerful suite of tools for designing complex, multi-modal learning curriculums.
- **Course Builder (`course`)**: Create overarching courses, milestones, and modules.
- **Multi-Modal Task Editors**:
  - `AssignmentEditor`: Rich text inputs for long-form submissions.
  - `QuizEditor`: Dynamic multiple-choice and short-answer evaluations.
  - `BlockNoteEditor`: Notion-style block editor for designing static reading materials.
  - `CodeEditorView`: Fully integrated in-browser IDE for coding assignments.
- **AI Content Generation (`ai`)**: 
  - `GenerateWithAIDialog`: One-click AI generation for entire course structures, rubrics, and reading materials based on prompt outlines.
- **Drip Publishing (`DripPublishingConfig`)**: Schedule tasks and modules to unlock on specific dates.
- **File Uploads (`file`)**: Secure media handling for PDFs, images, and submission attachments.

## 3. Evaluation & Feedback (Mentorship Suite)
Data-driven pathways for evaluating student success and administering grades.
- **Scorecard Manager (`ScorecardManager.tsx`)**: Build custom grading rubrics across specific competencies.
- **Live Competency Evaluation**: Mentors can grade learners directly against predefined evaluation criteria.
- **Highly Value Actions (`hva`)**: Track uniquely valuable learner events for specialized grading.
- **Learner Activity Dashboards**: See real-time drops in `LearningStreak.tsx` and track the `TopPerformers.tsx` within a specific cohort.

## 4. The Learner Experience (LXP)
The unified interface where students consume content, practice skills, and interact with the AI Tutor.
- **Interactive Chat Tutor (`chat`)**: Context-aware LLM chatbot (`ChatView.tsx`) attached to every single task that answers questions dynamically without giving away the final answer.
- **Unified Task Views**: Clean, specialized layouts for consuming material (`LearnerAssignmentView`, `LearnerQuizView`).
- **Personal Scorecards (`LearnerScorecard.tsx`)**: Transparent visibility into their own rubric evaluations and grades.
- **Achievement Sounds**: Dopamine-driven UI micro-interactions (e.g., `SuccessSound.tsx`, `ModuleCompletionSound.tsx`).

## 5. Third-Party Integrations
- **Notion Sync (`NotionIntegration.tsx`)**: Seamlessly connect Notion workspaces to pull existing living documents and automatically convert them into SensAI learning materials.
- **Sentry Live Debugging**: Real-time error tracking and platform stability monitoring.

---

## 6. The Autonomous Agentic Engine (Intelligence Layer)
The predictive, self-healing RL copilot that sits invisibly over the entire platform.

### A. Core Friction Detection (`signal_engine.py`)
- **Multi-Dimensional Analysis**: Calculates learner confusion scores based on Chat Volume, Retry Attempts, Time-on-Task, Rubric Scores, and LLM text-sentiment.
- **Dynamic Baseline Thresholds**: Queries the exact cohort-median for every single task via SQL to ensure inherently complex tasks aren't constantly flagged as false positives.
- **Threshold TTL Caching**: High-performance memoization of database aggregations to protect the cluster during live scale.
- **Systemic vs. Individual Classification**: Flags issues as *Systemic* (curriculum flaw) if >35% of the cohort struggles, or *Individual* if localized.
- **Velocity Risk Detection**: Flags learners whose task completions-per-day drops 50% below their historical baseline.

### B. Reinforcement Learning Core (`bandit.py`, `agents.py`)
- **UCB1 Multi-Armed Bandit**: Deploys 16 mathematical variations of "friction" weighting (e.g., Chat-Heavy, Balanced).
- **Thompson Sampling**: Autonomously adjusts to find the most accurate weighting by balancing exploration and exploitation.
- **Closed Action Feedback Loops**: When operators approve AI actions, the model locates the specific generating `arm_id` and fires a `+1.0` simulation reward, allowing the model to self-train live.

### C. The Frontend Copilots
- **Mentor Copilot (`MentorActionFeed.tsx`)**: Iterates through individual learners, drafting highly contextual, empathetic Slack check-in messages detailing exactly *why* a student is stuck on a specific code block.
- **Creator Copilot (`CreatorActionFeed.tsx`)**: Diagnoses Systemic failures across the cohort and generates "Hot-Swappable" curriculum diffs (e.g., injecting an FAQ) to fix poorly worded questions instantly.
- **Operator Command Center (`OperatorDashboard.tsx`)**: Telemetry map showing system accuracy, resolution timelines, and featuring the `BanditArmChart.tsx` — a live Radar/Bar visualization of the RL Agent's internal evolution state.
- **Learner Auto-Nudge (`IntelligentHintModal.tsx`)**: A synchronized, glassmorphic UI overlay that drops the AI-generated hint directly into the struggling learner's browser workspace inside the `LearnerDashboard.tsx`.


# SensAI API Testing Guide

**Swagger UI:** http://localhost:8001/docs  
**Base URL:** http://localhost:8001  
**Frontend:** http://localhost:3000

---

## Valid Demo Data (confirmed in DB)

### Cohorts
| ID | Name |
|---|---|
| 10 | Python Bootcamp — Cohort 1 |
| 11 | Python Bootcamp — Cohort 2 |

### Courses
| ID | Name | Cohort |
|---|---|---|
| 20 | Python Fundamentals | 10 |
| 21 | Data Structures in Python | 11 |

### Learners in Cohort 10 (ranked by data richness)
| learner_id | Name | Chats | Tasks Done | Best for |
|---|---|---|---|---|
| 5 | David Park | 64 | 1 | Friction/signals, highest friction score |
| 7 | Frank Diaz | 44 | 1 | Struggle language signals |
| 3 | Bob Kumar | 42 | 3 | Full learner profile demo |
| 11 | Ivan Petrov | 42 | 0 | Dropout / no-submission signals |
| 9 | Henry Müller | 32 | 2 | Velocity drop demo |
| 6 | Emma Nwosu | 30 | 3 | Balanced profile |
| 8 | Grace Lim | 20 | 3 | High performer |

### Valid Frontend URLs
```
# Best overall (David Park — most signals)
http://localhost:3000/intelligence?cohortId=10&learnerId=5&cohortName=Python+Bootcamp+Cohort+1

# Full learner profile (Bob Kumar — 3 tasks + struggle signals)
http://localhost:3000/intelligence?cohortId=10&learnerId=3&cohortName=Python+Bootcamp+Cohort+1

# High performer (Grace Lim — 3 tasks completed)
http://localhost:3000/intelligence?cohortId=10&learnerId=8&cohortName=Python+Bootcamp+Cohort+1

# Dropout profile (Ivan Petrov — chatted but never completed)
http://localhost:3000/intelligence?cohortId=10&learnerId=11&cohortName=Python+Bootcamp+Cohort+1

# Cohort 2
http://localhost:3000/intelligence?cohortId=11&learnerId=15&cohortName=Python+Bootcamp+Cohort+2
```

---

## Setup

```bash
cd backend
uv run python -m api.seed_demo_data
uv run uvicorn api.main:app --reload --app-dir src --port 8001
```

---

## intelligence tag

### GET `/intelligence/mentor/{cohort_id}/briefing`
Top 5 at-risk learners — friction score, risk level, reasons, velocity risk, recommended action.

Swagger: `cohort_id = 10`
```bash
curl http://localhost:8001/intelligence/mentor/10/briefing
```

---

### GET `/intelligence/creator/{course_id}/signals`
Systemic issues (>35% stuck) + weak modules + rubric heatmap.

Swagger: `course_id = 20`
```bash
curl http://localhost:8001/intelligence/creator/20/signals
```

---

### POST `/intelligence/actions/trigger`
Friction + velocity + classification → rule engine → AI intervention message.

Swagger body:
```json
{"learner_id": 5, "task_id": 41, "cohort_id": 10, "learner_name": "David Park"}
```
```bash
curl -X POST http://localhost:8001/intelligence/actions/trigger \
  -H 'Content-Type: application/json' \
  -d '{"learner_id": 5, "task_id": 41, "cohort_id": 10, "learner_name": "David Park"}'
```

---

### GET `/intelligence/cohort/{cohort_id}/signals`
All 5 raw signal types: repetition, struggle language, no-submission, escalation ladder, time-on-task.

Swagger: `cohort_id = 10`
```bash
curl http://localhost:8001/intelligence/cohort/10/signals
```

---

### GET `/intelligence/cohort/{cohort_id}/insights`
OpenAI-generated prioritized insights by persona (`mentor` / `creator` / `operator`).

Swagger: `cohort_id = 10`, `persona = mentor`
```bash
curl "http://localhost:8001/intelligence/cohort/10/insights?persona=mentor"
curl "http://localhost:8001/intelligence/cohort/10/insights?persona=creator"
curl "http://localhost:8001/intelligence/cohort/10/insights?persona=operator"
```

---

### GET `/intelligence/cohort/{cohort_id}/insights/stream`
Streaming NDJSON version of insights.

Swagger: `cohort_id = 10`, `persona = mentor`
```bash
curl "http://localhost:8001/intelligence/cohort/10/insights/stream?persona=mentor"
```

---

### GET `/intelligence/learner/{learner_id}/preread`
Mentor pre-read: recent activity, struggle signals, velocity, suggested action.

Swagger: `learner_id = 5`, `cohort_id = 10`
```bash
curl "http://localhost:8001/intelligence/learner/5/preread?cohort_id=10"
```

---

### GET `/intelligence/learner/{learner_id}/velocity`
Completion velocity with >50% drop detection.

Swagger: `learner_id = 5`, `cohort_id = 10`
```bash
curl "http://localhost:8001/intelligence/learner/5/velocity?cohort_id=10"
```
Returns: `velocity_risk`, `tasks_per_day_recent`, `tasks_per_day_prior`, `drop_pct`

---

### GET `/intelligence/learner/{learner_id}/friction`
Weighted friction score [0,1] with contributing signals.

Swagger: `learner_id = 5`, `task_id = 41`, `cohort_id = 10`
```bash
curl "http://localhost:8001/intelligence/learner/5/friction?task_id=41&cohort_id=10"
```

---

### GET `/intelligence/learner/{learner_id}/profile`
OpenAI learner profile: 5 dimension scores (0-10) + learning style, strengths, struggle areas.

Swagger: `learner_id = 5`, `cohort_id = 10`
```bash
curl "http://localhost:8001/intelligence/learner/5/profile?cohort_id=10"
```

---

### GET `/intelligence/task/{task_id}/classify`
Classifies task as `systemic` (>35% cohort stuck) or `individual`.

Swagger: `task_id = 41`, `cohort_id = 10`
```bash
curl "http://localhost:8001/intelligence/task/41/classify?cohort_id=10"
```
Returns: `classification`, `stuck_pct`, `stuck_count`

---

### GET `/intelligence/bandit/{cohort_id}/state`
UCB1 bandit: all 16 arms with pull counts, avg rewards, UCB scores, best arm.

Swagger: `cohort_id = 10`
```bash
curl http://localhost:8001/intelligence/bandit/10/state
```
Returns: `arms[]` (16 entries), `best_arm`, `total_rounds`, `exploration_phase`

---

### GET `/intelligence/bandit/{cohort_id}/learner-scores`
RL-derived score per learner: avg friction, positive outcomes, RL score (0-100).

Swagger: `cohort_id = 10`
```bash
curl http://localhost:8001/intelligence/bandit/10/learner-scores
```

---

### POST `/intelligence/bandit/{cohort_id}/process-rewards`
Converts friction computations into bandit rewards. `demo_mode: true` = random rewards.

Swagger: `cohort_id = 10`, body: `{"demo_mode": true}`
```bash
curl -X POST http://localhost:8001/intelligence/bandit/10/process-rewards \
  -H 'Content-Type: application/json' \
  -d '{"demo_mode": true}'
```
Then re-check `/intelligence/bandit/10/state` to see rewards updated.

---

## agents tag

### GET `/agent/mentor/briefing/{cohort_id}`
LLM-drafted Slack messages for top struggling learners.

Swagger: `cohort_id = 10`
```bash
curl http://localhost:8001/agent/mentor/briefing/10
```

---

### GET `/agent/creator/briefing/{cohort_id}`
Systemic issues with drafted content revision instructions.

Swagger: `cohort_id = 10`
```bash
curl http://localhost:8001/agent/creator/briefing/10
```

---

### GET `/agent/bandit/state/{cohort_id}`
Bandit state via agent route (used by Operator Dashboard frontend).

Swagger: `cohort_id = 10`
```bash
curl http://localhost:8001/agent/bandit/state/10
```

---

### POST `/agent/execute-action`
Approve an action → issues `+1.0` reward to the bandit arm that generated the friction signal.

Swagger body:
```json
{"action_id": "test_001", "action_type": "send_slack", "context": {"learner_id": 5}}
```
```bash
curl -X POST http://localhost:8001/agent/execute-action \
  -H 'Content-Type: application/json' \
  -d '{"action_id": "test_001", "action_type": "send_slack", "context": {"learner_id": 5}}'
```
Then re-check `/intelligence/bandit/10/state` to confirm reward was recorded.

---

## Smoke Test — run all at once

```bash
BASE=http://localhost:8001

curl $BASE/health
curl $BASE/intelligence/mentor/10/briefing
curl $BASE/intelligence/creator/20/signals
curl $BASE/intelligence/cohort/10/signals
curl "$BASE/intelligence/cohort/10/insights?persona=mentor"
curl "$BASE/intelligence/learner/5/preread?cohort_id=10"
curl "$BASE/intelligence/learner/5/velocity?cohort_id=10"
curl "$BASE/intelligence/learner/5/friction?task_id=41&cohort_id=10"
curl "$BASE/intelligence/task/41/classify?cohort_id=10"
curl $BASE/intelligence/bandit/10/state
curl $BASE/intelligence/bandit/10/learner-scores
curl -X POST "$BASE/intelligence/bandit/10/process-rewards" -H 'Content-Type: application/json' -d '{"demo_mode": true}'
curl -X POST "$BASE/intelligence/actions/trigger" -H 'Content-Type: application/json' -d '{"learner_id": 5, "task_id": 41, "cohort_id": 10, "learner_name": "David Park"}'
curl $BASE/agent/mentor/briefing/10
curl $BASE/agent/creator/briefing/10
curl $BASE/agent/bandit/state/10
curl -X POST "$BASE/agent/execute-action" -H 'Content-Type: application/json' -d '{"action_id": "t1", "action_type": "send_slack", "context": {"learner_id": 5}}'
```

---

## Per-learner test URLs (all valid)

```bash
# David Park (id=5) — highest friction, most signals
curl "http://localhost:8001/intelligence/learner/5/preread?cohort_id=10"
curl "http://localhost:8001/intelligence/learner/5/velocity?cohort_id=10"
curl "http://localhost:8001/intelligence/learner/5/friction?task_id=41&cohort_id=10"
curl "http://localhost:8001/intelligence/learner/5/profile?cohort_id=10"

# Bob Kumar (id=3) — 3 tasks completed + struggle signals
curl "http://localhost:8001/intelligence/learner/3/preread?cohort_id=10"
curl "http://localhost:8001/intelligence/learner/3/profile?cohort_id=10"

# Ivan Petrov (id=11) — dropout profile, no completions
curl "http://localhost:8001/intelligence/learner/11/preread?cohort_id=10"
curl "http://localhost:8001/intelligence/learner/11/velocity?cohort_id=10"

# Grace Lim (id=8) — high performer, 3 tasks done
curl "http://localhost:8001/intelligence/learner/8/preread?cohort_id=10"
curl "http://localhost:8001/intelligence/learner/8/profile?cohort_id=10"
```
