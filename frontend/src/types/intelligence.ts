// ── Mentor ──────────────────────────────────────────────────────────────────
export interface LearnerRisk {
  id: number;
  name: string;
  email: string;
  frictionScore: number;
  effortScore: number;
  riskLevel: "critical" | "high" | "medium" | "low";
  reasons: string[];
  velocityRisk: boolean;
  sparkline: number[];
  lastActive: string;
}

export interface Intervention {
  id: number;
  learnerName: string;
  actionType: string;
  sentAt: string;
  outcome: "positive" | "negative" | "pending";
  daysToResolve: number | null;
}

// ── Creator ──────────────────────────────────────────────────────────────────
export interface RubricCell {
  taskId: number;
  taskTitle: string;
  criterion: string;
  weaknessPct: number;
}

export interface FunnelStage {
  stage: string;
  learners: number;
  dropPct: number;
}

export interface ConfusionTopic {
  topic: string;
  pct: number;
  count: number;
}

// ── Operator ─────────────────────────────────────────────────────────────────
export interface InterventionTiming {
  date: string;
  avgMinutes: number;
}

export interface AccuracySlice {
  name: string;
  value: number;
  color: string;
}

// ── Learner ──────────────────────────────────────────────────────────────────
export interface RadarStat {
  skill: string;
  learner: number;
  cohort: number;
}

export interface VelocityPoint {
  day: string;
  completions: number;
  baseline: number;
}
