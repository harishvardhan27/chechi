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
