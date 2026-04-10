"use client";
import { useState } from "react";
import MentorDashboard from "@/components/intelligence/dashboards/MentorDashboard";
import CreatorDashboard from "@/components/intelligence/dashboards/CreatorDashboard";
import OperatorDashboard from "@/components/intelligence/dashboards/OperatorDashboard";
import LearnerDashboard from "@/components/intelligence/dashboards/LearnerDashboard";
import { GraduationCap, BookOpen, Settings, User } from "lucide-react";

const TABS = [
  { id: "mentor",   label: "Mentor",   icon: GraduationCap, subtitle: "Immediate Action",   component: MentorDashboard },
  { id: "creator",  label: "Creator",  icon: BookOpen,      subtitle: "Systemic Analysis",  component: CreatorDashboard },
  { id: "operator", label: "Operator", icon: Settings,      subtitle: "Platform Health",    component: OperatorDashboard },
  { id: "learner",  label: "Learner",  icon: User,          subtitle: "Personal Awareness", component: LearnerDashboard },
] as const;

type TabId = typeof TABS[number]["id"];

export default function IntelligencePage() {
  const [active, setActive] = useState<TabId>("mentor");
  const ActiveDashboard = TABS.find(t => t.id === active)!.component;

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <header className="border-b border-white/5 bg-[#0f0f0f]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <div>
              <span className="text-white font-semibold text-sm">SensAI</span>
              <span className="text-white/30 text-xs ml-2">Intelligence Platform</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-white/30">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live · Cohort 1 · Python Bootcamp
          </div>
        </div>
      </header>

      <div className="border-b border-white/5 bg-[#0f0f0f]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {TABS.map(({ id, label, icon: Icon, subtitle }) => (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-all ${
                  active === id
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-white/40 hover:text-white/70 hover:border-white/20"
                }`}
              >
                <Icon className="w-4 h-4" />
                <div className="text-left">
                  <div>{label}</div>
                  <div className="text-[10px] font-normal opacity-60">{subtitle}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <ActiveDashboard />
      </main>
    </div>
  );
}
