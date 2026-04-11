# SensAI API Testing Guide
**Swagger UI:** http://localhost:8001/docs  
**Demo data:** `cohort_id=10`, `course_id=20`, `learner_id=5`, `task_id=41`

> **Note on agents routes:** The Swagger currently shows `/agent/agents/...` (double prefix bug).
> The fix is already applied in `routes/agents.py`. After restarting the server the paths become `/agent/...`.
> Until restart, use `/agent/agents/...` in Swagger and `/agent/...` in curl after restart.

---

## Setup

```bash
cd backend
uv run python -m api.seed_demo_data
uv run uvicorn api.main:app --reload --app-dir src --port 8001
```

Open http://localhost:8001/docs

---

## intelligence

### GET `/intelligence/mentor/{cohort_id}/briefing`
Top 5 at-risk learners — friction score, risk level, reasons, velocity risk, recommended action.

Swagger params: `cohort_id = 10`
```bash
curl http://localhost:8001/intelligence/mentor/10/briefing
```

---

### GET `/intelligence/creator/{course_id}/signals`
Systemic issues (>35% stuck) + weak modules + rubric heatmap by chat volume.

Swagger params: `course_id = 20`
```bash
curl http://localhost:8001/intelligence/creator/20/signals
```

---

### POST `/intelligence/actions/trigger`
Friction + velocity + classification → rule engine → AI intervention message.

Swagger body:
```json
{"learner_id": 5, "task_id": 41, "cohort_id": 10, "learner_name": "Carol Osei"}
```
```bash
curl -X POST http://localhost:8001/intelligence/actions/trigger \
  -H 'Content-Type: application/json' \
  -d '{"learner_id": 5, "task_id": 41, "cohort_id": 10, "learner_name": "Carol Osei"}'
```

---

### GET `/intelligence/cohort/{cohort_id}/signals`
All 5 raw signal types: repetition, struggle language, no-submission, escalation ladder, time-on-task.

Swagger params: `cohort_id = 10`
```bash
curl http://localhost:8001/intelligence/cohort/10/signals
```

---

### GET `/intelligence/cohort/{cohort_id}/insights`
OpenAI-generated prioritized insights by persona.

Swagger params: `cohort_id = 10`, `persona = mentor` (or `creator` / `operator`)
```bash
curl "http://localhost:8001/intelligence/cohort/10/insights?persona=mentor"
curl "http://localhost:8001/intelligence/cohort/10/insights?persona=creator"
curl "http://localhost:8001/intelligence/cohort/10/insights?persona=operator"
```

---

### GET `/intelligence/cohort/{cohort_id}/insights/stream`
Streaming NDJSON version of insights.

Swagger params: `cohort_id = 10`, `persona = mentor`
```bash
curl "http://localhost:8001/intelligence/cohort/10/insights/stream?persona=mentor"
```

---

### GET `/intelligence/learner/{learner_id}/preread`
Mentor pre-read: recent activity, struggle signals, velocity, suggested action.

Swagger params: `learner_id = 5`, `cohort_id = 10`
```bash
curl "http://localhost:8001/intelligence/learner/5/preread?cohort_id=10"
```

---

### GET `/intelligence/learner/{learner_id}/velocity`
Completion velocity with >50% drop detection.

Swagger params: `learner_id = 5`, `cohort_id = 10`
```bash
curl "http://localhost:8001/intelligence/learner/5/velocity?cohort_id=10"
```
Returns: `velocity_risk`, `tasks_per_day_recent`, `tasks_per_day_prior`, `drop_pct`

---

### GET `/intelligence/learner/{learner_id}/friction`
Weighted friction score [0,1] with contributing signals.

Swagger params: `learner_id = 5`, `task_id = 41`, `cohort_id = 10`
```bash
curl "http://localhost:8001/intelligence/learner/5/friction?task_id=41&cohort_id=10"
```

---

### GET `/intelligence/learner/{learner_id}/profile`
OpenAI learner profile: 5 dimension scores (0-10) + learning style, strengths, struggle areas.

Swagger params: `learner_id = 5`, `cohort_id = 10`
```bash
curl "http://localhost:8001/intelligence/learner/5/profile?cohort_id=10"
```

---

### GET `/intelligence/task/{task_id}/classify`
Classifies task as `systemic` (>35% cohort stuck) or `individual`.

Swagger params: `task_id = 41`, `cohort_id = 10`
```bash
curl "http://localhost:8001/intelligence/task/41/classify?cohort_id=10"
```
Returns: `classification`, `stuck_pct`, `stuck_count`

---

### GET `/intelligence/bandit/{cohort_id}/state`
UCB1 bandit: all 16 arms with pull counts, avg rewards, UCB scores, best arm.

Swagger params: `cohort_id = 10`
```bash
curl http://localhost:8001/intelligence/bandit/10/state
```
Returns: `arms[]` (16 entries), `best_arm`, `total_rounds`, `exploration_phase`

---

### GET `/intelligence/bandit/{cohort_id}/learner-scores`
RL-derived score per learner: avg friction, positive outcomes, RL score (0-100).

Swagger params: `cohort_id = 10`
```bash
curl http://localhost:8001/intelligence/bandit/10/learner-scores
```

---

### POST `/intelligence/bandit/{cohort_id}/process-rewards`
Converts friction computations into bandit rewards. `demo_mode: true` = random rewards for simulation.

Swagger params: `cohort_id = 10`, body: `{"demo_mode": true}`
```bash
curl -X POST http://localhost:8001/intelligence/bandit/10/process-rewards \
  -H 'Content-Type: application/json' \
  -d '{"demo_mode": true}'
```
Then re-check `/intelligence/bandit/10/state` to see rewards updated.

---

## agents

> After server restart these are `/agent/...`. Until restart Swagger shows `/agent/agents/...`.

### GET `/agent/mentor/briefing/{cohort_id}`
LLM-drafted Slack messages for top struggling learners.

Swagger params: `cohort_id = 10`
```bash
curl http://localhost:8001/agent/mentor/briefing/10
```

---

### GET `/agent/creator/briefing/{cohort_id}`
Systemic issues with drafted revised task instructions.

Swagger params: `cohort_id = 10`
```bash
curl http://localhost:8001/agent/creator/briefing/10
```

---

### GET `/agent/bandit/state/{cohort_id}`
Bandit state via agent route (used by Operator Dashboard).

Swagger params: `cohort_id = 10`
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
curl -X POST "$BASE/intelligence/actions/trigger" -H 'Content-Type: application/json' -d '{"learner_id": 5, "task_id": 41, "cohort_id": 10}'
curl $BASE/agent/mentor/briefing/10
curl $BASE/agent/creator/briefing/10
curl $BASE/agent/bandit/state/10
curl -X POST "$BASE/agent/execute-action" -H 'Content-Type: application/json' -d '{"action_id": "t1", "action_type": "send_slack", "context": {"learner_id": 5}}'
```
