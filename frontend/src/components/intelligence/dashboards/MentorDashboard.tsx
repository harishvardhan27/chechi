"use client";
import FrictionScatterPlot from "@/components/intelligence/charts/FrictionScatterPlot";
import PriorityTable from "@/components/intelligence/charts/PriorityTable";
import InterventionImpactChart from "@/components/intelligence/charts/InterventionImpactChart";
import { mockLearnerRisks as LEARNERS, mockInterventions as INTERVENTIONS } from "@/lib/intelligenceMockData";
import { AlertTriangle, Users, Zap } from "lucide-react";

const critical = LEARNERS.filter(l => l.riskLevel === "critical").length;
const high = LEARNERS.filter(l => l.riskLevel === "high").length;
const velocityRisk = LEARNERS.filter(l => l.velocityRisk).length;

export default function MentorDashboard() {
  return (
    <div className="space-y-6">
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
        <div className="col-span-3"><FrictionScatterPlot learners={LEARNERS} /></div>
        <div className="col-span-2"><InterventionImpactChart interventions={INTERVENTIONS} /></div>
      </div>
      <PriorityTable learners={LEARNERS} />
    </div>
  );
}
