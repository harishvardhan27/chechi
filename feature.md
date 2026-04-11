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
