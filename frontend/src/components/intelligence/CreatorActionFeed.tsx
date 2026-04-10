"use client";

import { useState, useEffect } from "react";
import { AlertOctagon, GitPullRequest, Search, FileEdit, Check, X, ShieldAlert, Sparkles, BookOpen } from "lucide-react";

interface SystemicDraft {
    id: string;
    task_id: number;
    task_title: string;
    stuck_pct: number;
    diagnosis: string;
    action_type: string;
    action_draft: string;
    status: string;
}

export default function CreatorActionFeed({ cohortId }: { cohortId: string }) {
    const [feed, setFeed] = useState<SystemicDraft[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/agents/creator/briefing/${cohortId}`)
            .then(res => res.json())
            .then(data => setFeed(data.data || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [cohortId]);

    const handleApprove = async (action: SystemicDraft) => {
        setProcessingId(action.id);
        try {
            await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/agents/execute-action`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action_id: action.id,
                    action_type: action.action_type,
                    context: { task_id: action.task_id, draft: action.action_draft }
                })
            });
            setFeed(prev => prev.filter(a => a.id !== action.id));
        } catch (e) {
            console.error(e);
        }
        setProcessingId(null);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <div className="w-8 h-8 border-t-2 border-r-2 border-orange-500 rounded-full animate-spin"></div>
                <p className="text-gray-400 text-sm animate-pulse tracking-wide font-light">
                    Scanning cohort for systemic content failures...
                </p>
            </div>
        );
    }

    if (feed.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4 bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl">
                <ShieldAlert className="w-8 h-8 text-green-400 opacity-80" />
                <h3 className="text-gray-200 text-lg font-medium">All Systems Nominal</h3>
                <p className="text-gray-400 text-sm text-center max-w-sm font-light">
                    No task has crossed the 35% cohort struggle threshold. Your curriculum is currently highly effective.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/20 text-orange-400 rounded-lg backdrop-blur-md border border-orange-500/30">
                        <AlertOctagon className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-white tracking-tight">Creator Copilot</h2>
                        <p className="text-sm text-gray-400 font-light">Review and approve RL-driven systemic curriculum patches</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-6">
                {feed.map(action => (
                    <div 
                        key={action.id} 
                        className="group relative overflow-hidden bg-gradient-to-b from-[#1c1414] to-[#140c0c] border border-[#352020] hover:border-[#452a2a] rounded-2xl transition-all duration-300 backdrop-blur-2xl shadow-xl hover:shadow-orange-500/5"
                    >
                        <div 
                            className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" 
                        />
                        
                        <div className="p-6 relative z-10 flex flex-col gap-6">
                            
                            {/* Header Section */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-red-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium text-lg flex items-center gap-2">
                                            {action.task_title}
                                            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                                                Systemic Failure
                                            </span>
                                        </h3>
                                        <p className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                                            <span>Struggle Rate: <strong className="text-orange-400">{action.stuck_pct}%</strong></span>
                                            <span className="text-gray-600">•</span>
                                            <span>Threshold: <strong className="text-gray-500">35%</strong></span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Diagnosis Section */}
                            <div className="bg-black/30 border border-[#352020] rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Search className="w-4 h-4 text-orange-400" />
                                    <span className="text-xs uppercase tracking-wider text-orange-400/80 font-bold">Root Cause Diagnosis</span>
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed">
                                    {action.diagnosis}
                                </p>
                            </div>

                            {/* Diff / Action Draft Section */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <GitPullRequest className="w-4 h-4 text-blue-400" />
                                    <span className="text-xs uppercase tracking-wider text-blue-400/80 font-bold">Drafted Curriculum Patch</span>
                                </div>
                                <div className="p-4 bg-black/40 border border-[#2a2a35] rounded-xl text-gray-300 text-sm whitespace-pre-wrap shadow-inner font-mono leading-relaxed h-32 overflow-y-auto">
                                    {action.action_draft}
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#352020]">
                                <button 
                                    onClick={() => setFeed(p => p.filter(a => a.id !== action.id))}
                                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                                >
                                    Dismiss
                                </button>
                                <button 
                                    onClick={() => handleApprove(action)}
                                    disabled={processingId === action.id}
                                    className="flex items-center gap-2 px-6 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-all shadow-lg hover:shadow-orange-500/25 disabled:opacity-50"
                                >
                                    {processingId === action.id ? (
                                        <div className="w-4 h-4 rounded-full border-t-2 border-white animate-spin" />
                                    ) : (
                                        <>
                                            <FileEdit className="w-4 h-4" />
                                            Hot-Swap Module
                                        </>
                                    )}
                                </button>
                            </div>

                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
