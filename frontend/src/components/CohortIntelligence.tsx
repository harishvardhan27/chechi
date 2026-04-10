"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, TrendingDown, User, ChevronDown, ChevronUp, Sparkles, Brain, RefreshCw } from "lucide-react";
import LearnerProfilePanel from "@/components/LearnerProfilePanel";


interface RecommendedAction {
    action_type: string;
    target: string;
    description: string;
    urgency: "immediate" | "this_week" | "monitor";
}

interface AtRiskLearner {
    learner_id: number;
    name: string;
    email: string;
    friction_score: number;
    risk_level: "critical" | "high" | "medium" | "low";
    reasons: string[];
    confidence: string;
    velocity_risk: boolean;
    recommended_action: RecommendedAction;
}

interface MentorBriefing {
    cohort_id: number;
    high_risk_learners: AtRiskLearner[];
    summary: { critical: number; high: number; medium: number };
}

interface PriorityInsight {
    issue_type: "individual" | "systemic";
    severity: "high" | "medium" | "low";
    affected_entity: string;
    description: string;
    evidence: string;
    recommended_action: RecommendedAction;
}

interface CohortInsights {
    summary: string;
    insights: PriorityInsight[];
}

interface CohortIntelligenceProps {
    cohortId: string;
}

const RISK_STYLES: Record<string, string> = {
    critical: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    high: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
    medium: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    low: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
};

const URGENCY_STYLES: Record<string, string> = {
    immediate: "text-red-500 dark:text-red-400",
    this_week: "text-amber-500 dark:text-amber-400",
    monitor: "text-gray-500 dark:text-gray-400",
};

const SEVERITY_ICON: Record<string, React.ReactNode> = {
    high: <AlertTriangle size={14} className="text-red-400" />,
    medium: <AlertTriangle size={14} className="text-amber-400" />,
    low: <AlertTriangle size={14} className="text-gray-400" />,
};
function FrictionBar({ score }: { score: number }) {
    const pct = Math.round(score * 100);
    const color = score >= 0.75 ? "bg-red-400" : score >= 0.5 ? "bg-orange-400" : score >= 0.25 ? "bg-amber-400" : "bg-green-400";
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
        </div>
    );
}

function LearnerCard({ learner, cohortId }: { learner: AtRiskLearner; cohortId: string }) {
    const [expanded, setExpanded] = useState(false);
    const [showProfile, setShowProfile] = useState(false);

    return (
        <>
            <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
                    onClick={() => setExpanded(e => !e)}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                            <User size={14} className="text-gray-500 dark:text-gray-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-light truncate">{learner.name || learner.email}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{learner.email}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        {learner.velocity_risk && (
                            <TrendingDown size={14} className="text-red-400" />
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-light ${RISK_STYLES[learner.risk_level]}`}>
                            {learner.risk_level}
                        </span>
                        {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                    </div>
                </div>

                {expanded && (
                    <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3 space-y-4">
                        {/* Friction score */}
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Friction score</p>
                            <FrictionBar score={learner.friction_score} />
                        </div>

                        {/* Reasons */}
                        {learner.reasons.length > 0 && (
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Signals</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {learner.reasons.map((r, i) => (
                                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-light">
                                            {r}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recommended action */}
                        <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Recommended action</p>
                                <span className={`text-xs font-light ${URGENCY_STYLES[learner.recommended_action.urgency]}`}>
                                    {learner.recommended_action.urgency.replace("_", " ")}
                                </span>
                            </div>
                            <p className="text-sm font-light text-gray-700 dark:text-gray-300">{learner.recommended_action.description}</p>
                        </div>

                        {/* View profile button */}
                        <button
                            onClick={() => setShowProfile(true)}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:opacity-80 transition-opacity cursor-pointer"
                        >
                            <Sparkles size={12} />
                            View AI profile
                        </button>
                    </div>
                )}
            </div>

            {showProfile && (
                <LearnerProfilePanel
                    learnerId={learner.learner_id}
                    cohortId={parseInt(cohortId)}
                    learnerName={learner.name || learner.email}
                    onClose={() => setShowProfile(false)}
                />
            )}
        </>
    );
}

export default function CohortIntelligence({ cohortId }: CohortIntelligenceProps) {
    const [briefing, setBriefing] = useState<MentorBriefing | null>(null);
    const [insights, setInsights] = useState<CohortInsights | null>(null);
    const [loadingBriefing, setLoadingBriefing] = useState(true);
    const [loadingInsights, setLoadingInsights] = useState(true);
    const [errorBriefing, setErrorBriefing] = useState<string | null>(null);
    const [errorInsights, setErrorInsights] = useState<string | null>(null);
    const [bandit, setBandit] = useState<any>(null);
    const [processingRewards, setProcessingRewards] = useState(false);
    const [rlLeaderboard, setRlLeaderboard] = useState<any[]>([]);

    useEffect(() => {
        setLoadingBriefing(true);
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/mentor/${cohortId}/briefing`)
            .then(r => { if (!r.ok) throw new Error("Failed to load briefing"); return r.json(); })
            .then(setBriefing)
            .catch(e => setErrorBriefing(e.message))
            .finally(() => setLoadingBriefing(false));

        setLoadingInsights(true);
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/cohort/${cohortId}/signals`)
            .then(r => { if (!r.ok) throw new Error("Failed to load insights"); return r.json(); })
            .then(data => {
                // Build insights from raw signals without needing OpenAI
                const individuals = data.individual_issues ?? [];
                const systemic = data.systemic_issues ?? [];
                const summary = data.summary ?? {};

                const insights: PriorityInsight[] = [
                    ...systemic.map((s: any) => ({
                        issue_type: "systemic" as const,
                        severity: s.severity ?? "medium",
                        affected_entity: s.task_title,
                        description: s.description,
                        evidence: `${s.stuck_count}/${s.total_learners} learners stuck (${s.stuck_pct}%)`,
                        recommended_action: {
                            action_type: "content_revision",
                            target: s.task_title,
                            description: s.recommended_action ?? "Revise explanation or add prerequisite module.",
                            urgency: s.severity === "high" ? "immediate" : "this_week",
                        },
                    })),
                    ...individuals.slice(0, 5).map((l: any) => ({
                        issue_type: "individual" as const,
                        severity: l.severity ?? "medium",
                        affected_entity: l.user_name,
                        description: `${l.signals?.length ?? 0} struggle signal(s) detected.`,
                        evidence: l.signals?.map((s: any) => s.signal).join(", ") ?? "",
                        recommended_action: {
                            action_type: "outreach",
                            target: l.user_name,
                            description: "Reach out with targeted support or resources.",
                            urgency: l.severity === "high" ? "immediate" : "this_week",
                        },
                    })),
                ];

                setInsights({
                    summary: `${summary.total_at_risk_learners ?? 0} at-risk learners, ${summary.total_systemic_issues ?? 0} systemic content issues detected.`,
                    insights,
                });
            })
            .catch(e => setErrorInsights(e.message))
            .finally(() => setLoadingInsights(false));

        // Fetch bandit state
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/bandit/${cohortId}/state`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setBandit(data); })
            .catch(() => {});

        // Fetch RL learner scores
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/bandit/${cohortId}/learner-scores`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data?.learners) setRlLeaderboard(data.learners); })
            .catch(() => {});
    }, [cohortId]);

    const handleProcessRewards = () => {
        setProcessingRewards(true);
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/bandit/${cohortId}/process-rewards`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ demo_mode: true }),
        })
            .then(r => r.ok ? r.json() : null)
            .then(() => Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/bandit/${cohortId}/state`).then(r => r.json()).then(setBandit),
                fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/bandit/${cohortId}/learner-scores`).then(r => r.json()).then(d => setRlLeaderboard(d.learners ?? [])),
            ]))
            .catch(() => {})
            .finally(() => setProcessingRewards(false));
    };

    return (
        <div className="space-y-10">
            {/* ── At-Risk Learners ── */}
            <section>
                <div className="flex items-center gap-2 mb-5">
                    <AlertTriangle size={16} className="text-orange-400" />
                    <h3 className="text-base font-light">At-Risk Learners</h3>
                    {briefing && (
                        <div className="flex gap-2 ml-2">
                            {briefing.summary.critical > 0 && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300">
                                    {briefing.summary.critical} critical
                                </span>
                            )}
                            {briefing.summary.high > 0 && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300">
                                    {briefing.summary.high} high
                                </span>
                            )}
                            {briefing.summary.medium > 0 && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300">
                                    {briefing.summary.medium} medium
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {loadingBriefing && (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-t-2 border-b-2 border-orange-400 rounded-full animate-spin" />
                    </div>
                )}
                {errorBriefing && <p className="text-sm text-red-400">{errorBriefing}</p>}
                {briefing && !loadingBriefing && (
                    briefing.high_risk_learners.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
                            No at-risk learners detected 🎉
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {briefing.high_risk_learners.map(learner => (
                                <LearnerCard key={learner.learner_id} learner={learner} cohortId={cohortId} />
                            ))}
                        </div>
                    )
                )}
            </section>

            {/* ── AI Insights ── */}
            <section>
                <div className="flex items-center gap-2 mb-5">
                    <Sparkles size={16} className="text-purple-400" />
                    <h3 className="text-base font-light">AI Insights</h3>
                </div>

                {loadingInsights && (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-t-2 border-b-2 border-purple-400 rounded-full animate-spin" />
                    </div>
                )}
                {errorInsights && <p className="text-sm text-red-400">{errorInsights}</p>}
                {insights && !loadingInsights && (
                    <div className="space-y-4">
                        {/* Summary */}
                        <div className="bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                            <p className="text-sm font-light text-gray-700 dark:text-gray-300">{insights.summary}</p>
                        </div>

                        {insights.insights.length === 0 ? (
                            <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">No issues detected in this cohort.</p>
                        ) : (
                            insights.insights.map((insight, i) => (
                                <div key={i} className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            {SEVERITY_ICON[insight.severity]}
                                            <span className="text-sm font-light">{insight.affected_entity}</span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-light ${insight.issue_type === "systemic" ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300" : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300"}`}>
                                                {insight.issue_type}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-light ${RISK_STYLES[insight.severity]}`}>
                                                {insight.severity}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-sm font-light text-gray-700 dark:text-gray-300">{insight.description}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">{insight.evidence}</p>
                                    <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Action</p>
                                            <span className={`text-xs font-light ${URGENCY_STYLES[insight.recommended_action.urgency]}`}>
                                                {insight.recommended_action.urgency.replace("_", " ")}
                                            </span>
                                        </div>
                                        <p className="text-sm font-light text-gray-700 dark:text-gray-300">{insight.recommended_action.description}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </section>

            {/* ── RL Bandit State ── */}
            <section>
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">RL weight learning</h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 ml-4">
                    UCB1 bandit exploring 16 weight configurations. Bars show which theory of learner struggle is most predictive for this cohort.
                </p>

                {bandit ? (
                    <div className="space-y-0">
                        {/* Converged header row */}
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-purple-400">✦</span>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {bandit.exploration_phase ? "Exploring…" : `Converged → ${bandit.best_arm}`}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 ml-5">
                                    {bandit.total_rounds ?? 0} total rounds · {bandit.arms?.filter((a: any) => a.pull_count > 0).length ?? 0}/{bandit.arms?.length ?? 16} arms tried
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleProcessRewards}
                                    disabled={processingRewards}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw size={11} className={processingRewards ? "animate-spin" : ""} />
                                    Process rewards
                                </button>
                                <button
                                    onClick={() => {
                                        // simulate 5 rounds by calling process-rewards 5 times
                                        setProcessingRewards(true);
                                        const calls = Array.from({ length: 5 }, () =>
                                            fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/bandit/${cohortId}/process-rewards`, {
                                                method: "POST", headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ demo_mode: true }),
                                            })
                                        );
                                        Promise.all(calls)
                                            .then(() => Promise.all([
                                                fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/bandit/${cohortId}/state`).then(r => r.json()).then(setBandit),
                                                fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/bandit/${cohortId}/learner-scores`).then(r => r.json()).then(d => setRlLeaderboard(d.learners ?? [])),
                                            ]))
                                            .catch(() => {})
                                            .finally(() => setProcessingRewards(false));
                                    }}
                                    disabled={processingRewards}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-50"
                                >
                                    ▶ Simulate 5 rounds
                                </button>
                            </div>
                        </div>

                        {/* Horizontal bar chart — all arms */}
                        <div className="space-y-[3px]">
                            {(bandit.arms ?? []).map((arm: any) => {
                                const reward = arm.avg_reward ?? 0;
                                const isBest = arm.arm_name === bandit.best_arm;
                                const pulled = arm.pull_count > 0;
                                // bar color by reward value
                                const barColor = reward >= 0.7 ? "#ec4899" : reward >= 0.4 ? "#3b82f6" : reward >= 0 ? "#eab308" : "#f97316";
                                // bar width: map [-1,1] → [0,100]%
                                const barPct = Math.max(0, Math.min(100, ((reward + 1) / 2) * 100));
                                return (
                                    <div key={arm.arm_name} className="flex items-center gap-3 group">
                                        <div className={`w-36 text-right text-xs flex-shrink-0 flex items-center justify-end gap-1 ${
                                            isBest ? "text-pink-400 font-semibold" : "text-gray-500 dark:text-gray-400"
                                        }`}>
                                            {isBest && <span className="text-pink-400">★</span>}
                                            {arm.arm_name}
                                        </div>
                                        <div className="flex-1 h-5 bg-gray-100 dark:bg-[#1e1e2e] rounded-sm overflow-hidden">
                                            {pulled ? (
                                                <div
                                                    className="h-full rounded-sm transition-all duration-500"
                                                    style={{ width: `${barPct}%`, background: barColor }}
                                                />
                                            ) : (
                                                <div className="h-full w-full flex items-center px-2">
                                                    <span className="text-[10px] text-gray-400 dark:text-gray-600">not tried</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="w-20 text-right text-xs flex-shrink-0 text-gray-400 dark:text-gray-500">
                                            {pulled ? `${reward >= 0 ? "+" : ""}${reward.toFixed(2)} (${arm.pull_count}×)` : "—"}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-4 mt-4 text-[10px]">
                            {[
                                { color: "#ec4899", label: "reward ≥ 0.7" },
                                { color: "#3b82f6", label: "0.4–0.7" },
                                { color: "#eab308", label: "0–0.4" },
                                { color: "#f97316", label: "negative" },
                            ].map(({ color, label }) => (
                                <div key={label} className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
                                    <span className="text-gray-500 dark:text-gray-400">{label}</span>
                                </div>
                            ))}
                        </div>



                        {/* Best arm weights */}
                        {bandit.best_arm && (() => {
                            const bestArm = bandit.arms?.find((a: any) => a.arm_name === bandit.best_arm);
                            const weights = bestArm?.weights ?? {};
                            const weightEntries = Object.entries(weights);
                            if (!weightEntries.length) return null;
                            return (
                                <div className="mt-4 bg-[#0d0d1a] dark:bg-[#0d0d1a] border border-purple-900/40 rounded-xl p-4">
                                    <p className="text-xs font-semibold text-gray-300 mb-2">Best arm weights: {bandit.best_arm}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {weightEntries.map(([k, v]: any) => (
                                            <span key={k} className="text-xs px-2 py-1 rounded-full bg-purple-900/30 border border-purple-700/40 text-purple-300">
                                                {k.replace("w_", "").charAt(0).toUpperCase() + k.replace("w_", "").slice(1)} {(v * 100).toFixed(0)}%
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                ) : (
                    <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
                        <Brain size={24} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No bandit data yet. Friction scores will populate this as learners interact.</p>
                    </div>
                )}
            </section>

            {/* ── RL Learner Leaderboard ── */}
            {rlLeaderboard.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-green-400" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Learner RL leaderboard</h3>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 ml-4">
                        Ranked by RL score — lower score = higher friction, needs attention first
                    </p>
                    <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                        <div className="grid grid-cols-[2rem_1fr_9rem_7rem_7rem_5rem] px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                            <span>#</span>
                            <span>Learner</span>
                            <span>RL Score</span>
                            <span>Friction</span>
                            <span>Avg Reward</span>
                            <span className="text-right">Outcomes</span>
                        </div>
                        {[...rlLeaderboard]
                            .sort((a, b) => b.rl_score - a.rl_score)
                            .map((l, i, arr) => {
                                const scoreColor = l.rl_score >= 80 ? "#22c55e" : l.rl_score >= 60 ? "#3b82f6" : l.rl_score >= 40 ? "#eab308" : "#ef4444";
                                const frictionPct = Math.round((l.avg_friction ?? 0) * 100);
                                const frictionColor = frictionPct >= 50 ? "#ef4444" : frictionPct >= 25 ? "#f59e0b" : "#22c55e";
                                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : String(i + 1);
                                const isWorst = i === arr.length - 1;
                                return (
                                    <div
                                        key={l.learner_id}
                                        className={`grid grid-cols-[2rem_1fr_9rem_7rem_7rem_5rem] px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 text-xs transition-colors ${
                                            isWorst ? "bg-red-50/40 dark:bg-red-900/10" : "hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                                        }`}
                                    >
                                        <span className="flex items-center text-gray-400 dark:text-gray-500">{medal}</span>
                                        <div className="flex flex-col justify-center min-w-0 pr-2">
                                            <span className={`font-medium truncate ${
                                                isWorst ? "text-red-500 dark:text-red-400" : "text-gray-900 dark:text-white/90"
                                            }`}>{l.name || l.email}</span>
                                            <span className="text-[10px] text-gray-400 dark:text-gray-600 truncate">{l.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2 pr-2">
                                            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, l.rl_score)}%`, background: scoreColor }} />
                                            </div>
                                            <span className="font-semibold w-6 text-right flex-shrink-0" style={{ color: scoreColor }}>{l.rl_score}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 pr-2">
                                            <div className="w-10 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${frictionPct}%`, background: frictionColor }} />
                                            </div>
                                            <span style={{ color: frictionColor }}>{frictionPct}%</span>
                                        </div>
                                        <span className="flex items-center">
                                            {l.avg_reward != null
                                                ? <span className={l.avg_reward >= 0 ? "text-green-500" : "text-red-400"}>{l.avg_reward >= 0 ? "+" : ""}{l.avg_reward.toFixed(2)}</span>
                                                : <span className="text-gray-400">—</span>}
                                        </span>
                                        <div className="flex items-center justify-end">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                                {l.positive_outcomes ?? 0} ✓
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        }
                    </div>
                </section>
            )}
        </div>
    );
}
