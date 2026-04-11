"use client";

import { useState, useEffect } from "react";
import { Check, X, Send, User, Sparkles, AlertCircle, Bot } from "lucide-react";

interface ActionDraft {
    id: string;
    learner_id: number;
    learner_name: string;
    friction_score: number;
    context: string[];
    agent_analysis: string;
    draft_message: string;
    action_type: string;
    status: string;
}

export default function MentorActionFeed({ cohortId }: { cohortId: string }) {
    const [feed, setFeed] = useState<ActionDraft[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [resolvedIds, setResolvedIds] = useState<string[]>([]);

    useEffect(() => {
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/agents/mentor/briefing/${cohortId}`)
            .then(res => res.json())
            .then(data => setFeed(data.data || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [cohortId]);

    const handleApprove = async (action: ActionDraft) => {
        setProcessingId(action.id);
        try {
            await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/agents/execute-action`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action_id: action.id,
                    action_type: action.action_type,
                    context: { learner_id: action.learner_id }
                })
            });
            // show success state overlay, then remove after delay
            setResolvedIds(prev => [...prev, action.id]);
            setTimeout(() => {
                setFeed(prev => prev.filter(a => a.id !== action.id));
                setResolvedIds(prev => prev.filter(id => id !== action.id));
            }, 2000);
        } catch (e) {
            console.error(e);
        }
        setProcessingId(null);
    };

    const handleReject = (id: string) => {
        setFeed(prev => prev.filter(a => a.id !== id));
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <div className="w-8 h-8 rounded-full border-t-2 border-l-2 border-purple-500 animate-spin"></div>
                <p className="text-gray-400 text-sm animate-pulse tracking-wide font-light">
                    Agentic Engine is drafting briefings...
                </p>
            </div>
        );
    }

    if (feed.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4 bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl">
                <Sparkles className="w-8 h-8 text-green-400 opacity-80" />
                <h3 className="text-gray-200 text-lg font-medium">Inbox Zero</h3>
                <p className="text-gray-400 text-sm text-center max-w-sm font-light">
                    Your cohort is performing optimally. The RL Agent has not detected any critical friction requiring your intervention.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg backdrop-blur-md border border-purple-500/30">
                        <Bot className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-white tracking-tight">Mentor Copilot</h2>
                        <p className="text-sm text-gray-400 font-light">Review and approve RL-driven Slack interventions</p>
                    </div>
                </div>
                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-gray-300">
                    {feed.length} Pending Actions
                </span>
            </div>

            <div className="grid gap-4">
                {feed.map(action => {
                    const isResolved = resolvedIds.includes(action.id);
                    return (
                        <div 
                            key={action.id} 
                            className="group relative overflow-hidden bg-gradient-to-b from-[#1c1c22] to-[#141419] border border-[#2a2a35] hover:border-[#3a3a45] rounded-2xl transition-all duration-300 backdrop-blur-2xl shadow-xl hover:shadow-purple-500/5"
                        >
                            {isResolved && (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center z-50 animate-in fade-in duration-300">
                                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                                        <Check className="w-6 h-6" />
                                    </div>
                                    <p className="text-emerald-400 font-medium">Intervention dispatched successfully.</p>
                                    <p className="text-xs text-emerald-400/60 mt-1">RL Agent tracking impact...</p>
                                </div>
                            )}
                            
                            {/* Dynamic Score Glow */}
                            <div 
                                className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" 
                            />
                        
                        <div className="p-6 relative z-10 flex flex-col md:flex-row gap-6">
                            {/* Left: Learner Context */}
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium text-lg">{action.learner_name}</h3>
                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                            <AlertCircle className="w-3 h-3 text-orange-400" />
                                            <span>Friction Score: <span className="text-orange-400 font-medium">{(action.friction_score * 10).toFixed(1)}/10</span></span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Agent Analysis</p>
                                    <p className="text-gray-300 text-sm leading-relaxed">{action.agent_analysis}</p>
                                </div>
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {action.context.map((tag, idx) => (
                                        <span key={idx} className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md bg-white/5 border border-white/10 text-gray-300">
                                            {tag.replace(/_/g, " ")}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Right: The Draft */}
                            <div className="flex-[1.5] flex flex-col pt-4 md:pt-0 md:pl-6 border-t md:border-t-0 md:border-l border-[#2a2a35]">
                                <div className="flex items-center gap-2 mb-3">
                                    <Send className="w-4 h-4 text-emerald-400" />
                                    <span className="text-xs uppercase tracking-wider text-emerald-400/80 font-bold">Drafted Slack Check-in</span>
                                </div>
                                <div className="p-4 bg-black/40 border border-[#2a2a35] rounded-xl text-gray-300 text-sm whitespace-pre-wrap flex-1 shadow-inner font-mono leading-relaxed">
                                    {action.draft_message}
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex items-center gap-3 mt-4 pt-4">
                                    <button 
                                        onClick={() => handleApprove(action)}
                                        disabled={processingId === action.id}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-all shadow-lg hover:shadow-purple-500/25 disabled:opacity-50"
                                    >
                                        {processingId === action.id ? (
                                            <div className="w-4 h-4 rounded-full border-t-2 border-white animate-spin" />
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4" />
                                                Approve & Send
                                            </>
                                        )}
                                    </button>
                                    <button 
                                        onClick={() => handleReject(action.id)}
                                        className="px-4 py-2.5 rounded-xl border border-[#3a3a45] hover:bg-[#2a2a35] text-gray-400 hover:text-white transition-all transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
            </div>
        </div>
    );
}
