"use client";
import { useEffect, useState } from "react";
import TimeToInterventionChart from "@/components/intelligence/charts/TimeToInterventionChart";
import SystemAccuracyChart from "@/components/intelligence/charts/SystemAccuracyChart";
import BanditArmChart from "@/components/intelligence/charts/BanditArmChart";
import { mockInterventionTimings as MOCK_TIMING, mockAccuracySlices as MOCK_ACCURACY, mockInterventions as MOCK_INTERVENTIONS } from "@/lib/intelligenceMockData";
import { useDemoMode } from "@/context/DemoModeContext";
import type { Intervention, InterventionTiming, AccuracySlice } from "@/types/intelligence";
import { Activity, CheckCircle, Clock, TrendingDown, Users, ArrowRight, AlertTriangle } from "lucide-react";

const COHORT_ID = 10;

export default function OperatorDashboard() {
  const { demo } = useDemoMode();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [timing, setTiming] = useState<InterventionTiming[]>([]);
  const [accuracy, setAccuracy] = useState<AccuracySlice[]>([]);
  const [cohortInsights, setCohortInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (demo) {
      setInterventions(MOCK_INTERVENTIONS); setTiming(MOCK_TIMING); setAccuracy(MOCK_ACCURACY);
      setLoading(false); return;
    }
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/cohort/${COHORT_ID}/signals`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const mapped: Intervention[] = (data.individual_issues ?? []).flatMap((learner: any) =>
          (learner.signals ?? []).map((s: any, i: number) => ({
            id: learner.user_id * 100 + i, learnerName: learner.user_name,
            actionType: s.signal, sentAt: s.session_date ?? s.last_seen ?? "recently",
            outcome: "pending" as const, daysToResolve: null,
          }))
        );
        if (mapped.length) setInterventions(mapped);

        const breakdown = data.summary?.signal_breakdown ?? {};
        const timingData: InterventionTiming[] = Object.entries(breakdown).map(([k, v]) => ({
          date: k.replace(/_/g, " "), avgMinutes: (v as number) * 5,
        }));
        if (timingData.length) setTiming(timingData);

        const individuals = data.individual_issues ?? [];
        const high = individuals.filter((i: any) => i.severity === "high").length;
        const medium = individuals.filter((i: any) => i.severity === "medium").length;
        const low = individuals.filter((i: any) => i.severity === "low").length;
        const total = individuals.length || 1;
        setAccuracy([
          { name: "High Risk",   value: Math.round(high / total * 100),   color: "#ef4444" },
          { name: "Medium Risk", value: Math.round(medium / total * 100), color: "#f59e0b" },
          { name: "Low Risk",    value: Math.round(low / total * 100),    color: "#22c55e" },
        ]);

        // Build cohort-level insights from signal patterns
        const insights = [];
        const atRisk = data.summary?.total_at_risk_learners ?? 0;
        const systemic = data.summary?.total_systemic_issues ?? 0;
        const noSub = breakdown.no_submission ?? 0;
        const repCount = breakdown.repetition ?? 0;

        if (atRisk >= 3) insights.push({
          severity: "high", pattern: "individual",
          title: `${atRisk} learners showing high-friction signals`,
          description: "Multiple learners are stuck — cohort-wide support may be needed.",
          action: "Launch a live Q&A session or group challenge",
        });
        if (systemic > 0) insights.push({
          severity: "high", pattern: "systemic",
          title: `${systemic} tasks flagged as systemic content issues`,
          description: "More than 35% of the cohort is stuck on the same tasks.",
          action: "Escalate to course creator for content revision",
        });
        if (noSub >= 3) insights.push({
          severity: "medium", pattern: "engagement",
          title: `${noSub} learners chatting but not submitting`,
          description: "Engagement without conversion — learners are active but not completing.",
          action: "Send cohort-wide motivational nudge or deadline reminder",
        });
        if (repCount >= 5) insights.push({
          severity: "medium", pattern: "content",
          title: `High repetition signals across ${repCount} sessions`,
          description: "Learners are asking the same questions repeatedly — content gap detected.",
          action: "Add an FAQ or supplementary explanation module",
        });
        setCohortInsights(insights);
      })
      .catch(console.error).finally(() => setLoading(false));
  }, [demo]);

  const totalSignals = interventions.length;
  const resolved = interventions.filter(i => i.outcome === "positive").length;
  const highRisk = accuracy.find(a => a.name === "High Risk")?.value ?? 0;

  return (
    <div className="space-y-6">
      {loading && <div className="text-xs text-gray-400 text-center py-2">Fetching live data…</div>}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Signals",    value: totalSignals, icon: Activity,    color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
          { label: "Resolved",         value: resolved,     icon: CheckCircle, color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20" },
          { label: "High Risk %",      value: `${highRisk}%`, icon: TrendingDown, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl border p-4 flex items-center gap-3 ${bg}`}>
            <Icon className={`w-5 h-5 ${color}`} />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
              <p className="text-xs text-gray-500 dark:text-white/40">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cohort-level pattern insights */}
      {cohortInsights.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <Users size={14} className="text-indigo-400" />
            <span className="text-sm font-light text-gray-900 dark:text-white">Cohort-Level Patterns — Program health signals</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {cohortInsights.map((ins, i) => (
              <div key={i} className="px-4 py-3 flex items-start gap-3">
                <AlertTriangle size={14} className={`mt-0.5 flex-shrink-0 ${ins.severity === "high" ? "text-red-400" : "text-amber-400"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-light text-gray-900 dark:text-white">{ins.title}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${ins.pattern === "systemic" ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" : ins.pattern === "engagement" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"}`}>
                      {ins.pattern}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{ins.description}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                  <ArrowRight size={10} /> {ins.action}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-2"><TimeToInterventionChart data={timing} /></div>
        <div className="col-span-1"><BanditArmChart cohortId={COHORT_ID} /></div>
        <div className="col-span-1"><SystemAccuracyChart data={accuracy} /></div>
      </div>

      {/* Signal log */}
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[var(--card)]">
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white/90">All Detected Signals</h3>
          <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">Individual + systemic signals across the cohort</p>
        </div>
        <div className="px-5 pb-5">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5">
                {["Learner", "Signal", "Detected", "Status"].map(h => (
                  <th key={h} className="text-left py-2 text-gray-400 dark:text-white/30 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {interventions.slice(0, 20).map(iv => (
                <tr key={iv.id} className="border-b border-gray-100 dark:border-white/5 last:border-0">
                  <td className="py-2.5 text-gray-800 dark:text-white/80">{iv.learnerName}</td>
                  <td className="py-2.5 text-gray-500 dark:text-white/50 capitalize">{iv.actionType.replace(/_/g, " ")}</td>
                  <td className="py-2.5 text-gray-400 dark:text-white/40">{iv.sentAt}</td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">pending</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
