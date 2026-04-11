"use client";
import { useEffect, useState } from "react";
import SkillRadarChart from "@/components/intelligence/charts/SkillRadarChart";
import VelocityChart from "@/components/intelligence/charts/VelocityChart";
import IntelligentHintModal from "@/components/intelligence/IntelligentHintModal";
import { mockRadarStats as MOCK_RADAR, mockVelocityPoints as MOCK_VELOCITY } from "@/lib/intelligenceMockData";
import { useDemoMode } from "@/context/DemoModeContext";
import type { RadarStat, VelocityPoint } from "@/types/intelligence";
import { Star, TrendingUp, Target, ArrowRight, AlertTriangle, CheckCircle, BookOpen } from "lucide-react";

interface Props {
  cohortId?: string | number;
  learnerId?: string | number;
}

export default function LearnerDashboard({ cohortId = 10, learnerId = 3 }: Props) {
  const { demo } = useDemoMode();
  const [radar, setRadar] = useState<RadarStat[]>([]);
  const [velocity, setVelocity] = useState<VelocityPoint[]>([]);
  const [name, setName] = useState("—");
  const [completedTasks, setCompletedTasks] = useState(0);
  const [velocityRisk, setVelocityRisk] = useState(false);
  const [skillAvg, setSkillAvg] = useState(0);
  const [struggles, setStruggles] = useState<any[]>([]);
  const [suggestedAction, setSuggestedAction] = useState("");
  const [rlScore, setRlScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNudge, setShowNudge] = useState(false);

  const nudgeMessage = "Hey Alice, I noticed you've been working on the 'Recursive Functions' task for a while and have tried a few different approaches. \n\nSometimes it helps to draw out the call stack on paper. Let me know if you want to look at a simple example together!";


  useEffect(() => {
    if (demo) {
      setRadar(MOCK_RADAR); setVelocity(MOCK_VELOCITY);
      setName("Alice Chen"); setCompletedTasks(3); setVelocityRisk(false);
      setSkillAvg(Math.round(MOCK_RADAR.reduce((s, d) => s + d.learner, 0) / MOCK_RADAR.length));
      setLoading(false); return;
    }
    setLoading(true);
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/learner/${learnerId}/preread?cohort_id=${cohortId}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/learner/${learnerId}/profile?cohort_id=${cohortId}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/bandit/${cohortId}/learner-scores`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([preread, profile, rlData]) => {
      if (preread) {
        const vel = preread.velocity;
        setVelocityRisk(vel?.velocity_risk ?? false);
        setCompletedTasks(preread.recent_activity?.length ?? 0);
        setStruggles(preread.struggles ?? []);
        setSuggestedAction(preread.suggested_action ?? "");
        if (vel) {
          setVelocity([
            { day: "Prior avg", completions: Math.round(vel.tasks_per_day_prior * 10) / 10, baseline: vel.tasks_per_day_prior },
            { day: "Recent avg", completions: Math.round(vel.tasks_per_day_recent * 10) / 10, baseline: vel.tasks_per_day_prior },
          ]);
        }
      }
      if (profile) {
        setName(profile.summary?.split(" has")[0] ?? "Learner");
        if (profile.scores) {
          const mapped: RadarStat[] = Object.entries(profile.scores).map(([skill, val]) => ({
            skill: skill.charAt(0).toUpperCase() + skill.slice(1).replace(/_/g, " "),
            learner: Math.round((val as number) * 10), cohort: 60,
          }));
          setRadar(mapped);
          setSkillAvg(Math.round(mapped.reduce((s, d) => s + d.learner, 0) / mapped.length));
        }
      }
      if (rlData?.learners) {
        const me = rlData.learners.find((l: any) => String(l.learner_id) === String(learnerId));
        if (me) setRlScore(me.rl_score);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [demo, cohortId, learnerId]);

  return (
    <div className="space-y-6">
      {loading && <div className="text-xs text-gray-400 text-center py-2">Fetching live data…</div>}

      {/* Welcome banner */}
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-indigo-400 text-xs mb-1">Welcome back</p>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{name}</h2>
          <p className="text-gray-500 dark:text-white/40 text-xs mt-1">
            {velocityRisk ? "Your pace has dropped — consider catching up before it compounds." : "You're on track — keep the momentum going."}
          </p>
        </div>
        {rlScore !== null && (
          <div className="flex items-center gap-5 self-end sm:self-auto">
            {demo && (
              <button 
                onClick={() => setShowNudge(true)} 
                className="px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20 transition-all border border-purple-400/50"
              >
                Test Agentic Nudge 
              </button>
            )}
            <div className="text-right">
              <p className={`text-3xl font-bold ${rlScore >= 80 ? "text-green-400" : rlScore >= 60 ? "text-amber-400" : "text-red-400"}`}>{rlScore}</p>
              <p className="text-xs text-gray-500 dark:text-white/40">RL score</p>
            </div>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Avg Skill Score",  value: `${skillAvg}/100`, icon: Star,       color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
          { label: "Tasks Completed",  value: completedTasks,    icon: Target,     color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20" },
          { label: "Velocity Status",  value: velocityRisk ? "At Risk" : "Stable", icon: TrendingUp,
            color: velocityRisk ? "text-red-400" : "text-amber-400",
            bg: velocityRisk ? "bg-red-500/10 border-red-500/20" : "bg-amber-500/10 border-amber-500/20" },
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

      {/* Personal awareness — struggles + recommended action */}
      {(struggles.length > 0 || suggestedAction) && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-400" />
            <span className="text-sm font-light text-gray-900 dark:text-white">Your Struggle Signals — Personal awareness</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {struggles.map((s, i) => (
              <div key={i} className="px-4 py-3 flex items-start gap-3">
                <BookOpen size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-light text-gray-900 dark:text-white">{s.task}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.description}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 capitalize flex-shrink-0">
                  {s.signal.replace(/_/g, " ")}
                </span>
              </div>
            ))}
            {suggestedAction && (
              <div className="px-4 py-3 flex items-center gap-3 bg-green-50 dark:bg-green-900/10">
                <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                <p className="text-sm font-light text-gray-900 dark:text-white flex-1">{suggestedAction}</p>
                <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 flex-shrink-0">
                  <ArrowRight size={10} /> Recommended next step
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <SkillRadarChart data={radar} />
        <VelocityChart data={velocity} />
      </div>

      {showNudge && <IntelligentHintModal message={nudgeMessage} onClose={() => setShowNudge(false)} />}
    </div>
  );
}
