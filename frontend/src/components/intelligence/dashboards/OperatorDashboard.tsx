"use client";
import { useEffect, useState } from "react";
import TimeToInterventionChart from "@/components/intelligence/charts/TimeToInterventionChart";
import SystemAccuracyChart from "@/components/intelligence/charts/SystemAccuracyChart";
import { mockInterventionTimings as TIMING_DATA, mockAccuracySlices as ACCURACY_DATA, mockInterventions as INTERVENTIONS } from "@/lib/intelligenceMockData";
import { useDemoMode } from "@/context/DemoModeContext";
import type { Intervention } from "@/types/intelligence";
import { Activity, CheckCircle, Clock } from "lucide-react";

const COHORT_ID = 10;

export default function OperatorDashboard() {
  const { demo } = useDemoMode();
  const [interventions, setInterventions] = useState<Intervention[]>(INTERVENTIONS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (demo) { setInterventions(INTERVENTIONS); return; }
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/cohort/${COHORT_ID}/signals`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        // Map individual_issues signals → Intervention[]
        const mapped: Intervention[] = (data.individual_issues ?? []).flatMap((learner: any) =>
          (learner.signals ?? []).map((s: any, i: number) => ({
            id: learner.user_id * 100 + i,
            learnerName: learner.user_name,
            actionType: s.signal,
            sentAt: s.session_date ?? s.last_seen ?? s.last_active ?? "recently",
            outcome: "pending" as const,
            daysToResolve: null,
          }))
        );
        if (mapped.length) setInterventions(mapped);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [demo]);

  const totalInterventions = interventions.length;
  const resolved = interventions.filter(i => i.outcome === "positive").length;
  const avgDays = resolved > 0
    ? interventions.filter(i => i.daysToResolve).reduce((s, i) => s + (i.daysToResolve ?? 0), 0) / resolved
    : 0;

  return (
    <div className="space-y-6">
      {loading && <div className="text-xs text-white/30 text-center py-2">Fetching live data…</div>}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Interventions", value: totalInterventions,       icon: Activity,    color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
          { label: "Resolved (7 days)",   value: resolved,                 icon: CheckCircle, color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20" },
          { label: "Avg Days to Resolve", value: `${avgDays.toFixed(1)}d`, icon: Clock,       color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20" },
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
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2"><TimeToInterventionChart data={TIMING_DATA} /></div>
        <div className="col-span-1"><SystemAccuracyChart data={ACCURACY_DATA} /></div>
      </div>
      <div className="rounded-xl border border-white/10 bg-[var(--card)]">
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold text-white/90">Recent Interventions Log</h3>
          <p className="text-xs text-white/40 mt-0.5">All mentor actions in the last 7 days</p>
        </div>
        <div className="px-5 pb-5">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5">
                {["Learner", "Action", "Sent", "Outcome"].map(h => (
                  <th key={h} className="text-left py-2 text-white/30 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {interventions.slice(0, 20).map(iv => (
                <tr key={iv.id} className="border-b border-white/5 last:border-0">
                  <td className="py-2.5 text-white/80">{iv.learnerName}</td>
                  <td className="py-2.5 text-white/50 capitalize">{iv.actionType.replace(/_/g, " ")}</td>
                  <td className="py-2.5 text-white/40">{iv.sentAt}</td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                      iv.outcome === "positive" ? "bg-green-500/15 text-green-400 border border-green-500/30" :
                      iv.outcome === "negative" ? "bg-red-500/15 text-red-400 border border-red-500/30" :
                      "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                    }`}>{iv.outcome}</span>
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
