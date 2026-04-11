"use client";
import { useEffect, useState } from "react";
import RubricHeatmap from "@/components/intelligence/charts/RubricHeatmap";
import DropOffFunnel from "@/components/intelligence/charts/DropOffFunnel";
import ConfusionTopicsChart from "@/components/intelligence/charts/ConfusionTopicsChart";
import CreatorActionFeed from "@/components/intelligence/CreatorActionFeed";
import { mockRubricCells as MOCK_RUBRIC, mockFunnelStages as MOCK_FUNNEL, mockConfusionTopics as MOCK_CONFUSION } from "@/lib/intelligenceMockData";
import { useDemoMode } from "@/context/DemoModeContext";
import type { RubricCell, FunnelStage, ConfusionTopic } from "@/types/intelligence";
import { BookOpen, TrendingDown, MessageSquare, Sparkles, AlertTriangle, Users, ArrowRight, Layers } from "lucide-react";

interface Props {
  cohortId?: string | number;
}

export default function CreatorDashboard({ cohortId = "20" }: Props) {
  const { demo } = useDemoMode();
  const [rubric, setRubric] = useState<RubricCell[]>([]);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [confusion, setConfusion] = useState<ConfusionTopic[]>([]);
  const [systemicIssues, setSystemicIssues] = useState<any[]>([]);
  const [weakModules, setWeakModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCopilot, setShowCopilot] = useState(false);

  useEffect(() => {
    if (demo) {
      setRubric(MOCK_RUBRIC); setFunnel(MOCK_FUNNEL); setConfusion(MOCK_CONFUSION);
      setLoading(false); return;
    }
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/creator/${cohortId}/signals`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const heatmap: RubricCell[] = (data.rubric_heatmap ?? []).map((h: any) => ({
          taskId: h.task_id, taskTitle: h.task_title, criterion: "Chat Volume",
          weaknessPct: Math.min(Math.round(h.avg_messages_per_learner * 10), 100),
        }));
        if (heatmap.length) setRubric(heatmap);

        const weak = data.weak_modules ?? [];
        if (weak.length) setFunnel(weak.map((m: any) => ({ stage: m.task_title, learners: m.attempted, dropPct: Math.round(100 - m.completion_rate_pct) })));

        const systemic = data.systemic_issues ?? [];
        setSystemicIssues(systemic);
        setWeakModules(weak);

        if (systemic.length) {
          setConfusion(systemic.map((s: any) => ({ topic: s.task_title, pct: s.stuck_pct, count: s.stuck_count })));
        } else if (heatmap.length) {
          setConfusion(heatmap.map(h => ({ topic: h.taskTitle, pct: h.weaknessPct, count: 0 })));
        }
      })
      .catch(console.error).finally(() => setLoading(false));
  }, [demo, cohortId]);

  const systemicTasks = [...new Set(rubric.filter(d => d.weaknessPct >= 75).map(d => d.taskTitle))].length;
  const totalDropPct = funnel.length ? Math.round(((funnel[0]?.learners - funnel[funnel.length - 1]?.learners) / (funnel[0]?.learners || 1)) * 100) : 0;
  const topConfusion = confusion[0];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl">
        <div>
          <h3 className="text-orange-400 font-semibold text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> AI Creator Copilot
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Analyze systemic issues and draft curriculum fixes.</p>
        </div>
        <button onClick={() => setShowCopilot(!showCopilot)} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors font-medium">
          {showCopilot ? "View Raw Data" : "Generate AI Summary"}
        </button>
      </div>

      {showCopilot ? <CreatorActionFeed cohortId={String(cohortId)} /> : (
        <>
          {loading && <div className="text-xs text-gray-400 text-center py-2">Fetching live data…</div>}

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Critical Content Issues", value: systemicTasks, icon: BookOpen, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
              { label: "Module Drop-Off Rate", value: `${totalDropPct}%`, icon: TrendingDown, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
              { label: "Top Confusion Topic", value: topConfusion?.topic ?? "—", icon: MessageSquare, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className={`rounded-xl border p-4 flex items-center gap-3 ${bg}`}>
                <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
                <div><p className="text-xl font-bold text-gray-900 dark:text-white truncate">{value}</p><p className="text-xs text-gray-500 dark:text-white/40">{label}</p></div>
              </div>
            ))}
          </div>

          {/* Systemic Issues — content-level problems */}
          {(systemicIssues.length > 0 || weakModules.length > 0) && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                <Layers size={14} className="text-red-400" />
                <span className="text-sm font-light text-gray-900 dark:text-white">Systemic Issues — Content needs attention</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">(affects multiple learners, not individuals)</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {systemicIssues.map((s, i) => (
                  <div key={i} className="px-4 py-3 flex items-start gap-3">
                    <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-light text-gray-900 dark:text-white">{s.task_title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{s.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 flex-shrink-0">
                      <ArrowRight size={10} /> Revise content
                    </div>
                  </div>
                ))}
                {weakModules.map((m, i) => (
                  <div key={`w${i}`} className="px-4 py-3 flex items-start gap-3">
                    <TrendingDown size={14} className="text-orange-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-light text-gray-900 dark:text-white">{m.task_title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{m.completion_rate_pct}% completion rate — {m.attempted} attempted, {m.completions} completed</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 flex-shrink-0">
                      <ArrowRight size={10} /> Add prerequisite
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <RubricHeatmap data={rubric} />
          <div className="grid grid-cols-2 gap-4">
            <DropOffFunnel data={funnel} />
            <ConfusionTopicsChart data={confusion} />
          </div>
        </>
      )}
    </div>
  );
}
