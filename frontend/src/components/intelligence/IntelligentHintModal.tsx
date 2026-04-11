"use client";
import { useState, useEffect } from "react";
import { Check, X, Bot, Sparkles } from "lucide-react";

interface Props {
    message: string;
    onClose: () => void;
}

export default function IntelligentHintModal({ message, onClose }: Props) {
    const [visible, setVisible] = useState(false);
    
    // Simulate pop-in delay upon mount
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 50);
        return () => clearTimeout(t);
    }, []);

    const handleAccept = () => {
        setVisible(false);
        setTimeout(onClose, 400); // Wait for fade-out transition
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0 transition-opacity duration-300 ${visible ? "bg-black/60 backdrop-blur-[4px] opacity-100" : "bg-black/0 backdrop-blur-none opacity-0"}`}>
            <div className={`relative max-w-lg w-full bg-[#1c1c22] border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden transition-all duration-500 transform ${visible ? "scale-100 translate-y-0 opacity-100" : "scale-95 translate-y-8 opacity-0"}`}>
                
                {/* Glow Effect */}
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px]" />
                <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />

                <div className="relative z-10 p-6 md:p-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/20">
                                <Bot className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                                    Agentic Nudge
                                    <Sparkles className="w-4 h-4 text-purple-400" />
                                </h3>
                                <p className="text-sm text-gray-400 font-light mt-0.5">Incoming assistance based on your progress</p>
                            </div>
                        </div>
                        <button onClick={handleAccept} className="text-gray-500 hover:text-white transition-colors p-1 sm:p-2 self-end sm:self-auto -mr-2 -mt-2 sm:m-0">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="bg-black/40 border border-[#2a2a35] rounded-xl p-5 mb-6 shadow-inner font-mono text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                        {message}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button onClick={handleAccept} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                            Dismiss
                        </button>
                        <button onClick={handleAccept} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all shadow-lg hover:shadow-purple-500/25">
                            <Check className="w-4 h-4" />
                            Got It, Thanks!
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
