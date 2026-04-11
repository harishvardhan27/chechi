# SensAI API Testing Guide

All endpoints assume the FastAPI server is running on `http://127.0.0.1:8000`.
Demo data: `cohort_id=10`, `course_id=20`, `learner_id=3`, `task_id=41`.

Seed demo data first:
```bash
cd backend && uv run python -m api.seed_demo_data
```

---

## Intelligence Layer

### 1. Mentor Briefing — Top 5 At-Risk Learners
Computes friction scores via UCB1 Bandit + dynamic baselines. Returns risk level, reasons, confidence, and recommended action.

```bash
curl http://127.0.0.1:8000/intelligence/mentor/10/briefing
```

**Expected:** `high_risk_learners[]` with `friction_score`, `risk_level` (critical/high/medium/low), `reasons[]`, `velocity_risk`, `recommended_action`.

---

### 2. Creator Signals — Systemic Issues + Weak Modules + Rubric Heatmap
Identifies tasks where >35% of learners are stuck, lowest completion-rate modules, and confusion hotspots by chat volume.

```bash
curl http://127.0.0.1:8000/intelligence/creator/20/signals
```

**Expected:** `systemic_issues[]`, `weak_modules[]` with `completion_rate_pct`, `rubric_heatmap[]` with `confusion_level`.

---

### 3. Trigger Intervention Action
Computes friction + velocity + classification for a learner/task, runs the rule-based action engine, and generates an AI-written intervention message via OpenAI.

```bash
curl -X POST http://127.0.0.1:8000/intelligence/actions/trigger \
  -H 'Content-Type: application/json' \
  -d '{"learner_id": 3, "task_id": 41, "cohort_id": 10, "learner_name": "Bob Kumar"}'
```

**Expected:** `friction`, `classification`, `velocity`, `recommended_action`, `intervention_message` (subject + body + tone).

---

### 4. Cohort Raw Signals
Returns all 5 signal types: repetition, struggle language, no-submission, escalation ladder, time-on-task.

```bash
curl http://127.0.0.1:8000/intelligence/cohort/10/signals
```

---

### 5. Cohort AI Insights (by Persona)
OpenAI-generated prioritized insights. Persona changes the focus: `mentor` → individual learners, `creator` → content issues, `operator` → cohort-wide trends.

```bash
curl "http://127.0.0.1:8000/intelligence/cohort/10/insights?persona=mentor"
curl "http://127.0.0.1:8000/intelligence/cohort/10/insights?persona=creator"
curl "http://127.0.0.1:8000/intelligence/cohort/10/insights?persona=operator"
```

---

### 6. Cohort Insights — Streaming (NDJSON)
Same as above but streams partial JSON chunks for live UI updates.

```bash
curl "http://127.0.0.1:8000/intelligence/cohort/10/insights/stream?persona=mentor"
```

---

### 7. Mentor Pre-Read for a Learner
Structured pre-read: recent activity, struggle signals, velocity status, suggested action.

```bash
curl "http://127.0.0.1:8000/intelligence/learner/3/preread?cohort_id=10"
```

---

### 8. Learner Completion Velocity
Detects >50% drop in tasks/day between prior and recent windows.

```bash
curl "http://127.0.0.1:8000/intelligence/learner/3/velocity?cohort_id=10"
```

**Expected:** `velocity_risk`, `tasks_per_day_recent`, `tasks_per_day_prior`, `drop_pct`.

---

### 9. Task Signal Classifier — Individual vs Systemic
Classifies whether a task's difficulty is systemic (>35% cohort stuck) or individual.

```bash
curl "http://127.0.0.1:8000/intelligence/task/41/classify?cohort_id=10"
```

**Expected:** `classification: "systemic" | "individual"`, `stuck_pct`, `stuck_count`.

---

### 10. Friction Score for a Learner+Task
Returns the weighted friction score [0,1] and contributing signals (chat, attempts, score, time, LLM sentiment).

```bash
curl "http://127.0.0.1:8000/intelligence/learner/3/friction?task_id=41&cohort_id=10"
```

---

### 11. Learner Profile (AI-Generated)
OpenAI generates 5 dimension scores (engagement, understanding, persistence, velocity, independence) + learning style, strengths, struggle areas.

```bash
curl "http://127.0.0.1:8000/intelligence/learner/3/profile?cohort_id=10"
```

---

## Reinforcement Learning (UCB1 Bandit)

### 12. Bandit State — 16 Weight Arms
Returns all 16 weight configurations with pull counts, avg rewards, UCB scores, and the current best arm.

```bash
curl http://127.0.0.1:8000/intelligence/bandit/10/state
```

**Expected:** `arms[]` with `arm_name`, `pull_count`, `avg_reward`, `ucb_score`, `weights{}`. `best_arm` shows which theory of learner struggle is most predictive.

---

### 13. Process Bandit Rewards
Converts recent friction computations into bandit rewards (reward = 1 - friction_score). Use `demo_mode=true` for random rewards to simulate exploration.

```bash
# Real rewards
curl -X POST http://127.0.0.1:8000/intelligence/bandit/10/process-rewards \
  -H 'Content-Type: application/json' \
  -d '{"demo_mode": false}'

# Demo/random rewards (for UI simulation)
curl -X POST http://127.0.0.1:8000/intelligence/bandit/10/process-rewards \
  -H 'Content-Type: application/json' \
  -d '{"demo_mode": true}'
```

---

### 14. Learner RL Scores
Per-learner RL score derived from avg friction + positive intervention outcomes. Score = `100 - friction*60 + positive_outcomes*10`.

```bash
curl http://127.0.0.1:8000/intelligence/bandit/10/learner-scores
```

---

## Agentic Copilot Feed

### 15. Mentor Action Feed (Agentic)
Drafts Slack messages for top struggling learners using LLM. Returns `agent_analysis` + `draft_message` per learner.

```bash
curl http://127.0.0.1:8000/agent/mentor/briefing/10
```

---

### 16. Creator Action Feed (Agentic)
Identifies high-severity systemic issues and drafts revised task instructions.

```bash
curl http://127.0.0.1:8000/agent/creator/briefing/10
```

---

### 17. Execute Action (RL Feedback Loop)
Simulates mentor/creator clicking "Approve" in the Action Feed. Issues a `+1.0` reward to the bandit arm that generated the friction signal.

```bash
curl -X POST http://127.0.0.1:8000/agent/execute-action \
  -H 'Content-Type: application/json' \
  -d '{
    "action_id": "test_intervention_123",
    "action_type": "send_slack",
    "context": {"learner_id": 3}
  }'
```

**Expected:** `status: "success"`. Check bandit state afterwards to see the reward reflected.

---

### 18. Bandit State (Agent Route)
Same bandit state via the `/agent` prefix (used by the frontend Operator Dashboard).

```bash
curl http://127.0.0.1:8000/agent/bandit/state/10
```

---

## Frontend — Intelligence Dashboard

The Next.js frontend at `http://localhost:3000/intelligence` renders four persona dashboards:

| Dashboard | Key Components |
|---|---|
| **Mentor** | At-risk learner list, friction scores, velocity chart, pre-read panel, action feed with draft Slack messages |
| **Creator** | Systemic issues list, weak modules, rubric weakness heatmap, confusion topics chart |
| **Operator** | UCB1 Bandit arm chart (16 arms, rewards, convergence), RL learner scores, system accuracy chart, intervention impact |
| **Learner** | Skill radar chart (5 dimensions), drop-off funnel, velocity chart, learner profile |

### Frontend API Calls (via `/app/api` Next.js routes)
The frontend proxies to the backend. Key pages:
- `GET /intelligence` — main dashboard with persona switcher
- Charts: `BanditArmChart`, `RubricHeatmap`, `VelocityChart`, `SkillRadarChart`, `FrictionScatterPlot`, `DropOffFunnel`, `InterventionImpactChart`

---

## Quick Smoke Test Sequence

```bash
# 1. Seed data
cd backend && uv run python -m api.seed_demo_data

# 2. Start server
uv run uvicorn api.main:app --reload --app-dir src

# 3. Run smoke tests
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/intelligence/mentor/10/briefing
curl http://127.0.0.1:8000/intelligence/creator/20/signals
curl "http://127.0.0.1:8000/intelligence/cohort/10/insights?persona=mentor"
curl "http://127.0.0.1:8000/intelligence/learner/3/preread?cohort_id=10"
curl "http://127.0.0.1:8000/intelligence/task/41/classify?cohort_id=10"
curl http://127.0.0.1:8000/intelligence/bandit/10/state
curl -X POST http://127.0.0.1:8000/intelligence/bandit/10/process-rewards -H 'Content-Type: application/json' -d '{"demo_mode": true}'
curl http://127.0.0.1:8000/agent/mentor/briefing/10
```
