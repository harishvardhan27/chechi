"use client";
import { useEffect, useState } from "react";
import FrictionScatterPlot from "@/components/intelligence/charts/FrictionScatterPlot";
import PriorityTable from "@/components/intelligence/charts/PriorityTable";
import InterventionImpactChart from "@/components/intelligence/charts/InterventionImpactChart";
import MentorActionFeed from "@/components/intelligence/MentorActionFeed";
import { mockLearnerRisks as MOCK_LEARNERS, mockInterventions as MOCK_INTERVENTIONS } from "@/lib/intelligenceMockData";
import { useDemoMode } from "@/context/DemoModeContext";
import type { LearnerRisk, Intervention } from "@/types/intelligence";
import { AlertTriangle, Users, Zap, Sparkles, ArrowRight, Clock, MessageSquare, RotateCcw } from "lucide-react";



const ACTION_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  repetition:        { label: "Assign targeted practice", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800" },
  struggle_language: { label: "Trigger 1:1 outreach",     color: "text-red-600 dark:text-red-400",    bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" },
  no_submission:     { label: "Send re-engagement nudge", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" },
  time_on_task:      { label: "Offer a hint or resource",  color: "text-blue-600 dark:text-blue-400",  bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" },
  escalation_ladder: { label: "Review AI escalation path", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800" },
};

const SIGNAL_ICONS: Record<string, any> = {
  repetition: RotateCcw, struggle_language: MessageSquare,
  no_submission: Clock, time_on_task: Clock, escalation_ladder: ArrowRight,
};

function mapBriefing(data: any): LearnerRisk[] {
  return (data.high_risk_learners ?? []).map((l: any) => ({
    id: l.learner_id, name: l.name, email: l.email,
    frictionScore: l.friction_score, effortScore: 0.5,
    riskLevel: l.risk_level, reasons: l.reasons ?? [],
    velocityRisk: l.velocity_risk ?? false, sparkline: [], lastActive: "recently",
  }));
}

function mapSignalsToInterventions(data: any): Intervention[] {
  return (data.individual_issues ?? []).flatMap((learner: any) =>
    (learner.signals ?? []).map((s: any, i: number) => ({
      id: learner.user_id * 100 + i, learnerName: learner.user_name,
      actionType: s.signal,
      sentAt: s.session_date ?? s.last_seen ?? s.last_active ?? "recently",
      outcome: "pending" as const, daysToResolve: null,
    }))
  );
}

interface Props {
  cohortId?: string | number;
}

export default function MentorDashboard({ cohortId = "10" }: Props) {
  const { demo } = useDemoMode();
  const [learners, setLearners] = useState<LearnerRisk[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [signals, setSignals] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCopilot, setShowCopilot] = useState(false);

  useEffect(() => {
    if (demo) {
      setLearners(MOCK_LEARNERS); setInterventions(MOCK_INTERVENTIONS);
      setLoading(false); return;
    }
    setLoading(true);
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/mentor/${cohortId}/briefing`).then(r => r.ok ? r.json() : null),
      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/cohort/${cohortId}/signals`).then(r => r.ok ? r.json() : null),
    ]).then(([briefing, sig]) => {
      if (briefing) setLearners(mapBriefing(briefing));
      if (sig) { setInterventions(mapSignalsToInterventions(sig)); setSignals(sig); }
    }).catch(console.error).finally(() => setLoading(false));
  }, [demo, cohortId]);

  const critical = learners.filter(l => l.riskLevel === "critical").length;
  const high = learners.filter(l => l.riskLevel === "high").length;
  const velocityRisk = learners.filter(l => l.velocityRisk).length;

  // Build prioritized action list from signals
  const priorityActions = signals
    ? (signals.individual_issues ?? []).slice(0, 5).map((l: any) => {
        const topSignal = l.signals?.[0]?.signal ?? "repetition";
        const action = ACTION_LABELS[topSignal] ?? ACTION_LABELS.repetition;
        const Icon = SIGNAL_ICONS[topSignal] ?? AlertTriangle;
        return { learner: l.user_name, signal: topSignal, severity: l.severity, action, Icon, description: l.signals?.[0]?.description ?? "" };
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl">
        <div>
          <h3 className="text-purple-400 font-semibold text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> AI Mentor Copilot
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Summarize friction signals and draft intervention messages.</p>
        </div>
        <button onClick={() => setShowCopilot(!showCopilot)} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors font-medium">
          {showCopilot ? "View Raw Data" : "Generate AI Summary"}
        </button>
      </div>

      {showCopilot ? <MentorActionFeed cohortId={String(cohortId)} /> : (
        <>
          {loading && <div className="text-xs text-gray-400 text-center py-2">Fetching live data…</div>}

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Critical Risk", value: critical, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
              { label: "High Risk",     value: high,     icon: Users,         color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
              { label: "Velocity Drop", value: velocityRisk, icon: Zap,       color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
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

          {/* Prioritized Action Feed */}
          {priorityActions.length > 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                <AlertTriangle size={14} className="text-orange-400" />
                <span className="text-sm font-light text-gray-900 dark:text-white">Prioritized Actions — What needs attention now</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {priorityActions.map((item: any, i: number) => (
                  <div key={i} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium mt-0.5 ${item.severity === "high" ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"}`}>
                      {item.severity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-light text-gray-900 dark:text-white">{item.learner}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.description}</p>
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${item.action.bg} ${item.action.color} flex-shrink-0`}>
                      <ArrowRight size={10} />
                      {item.action.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Charts */}
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
