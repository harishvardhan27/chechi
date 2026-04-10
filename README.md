# SensAI — Mentor & Creator Intelligence Platform

Hackathon monorepo containing backend and frontend.

## Structure

```
hvhack/
├── backend/   — FastAPI + SQLite + Intelligence Layer
└── frontend/  — Next.js
```

## Backend

```bash
cd backend
uv sync
uv run uvicorn api.main:app --reload --app-dir src
```

Seed demo data:
```bash
cd backend
uv run python -m api.seed_demo_data
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Key Intelligence Endpoints

| Endpoint | Description |
|---|---|
| `GET /intelligence/mentor/{cohort_id}/briefing` | Top 5 at-risk learners |
| `GET /intelligence/creator/{course_id}/signals` | Systemic issues + weak modules |
| `POST /intelligence/actions/trigger` | AI intervention message |
| `GET /intelligence/cohort/{cohort_id}/insights` | AI insights by persona |
| `GET /intelligence/learner/{id}/preread?cohort_id=` | Mentor pre-read |
| `GET /intelligence/task/{id}/classify?cohort_id=` | Individual vs systemic |
