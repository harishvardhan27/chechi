"use client";
import { useEffect, useState } from "react";
import FrictionScatterPlot from "@/components/intelligence/charts/FrictionScatterPlot";
import PriorityTable from "@/components/intelligence/charts/PriorityTable";
import InterventionImpactChart from "@/components/intelligence/charts/InterventionImpactChart";
import MentorActionFeed from "@/components/intelligence/MentorActionFeed";
import { mockLearnerRisks as MOCK_LEARNERS, mockInterventions as MOCK_INTERVENTIONS } from "@/lib/intelligenceMockData";
import { useDemoMode } from "@/context/DemoModeContext";
import type { LearnerRisk, Intervention } from "@/types/intelligence";
import { AlertTriangle, Users, Zap, Sparkles } from "lucide-react";

const COHORT_ID = "10";

function mapBriefing(data: any): LearnerRisk[] {
  return (data.high_risk_learners ?? []).map((l: any) => ({
    id: l.learner_id,
    name: l.name,
    email: l.email,
    frictionScore: l.friction_score,
    effortScore: 0.5,
    riskLevel: l.risk_level,
    reasons: l.reasons ?? [],
    velocityRisk: l.velocity_risk ?? false,
    sparkline: [],
    lastActive: "recently",
  }));
}

function mapSignalsToInterventions(data: any): Intervention[] {
  return (data.individual_issues ?? []).flatMap((learner: any, li: number) =>
    (learner.signals ?? []).map((s: any, i: number) => ({
      id: learner.user_id * 100 + i,
      learnerName: learner.user_name,
      actionType: s.signal,
      sentAt: s.session_date ?? s.last_seen ?? s.last_active ?? "recently",
      outcome: "pending" as const,
      daysToResolve: null,
    }))
  );
}

export default function MentorDashboard() {
  const { demo } = useDemoMode();
  const [learners, setLearners] = useState<LearnerRisk[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCopilot, setShowCopilot] = useState(false);

  useEffect(() => {
    if (demo) {
      setLearners(MOCK_LEARNERS);
      setInterventions(MOCK_INTERVENTIONS);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/mentor/${COHORT_ID}/briefing`).then(r => r.ok ? r.json() : null),
      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/cohort/${COHORT_ID}/signals`).then(r => r.ok ? r.json() : null),
    ]).then(([briefing, signals]) => {
      if (briefing) setLearners(mapBriefing(briefing));
      if (signals) setInterventions(mapSignalsToInterventions(signals));
    }).catch(console.error).finally(() => setLoading(false));
  }, [demo]);

  const critical = learners.filter(l => l.riskLevel === "critical").length;
  const high = learners.filter(l => l.riskLevel === "high").length;
  const velocityRisk = learners.filter(l => l.velocityRisk).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl">
        <div>
          <h3 className="text-purple-400 font-semibold text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> AI Mentor Copilot
          </h3>
          <p className="text-gray-400 text-sm">Let the Agentic AI summarize the friction and draft actions for you.</p>
        </div>
        <button onClick={() => setShowCopilot(!showCopilot)} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors font-medium shadow-lg shadow-purple-500/20">
          {showCopilot ? "View Raw Data" : "Generate AI Summary"}
        </button>
      </div>

      {showCopilot ? <MentorActionFeed cohortId={COHORT_ID} /> : (
        <>
          {loading && <div className="text-xs text-gray-400 text-center py-2">Fetching live data…</div>}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Critical Risk", value: critical,     icon: AlertTriangle, color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20" },
              { label: "High Risk",     value: high,         icon: Users,         color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
              { label: "Velocity Drop", value: velocityRisk, icon: Zap,           color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
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
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-3"><FrictionScatterPlot learners={learners} /></div>
            <div className="col-span-2"><InterventionImpactChart interventions={interventions} /></div>
          </div>
          <PriorityTable learners={learners} />
        </>
      )}
    </div>
  );
}
