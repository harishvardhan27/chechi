"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, TrendingDown, User, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
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
    }, [cohortId]);

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
        </div>
    );
}
