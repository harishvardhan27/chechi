// intelligenceMockData.ts — Mock data for all 4 intelligence dashboards

import type {
  LearnerRisk, Intervention, RubricCell, FunnelStage,
  ConfusionTopic, InterventionTiming, AccuracySlice, RadarStat, VelocityPoint,
} from "@/types/intelligence";

const FIRST = ["Alice","Bob","Carol","David","Emma","Frank","Grace","Henry","Iris","James","Karen","Leo","Maya","Noah","Olivia","Paul","Quinn","Rachel","Sam","Tara","Uma","Victor","Wendy","Xander","Yara","Zoe","Aiden","Bella","Carlos","Diana","Ethan","Fiona","George","Hannah","Ivan","Julia","Kevin","Laura","Mike","Nina","Oscar","Petra","Raj","Sara","Tom","Ursula","Vince","Willa","Xena","Yusuf","Zara","Aaron","Beth","Cole","Dara","Eli","Faith","Glen","Hana","Igor","Jade","Kyle","Lena","Marco","Nadia","Owen","Priya","Ravi","Sasha","Tyler","Uma","Vera","Will","Xia","Yuki","Zaid","Amara","Bruno","Cleo","Dion","Elsa","Felix","Gina","Hugo","Isla","Jax","Kira","Luca","Mia","Nate","Opal","Pax","Rina","Seth","Tia","Ugo","Veda","Wade","Xio","Yael","Zuri"];
const LAST  = ["Chen","Kumar","Osei","Park","Nwosu","Diaz","Lim","Müller","Patel","Smith","Jones","Brown","Davis","Wilson","Moore","Taylor","Anderson","Thomas","Jackson","White","Harris","Martin","Garcia","Martinez","Robinson","Clark","Rodriguez","Lewis","Lee","Walker","Hall","Allen","Young","Hernandez","King","Wright","Lopez","Hill","Scott","Green","Adams","Baker","Gonzalez","Nelson","Carter","Mitchell","Perez","Roberts","Turner","Phillips","Campbell","Parker","Evans","Edwards","Collins","Stewart","Sanchez","Morris","Rogers","Reed","Cook","Morgan","Bell","Murphy","Bailey","Rivera","Cooper","Richardson","Cox","Howard","Ward","Torres","Peterson","Gray","Ramirez","James","Watson","Brooks","Kelly","Sanders","Price","Bennett","Wood","Barnes","Ross","Henderson","Coleman","Jenkins","Perry","Powell","Long","Patterson","Hughes","Flores","Washington","Butler","Simmons","Foster","Gonzales","Bryant","Alexander","Russell","Griffin","Diaz","Hayes"];
const ACTIONS = ["immediate_outreach","resource_assignment","hint_delivery","concept_reinforcement","engagement_check","content_revision","cohort_intervention","1on1_session"];
const OUTCOMES: Array<"positive"|"negative"|"pending"> = ["positive","positive","positive","negative","pending"];
const TIMES = ["5m ago","12m ago","30m ago","1h ago","2h ago","3h ago","5h ago","8h ago","12h ago","1d ago","2d ago","3d ago"];
const REASON_POOL = [
  "high_chat_volume (12 turns)","high_chat_volume (8 turns)","high_chat_volume (15 turns)",
  "multiple_retries (4 attempts)","multiple_retries (3 attempts)","multiple_retries (5 attempts)",
  "low_score (0%)","low_score (22%)","low_score (35%)","low_score (48%)",
  "long_time_on_task (47 min)","long_time_on_task (62 min)","long_time_on_task (31 min)",
  "struggle_language","no_submission (8 msgs)","no_submission (5 msgs)",
  "escalation_ladder","time_on_task (22 min)",
];

function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

function pick<T>(arr: T[], r: () => number): T { return arr[Math.floor(r() * arr.length)]; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function makeSparkline(friction: number, r: () => number): number[] {
  const base = clamp(friction - 0.3, 0, 0.6);
  return Array.from({ length: 7 }, (_, i) =>
    clamp(base + (i / 6) * (friction - base) + (r() - 0.5) * 0.08, 0, 1)
  ).map(v => Math.round(v * 1000) / 1000);
}

function riskLevel(f: number): "critical"|"high"|"medium"|"low" {
  if (f >= 0.75) return "critical";
  if (f >= 0.50) return "high";
  if (f >= 0.25) return "medium";
  return "low";
}

export const mockLearnerRisks: LearnerRisk[] = Array.from({ length: 1000 }, (_, i) => {
  const r = rng(i * 7919 + 31337);
  const first = FIRST[i % FIRST.length];
  const last  = LAST[(i * 3 + 7) % LAST.length];
  const friction = clamp(r() * 0.95 + 0.02, 0.02, 0.97);
  const effort   = clamp(r() * 0.9  + 0.05, 0.05, 0.95);
  const level    = riskLevel(friction);
  const numReasons = level === "critical" ? 3 : level === "high" ? 2 : level === "medium" ? 1 : 0;
  const reasons: string[] = [];
  const usedIdx = new Set<number>();
  for (let k = 0; k < numReasons; k++) {
    let idx: number;
    do { idx = Math.floor(r() * REASON_POOL.length); } while (usedIdx.has(idx));
    usedIdx.add(idx);
    reasons.push(REASON_POOL[idx]);
  }
  return {
    id: i + 1,
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g,"")}${i}@demo.com`,
    frictionScore: Math.round(friction * 1000) / 1000,
    effortScore:   Math.round(effort   * 1000) / 1000,
    riskLevel: level,
    reasons,
    velocityRisk: friction > 0.55 && r() > 0.4,
    sparkline: makeSparkline(friction, r),
    lastActive: pick(TIMES, r),
  };
});

export const mockInterventions: Intervention[] = Array.from({ length: 250 }, (_, i) => {
  const r = rng(i * 6271 + 99991);
  const learner = mockLearnerRisks[Math.floor(r() * 200)];
  const outcome = pick(OUTCOMES, r);
  return {
    id: i + 1,
    learnerName: learner.name,
    actionType: pick(ACTIONS, r),
    sentAt: pick(TIMES, r),
    outcome,
    daysToResolve: outcome === "positive" ? Math.floor(r() * 6) + 1 : null,
  };
});

const TASKS = [
  { id: 40, title: "Intro to Variables" },
  { id: 41, title: "Functions & Scope Quiz" },
  { id: 42, title: "OOP: Bank Account" },
  { id: 43, title: "Recursion Deep Dive" },
  { id: 44, title: "File I/O & Exceptions" },
  { id: 45, title: "Async & Concurrency" },
];
const CRITERIA = ["Correctness", "Clarity", "Code Style", "Edge Cases"];

export const mockRubricCells: RubricCell[] = TASKS.flatMap((task, ti) =>
  CRITERIA.map((criterion, ci) => {
    const r = rng(ti * 97 + ci * 31 + 1234);
    const base = (ti / TASKS.length) * 50 + (ci === 3 ? 20 : 0);
    const pct = clamp(Math.round(base + r() * 40), 5, 95);
    return { taskId: task.id, taskTitle: task.title, criterion, weaknessPct: pct };
  })
);

export const mockFunnelStages: FunnelStage[] = [
  { stage: "Module Started",   learners: 200, dropPct: 0  },
  { stage: "Task 1 Complete",  learners: 182, dropPct: 9  },
  { stage: "Task 2 Attempted", learners: 155, dropPct: 15 },
  { stage: "Task 2 Complete",  learners: 112, dropPct: 28 },
  { stage: "Task 3 Attempted", learners:  84, dropPct: 25 },
  { stage: "Task 3 Complete",  learners:  51, dropPct: 39 },
  { stage: "Task 4 Attempted", learners:  38, dropPct: 25 },
  { stage: "Module Certified", learners:  22, dropPct: 42 },
];

export const mockConfusionTopics: ConfusionTopic[] = [
  { topic: "Variable Scope",      pct: 68, count: 136 },
  { topic: "Closures",            pct: 54, count: 108 },
  { topic: "Decorators",          pct: 47, count:  94 },
  { topic: "OOP Inheritance",     pct: 41, count:  82 },
  { topic: "Recursion Base Case", pct: 38, count:  76 },
  { topic: "List Comprehension",  pct: 31, count:  62 },
  { topic: "Async / Await",       pct: 28, count:  56 },
  { topic: "Exception Handling",  pct: 24, count:  48 },
  { topic: "Python Paths",        pct: 21, count:  42 },
  { topic: "Generator Functions", pct: 18, count:  36 },
  { topic: "Lambda Functions",    pct: 15, count:  30 },
  { topic: "Dict Comprehension",  pct: 12, count:  24 },
  { topic: "Type Hints",          pct:  9, count:  18 },
  { topic: "Dataclasses",         pct:  7, count:  14 },
  { topic: "Context Managers",    pct:  5, count:  10 },
];

export const mockInterventionTimings: InterventionTiming[] = [
  { date: "Day 1",  avgMinutes: 58 },
  { date: "Day 2",  avgMinutes: 51 },
  { date: "Day 3",  avgMinutes: 63 },
  { date: "Day 4",  avgMinutes: 44 },
  { date: "Day 5",  avgMinutes: 39 },
  { date: "Day 6",  avgMinutes: 47 },
  { date: "Day 7",  avgMinutes: 35 },
  { date: "Day 8",  avgMinutes: 29 },
  { date: "Day 9",  avgMinutes: 33 },
  { date: "Day 10", avgMinutes: 22 },
  { date: "Day 11", avgMinutes: 18 },
  { date: "Day 12", avgMinutes: 25 },
  { date: "Day 13", avgMinutes: 15 },
  { date: "Day 14", avgMinutes: 12 },
];

export const mockAccuracySlices: AccuracySlice[] = [
  { name: "True Positive (resolved)",  value: 61, color: "#22c55e" },
  { name: "False Positive (no issue)", value: 16, color: "#f59e0b" },
  { name: "Pending (< 7 days)",        value: 13, color: "#6366f1" },
  { name: "False Negative (missed)",   value: 10, color: "#ef4444" },
];

export const mockRadarStats: RadarStat[] = [
  { skill: "Speed",           learner: 72, cohort: 58 },
  { skill: "Accuracy",        learner: 85, cohort: 64 },
  { skill: "Consistency",     learner: 60, cohort: 55 },
  { skill: "Engagement",      learner: 90, cohort: 70 },
  { skill: "Depth",           learner: 55, cohort: 60 },
  { skill: "Completion",      learner: 78, cohort: 62 },
  { skill: "Code Quality",    learner: 68, cohort: 54 },
  { skill: "Problem Solving", learner: 80, cohort: 66 },
  { skill: "Debugging",       learner: 63, cohort: 57 },
  { skill: "Testing",         learner: 50, cohort: 48 },
  { skill: "Documentation",   learner: 74, cohort: 52 },
  { skill: "Collaboration",   learner: 88, cohort: 72 },
  { skill: "Adaptability",    learner: 65, cohort: 60 },
  { skill: "Time Mgmt",       learner: 58, cohort: 55 },
  { skill: "Creativity",      learner: 76, cohort: 61 },
];

export const mockVelocityPoints: VelocityPoint[] = [
  { day: "Day 1",  completions: 4, baseline: 3.0 },
  { day: "Day 2",  completions: 5, baseline: 3.0 },
  { day: "Day 3",  completions: 3, baseline: 3.0 },
  { day: "Day 4",  completions: 6, baseline: 3.0 },
  { day: "Day 5",  completions: 4, baseline: 3.0 },
  { day: "Day 6",  completions: 2, baseline: 3.0 },
  { day: "Day 7",  completions: 3, baseline: 3.0 },
  { day: "Day 8",  completions: 1, baseline: 3.0 },
  { day: "Day 9",  completions: 2, baseline: 3.0 },
  { day: "Day 10", completions: 1, baseline: 3.0 },
  { day: "Day 11", completions: 0, baseline: 3.0 },
  { day: "Day 12", completions: 1, baseline: 3.0 },
  { day: "Day 13", completions: 0, baseline: 3.0 },
  { day: "Day 14", completions: 1, baseline: 3.0 },
];
