"use client";
import { useEffect, useState } from "react";
import FrictionScatterPlot from "@/components/intelligence/charts/FrictionScatterPlot";
import PriorityTable from "@/components/intelligence/charts/PriorityTable";
import InterventionImpactChart from "@/components/intelligence/charts/InterventionImpactChart";
import { mockLearnerRisks as LEARNERS, mockInterventions as INTERVENTIONS } from "@/lib/intelligenceMockData";
import { useDemoMode } from "@/context/DemoModeContext";
import type { LearnerRisk, Intervention } from "@/types/intelligence";
import { AlertTriangle, Users, Zap } from "lucide-react";

const COHORT_ID = 10;

function mapBriefingToLearnerRisks(data: any): LearnerRisk[] {
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

export default function MentorDashboard() {
  const { demo } = useDemoMode();
  const [learners, setLearners] = useState<LearnerRisk[]>(LEARNERS);
  const [interventions] = useState<Intervention[]>(INTERVENTIONS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (demo) { setLearners(LEARNERS); return; }
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/mentor/${COHORT_ID}/briefing`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setLearners(mapBriefingToLearnerRisks(data)); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [demo]);

  const critical = learners.filter(l => l.riskLevel === "critical").length;
  const high = learners.filter(l => l.riskLevel === "high").length;
  const velocityRisk = learners.filter(l => l.velocityRisk).length;

  return (
    <div className="space-y-6">
      {loading && <div className="text-xs text-white/30 text-center py-2">Fetching live data…</div>}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Critical Risk", value: critical,     icon: AlertTriangle, color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20" },
          { label: "High Risk",     value: high,         icon: Users,         color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
          { label: "Velocity Drop", value: velocityRisk, icon: Zap,           color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
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
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3"><FrictionScatterPlot learners={learners} /></div>
        <div className="col-span-2"><InterventionImpactChart interventions={interventions} /></div>
      </div>
      <PriorityTable learners={learners} />
    </div>
  );
}
