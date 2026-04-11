"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MentorDashboard from "@/components/intelligence/dashboards/MentorDashboard";
import CreatorDashboard from "@/components/intelligence/dashboards/CreatorDashboard";
import OperatorDashboard from "@/components/intelligence/dashboards/OperatorDashboard";
import LearnerDashboard from "@/components/intelligence/dashboards/LearnerDashboard";
import { DemoModeProvider, useDemoMode } from "@/context/DemoModeContext";
import { Header } from "@/components/layout/header";
import { useThemePreference } from "@/lib/hooks/useThemePreference";
import { GraduationCap, BookOpen, Settings, User } from "lucide-react";

const TABS = [
  { id: "mentor",   label: "Mentor",   icon: GraduationCap, subtitle: "Immediate Action",   component: MentorDashboard },
  { id: "creator",  label: "Creator",  icon: BookOpen,      subtitle: "Systemic Analysis",  component: CreatorDashboard },
  { id: "operator", label: "Operator", icon: Settings,      subtitle: "Platform Health",    component: OperatorDashboard },
  { id: "learner",  label: "Learner",  icon: User,          subtitle: "Personal Awareness", component: LearnerDashboard },
] as const;

type TabId = typeof TABS[number]["id"];

function IntelligencePageInner() {
  const [active, setActive] = useState<TabId>("mentor");
  const ActiveDashboard = TABS.find(t => t.id === active)!.component;
  const { demo, setDemo } = useDemoMode();
  useThemePreference();

  const searchParams = useSearchParams();
  const cohortId = searchParams.get("cohortId");
  const learnerId = searchParams.get("learnerId");
  const cohortName = searchParams.get("cohortName") || "Cohort 1 · Python Bootcamp";

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Header showCreateCourseButton={false} />

      <div className="container mx-auto px-4 py-6">
        {/* Page title + toggle */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-light">Intelligence</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{cohortName}</p>
          </div>
          <button
            onClick={() => setDemo(!demo)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium border transition-all ${
              demo
                ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400"
                : "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 text-green-600 dark:text-green-400"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${demo ? "bg-amber-500" : "bg-green-500 animate-pulse"}`} />
            {demo ? "Demo Data" : "Live Data"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6">
          {TABS.map(({ id, label, icon: Icon, subtitle }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-light border-b-2 transition-all ${
                active === id
                  ? "border-black dark:border-white text-black dark:text-white"
                  : "border-transparent text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white"
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

        {/* @ts-ignore */}
        <ActiveDashboard cohortId={cohortId || undefined} learnerId={learnerId || undefined} />
      </div>
    </div>
  );
}

export default function IntelligencePage() {
  return (
    <DemoModeProvider>
      <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading intelligence engine...</div>}>
        <IntelligencePageInner />
      </Suspense>
    </DemoModeProvider>
  );
}
