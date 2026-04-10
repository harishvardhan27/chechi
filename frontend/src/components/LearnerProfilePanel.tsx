"use client";

import { useState, useEffect } from "react";
import { X, Brain, Zap, Target, TrendingUp, Shield } from "lucide-react";

interface LearnerScores {
    engagement: number;
    understanding: number;
    persistence: number;
    velocity: number;
    independence: number;
}

interface LearnerCharacteristics {
    learning_style: string;
    strengths: string[];
    struggle_areas: string[];
    behavioral_pattern: string;
    recommended_intervention: string;
}

interface LearnerProfile {
    learner_id: number;
    cohort_id: number;
    scores: LearnerScores;
    characteristics: LearnerCharacteristics;
    summary: string;
}

interface LearnerProfilePanelProps {
    learnerId: number;
    cohortId: number;
    learnerName: string;
    onClose: () => void;
}

const SCORE_META: { key: keyof LearnerScores; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "engagement", label: "Engagement", icon: <Zap size={14} />, color: "text-yellow-400" },
    { key: "understanding", label: "Understanding", icon: <Brain size={14} />, color: "text-purple-400" },
    { key: "persistence", label: "Persistence", icon: <Shield size={14} />, color: "text-blue-400" },
    { key: "velocity", label: "Velocity", icon: <TrendingUp size={14} />, color: "text-green-400" },
    { key: "independence", label: "Independence", icon: <Target size={14} />, color: "text-orange-400" },
];

function ScoreBar({ value, color }: { value: number; color: string }) {
    const pct = Math.round((value / 10) * 100);
    const barColor =
        value >= 7 ? "bg-green-400" : value >= 4 ? "bg-amber-400" : "bg-red-400";
    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-sm font-light w-6 text-right ${color}`}>{value.toFixed(1)}</span>
        </div>
    );
}

export default function LearnerProfilePanel({ learnerId, cohortId, learnerName, onClose }: LearnerProfilePanelProps) {
    const [profile, setProfile] = useState<LearnerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/learner/${learnerId}/profile?cohort_id=${cohortId}`)
            .then(r => {
                if (!r.ok) throw new Error(`Failed to load profile`);
                return r.json();
            })
            .then(setProfile)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [learnerId, cohortId]);

    return (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
            <div
                className="w-full max-w-md h-full bg-white dark:bg-[#111] border-l border-gray-200 dark:border-gray-800 overflow-y-auto shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-[#111] z-10">
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Learner Profile</p>
                        <h2 className="text-lg font-light">{learnerName}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 px-6 py-6">
                    {loading && (
                        <div className="flex flex-col items-center justify-center h-64 gap-3">
                            <div className="w-8 h-8 border-t-2 border-b-2 border-purple-500 rounded-full animate-spin" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Analysing learner data…</p>
                        </div>
                    )}

                    {error && (
                        <div className="flex flex-col items-center justify-center h-64 gap-2">
                            <p className="text-red-400 text-sm">{error}</p>
                            <button
                                onClick={() => { setLoading(true); setError(null); fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/learner/${learnerId}/profile?cohort_id=${cohortId}`).then(r => r.json()).then(setProfile).catch(e => setError(e.message)).finally(() => setLoading(false)); }}
                                className="text-xs px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:opacity-80 cursor-pointer"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {profile && !loading && (
                        <div className="space-y-8">
                            {/* Summary */}
                            <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                                <p className="text-sm font-light leading-relaxed text-gray-700 dark:text-gray-300">{profile.summary}</p>
                            </div>

                            {/* Scores */}
                            {profile.scores && (
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">Scores</h3>
                                <div className="space-y-4">
                                    {SCORE_META.map(({ key, label, icon, color }) => (
                                        <div key={key}>
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <span className={color}>{icon}</span>
                                                <span className="text-sm font-light">{label}</span>
                                            </div>
                                            <ScoreBar value={profile.scores[key] ?? 0} color={color} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            )}

                            {/* Learning Style */}
                            {profile.characteristics && (
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Learning Style</h3>
                                <span className="inline-block px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-sm font-light">
                                    {profile.characteristics.learning_style}
                                </span>
                            </div>
                            )}

                            {/* Strengths */}
                            {profile.characteristics?.strengths?.length > 0 && (
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Strengths</h3>
                                <div className="flex flex-wrap gap-2">
                                    {profile.characteristics.strengths.map((s, i) => (
                                        <span key={i} className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-light">
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            )}

                            {/* Struggle Areas */}
                            {profile.characteristics?.struggle_areas?.length > 0 && (
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Struggle Areas</h3>
                                <div className="flex flex-wrap gap-2">
                                    {profile.characteristics.struggle_areas.map((s, i) => (
                                        <span key={i} className="px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-light">
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            )}

                            {/* Behavioral Pattern */}
                            {profile.characteristics?.behavioral_pattern && (
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Behavioral Pattern</h3>
                                <p className="text-sm font-light text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {profile.characteristics.behavioral_pattern}
                                </p>
                            </div>
                            )}

                            {/* Recommended Intervention */}
                            {profile.characteristics?.recommended_intervention && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                <h3 className="text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">Recommended Action</h3>
                                <p className="text-sm font-light text-blue-800 dark:text-blue-200 leading-relaxed">
                                    {profile.characteristics.recommended_intervention}
                                </p>
                            </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
