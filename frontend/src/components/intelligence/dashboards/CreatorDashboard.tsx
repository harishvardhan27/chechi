"use client";
import RubricHeatmap from "@/components/intelligence/charts/RubricHeatmap";
import DropOffFunnel from "@/components/intelligence/charts/DropOffFunnel";
import ConfusionTopicsChart from "@/components/intelligence/charts/ConfusionTopicsChart";
import { mockRubricCells as RUBRIC_DATA, mockFunnelStages as FUNNEL_DATA, mockConfusionTopics as CONFUSION_TOPICS } from "@/lib/intelligenceMockData";
import { BookOpen, TrendingDown, MessageSquare } from "lucide-react";

export default function CreatorDashboard() {
  const systemicTasks = [...new Set(RUBRIC_DATA.filter(d => d.weaknessPct >= 75).map(d => d.taskTitle))].length;
  const totalDropPct = Math.round(((30 - FUNNEL_DATA[FUNNEL_DATA.length - 1].learners) / 30) * 100);
  const topConfusion = CONFUSION_TOPICS[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Critical Content Issues", value: systemicTasks,       icon: BookOpen,      color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20" },
          { label: "Module Drop-Off Rate",     value: `${totalDropPct}%`, icon: TrendingDown,  color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
          { label: "Top Confusion Topic",      value: topConfusion.topic, icon: MessageSquare, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl border p-4 flex items-center gap-3 ${bg}`}>
            <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
            <div>
              <p className="text-xl font-bold text-white truncate">{value}</p>
              <p className="text-xs text-white/40">{label}</p>
            </div>
          </div>
        ))}
      </div>
      <RubricHeatmap data={RUBRIC_DATA} />
      <div className="grid grid-cols-2 gap-4">
        <DropOffFunnel data={FUNNEL_DATA} />
        <ConfusionTopicsChart data={CONFUSION_TOPICS} />
      </div>
    </div>
  );
}
