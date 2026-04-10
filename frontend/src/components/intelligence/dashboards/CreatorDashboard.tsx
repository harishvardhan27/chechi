"use client";
import { useEffect, useState } from "react";
import RubricHeatmap from "@/components/intelligence/charts/RubricHeatmap";
import DropOffFunnel from "@/components/intelligence/charts/DropOffFunnel";
import ConfusionTopicsChart from "@/components/intelligence/charts/ConfusionTopicsChart";
import { mockRubricCells as RUBRIC_DATA, mockFunnelStages as FUNNEL_DATA, mockConfusionTopics as CONFUSION_TOPICS } from "@/lib/intelligenceMockData";
import { useDemoMode } from "@/context/DemoModeContext";
import type { RubricCell, FunnelStage, ConfusionTopic } from "@/types/intelligence";
import { BookOpen, TrendingDown, MessageSquare } from "lucide-react";

const COURSE_ID = 1;

export default function CreatorDashboard() {
  const { demo } = useDemoMode();
  const [rubric, setRubric] = useState<RubricCell[]>(RUBRIC_DATA);
  const [funnel] = useState<FunnelStage[]>(FUNNEL_DATA);
  const [confusion, setConfusion] = useState<ConfusionTopic[]>(CONFUSION_TOPICS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (demo) { setRubric(RUBRIC_DATA); setConfusion(CONFUSION_TOPICS); return; }
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/creator/${COURSE_ID}/signals`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        // Map rubric_heatmap → RubricCell[]
        const heatmap: RubricCell[] = (data.rubric_heatmap ?? []).map((h: any) => ({
          taskId: h.task_id,
          taskTitle: h.task_title,
          criterion: "Chat Volume",
          weaknessPct: Math.min(Math.round(h.avg_messages_per_learner * 10), 100),
        }));
        if (heatmap.length) setRubric(heatmap);

        // Map systemic_issues → ConfusionTopic[]
        const topics: ConfusionTopic[] = (data.systemic_issues ?? []).map((s: any) => ({
          topic: s.task_title,
          pct: s.stuck_pct,
          count: s.stuck_count,
        }));
        if (topics.length) setConfusion(topics);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [demo]);

  const systemicTasks = [...new Set(rubric.filter(d => d.weaknessPct >= 75).map(d => d.taskTitle))].length;
  const totalDropPct = Math.round(((funnel[0]?.learners - funnel[funnel.length - 1]?.learners) / (funnel[0]?.learners || 1)) * 100);
  const topConfusion = confusion[0];

  return (
    <div className="space-y-6">
      {loading && <div className="text-xs text-white/30 text-center py-2">Fetching live data…</div>}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Critical Content Issues", value: systemicTasks,       icon: BookOpen,      color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20" },
          { label: "Module Drop-Off Rate",     value: `${totalDropPct}%`, icon: TrendingDown,  color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
          { label: "Top Confusion Topic",      value: topConfusion?.topic ?? "—", icon: MessageSquare, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
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
      <RubricHeatmap data={rubric} />
      <div className="grid grid-cols-2 gap-4">
        <DropOffFunnel data={funnel} />
        <ConfusionTopicsChart data={confusion} />
      </div>
    </div>
  );
}
