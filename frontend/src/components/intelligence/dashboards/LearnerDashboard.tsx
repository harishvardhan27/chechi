"use client";
import SkillRadarChart from "@/components/intelligence/charts/SkillRadarChart";
import VelocityChart from "@/components/intelligence/charts/VelocityChart";
import { mockRadarStats as RADAR_DATA, mockVelocityPoints as VELOCITY_DATA, mockLearnerRisks as LEARNERS } from "@/lib/intelligenceMockData";
import { Star, TrendingUp, Target } from "lucide-react";

const me = LEARNERS.find(l => l.id === 2)!;
const avgSkill = Math.round(RADAR_DATA.reduce((s, d) => s + d.learner, 0) / RADAR_DATA.length);
const completedTasks = 3;
const streak = 5;

export default function LearnerDashboard() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 flex items-center justify-between">
        <div>
          <p className="text-white/40 text-xs mb-1">Welcome back</p>
          <h2 className="text-xl font-semibold text-white">{me.name}</h2>
          <p className="text-white/40 text-xs mt-1">Keep going — you&apos;re ahead of the cohort average on 4 of 6 skills.</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-indigo-400">{streak}</p>
          <p className="text-xs text-white/40">day streak 🔥</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Avg Skill Score", value: `${avgSkill}/100`, icon: Star,       color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
          { label: "Tasks Completed", value: completedTasks,    icon: Target,     color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20" },
          { label: "vs Cohort Avg",   value: "+14pts",          icon: TrendingUp, color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl border p-4 flex items-center gap-3 ${bg}`}>
            <Icon className={`w-5 h-5 ${color}`} />
            <div>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-white/40">{label}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SkillRadarChart data={RADAR_DATA} />
        <VelocityChart data={VELOCITY_DATA} />
      </div>
    </div>
  );
}
