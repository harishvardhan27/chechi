"use client";
import { useEffect, useState } from "react";
import SkillRadarChart from "@/components/intelligence/charts/SkillRadarChart";
import VelocityChart from "@/components/intelligence/charts/VelocityChart";
import { mockRadarStats as MOCK_RADAR, mockVelocityPoints as MOCK_VELOCITY } from "@/lib/intelligenceMockData";
import { useDemoMode } from "@/context/DemoModeContext";
import type { RadarStat, VelocityPoint } from "@/types/intelligence";
import { Star, TrendingUp, Target } from "lucide-react";

const LEARNER_ID = 3;
const COHORT_ID = 10;

export default function LearnerDashboard() {
  const { demo } = useDemoMode();
  const [radar, setRadar] = useState<RadarStat[]>([]);
  const [velocity, setVelocity] = useState<VelocityPoint[]>([]);
  const [name, setName] = useState("—");
  const [completedTasks, setCompletedTasks] = useState(0);
  const [velocityRisk, setVelocityRisk] = useState(false);
  const [skillAvg, setSkillAvg] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (demo) {
      setRadar(MOCK_RADAR);
      setVelocity(MOCK_VELOCITY);
      setName("Alice Chen");
      setCompletedTasks(3);
      setVelocityRisk(false);
      setSkillAvg(Math.round(MOCK_RADAR.reduce((s, d) => s + d.learner, 0) / MOCK_RADAR.length));
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/learner/${LEARNER_ID}/preread?cohort_id=${COHORT_ID}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/learner/${LEARNER_ID}/profile?cohort_id=${COHORT_ID}`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([preread, profile]) => {
      // From preread: name, completed tasks, velocity
      if (preread) {
        const vel = preread.velocity;
        setVelocityRisk(vel?.velocity_risk ?? false);
        setCompletedTasks(preread.recent_activity?.length ?? 0);

        // Build velocity chart from prior/recent rates
        if (vel) {
          const points: VelocityPoint[] = [
            { day: "Prior", completions: Math.round(vel.tasks_per_day_prior), baseline: vel.tasks_per_day_prior },
            { day: "Recent", completions: Math.round(vel.tasks_per_day_recent), baseline: vel.tasks_per_day_prior },
          ];
          setVelocity(points);
        }
      }

      // From profile: name, scores → radar
      if (profile) {
        setName(profile.summary?.split(" has")[0] ?? "Learner");
        if (profile.scores) {
          const mapped: RadarStat[] = Object.entries(profile.scores).map(([skill, val]) => ({
            skill: skill.charAt(0).toUpperCase() + skill.slice(1).replace(/_/g, " "),
            learner: Math.round((val as number) * 10),
            cohort: 60,
          }));
          setRadar(mapped);
          setSkillAvg(Math.round(mapped.reduce((s, d) => s + d.learner, 0) / mapped.length));
        }
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [demo]);

  return (
    <div className="space-y-6">
      {loading && <div className="text-xs text-gray-400 text-center py-2">Fetching live data…</div>}
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/5 p-5 flex items-center justify-between">
        <div>
          <p className="text-indigo-400 text-xs mb-1">Welcome back</p>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{name}</h2>
          <p className="text-gray-500 dark:text-white/40 text-xs mt-1">
            {velocityRisk ? "Velocity has dropped — consider reaching out." : "Keep going — on track with the cohort."}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-3xl font-bold ${velocityRisk ? "text-red-400" : "text-indigo-400"}`}>
            {velocityRisk ? "↓" : "✓"}
          </p>
          <p className="text-xs text-gray-500 dark:text-white/40">{velocityRisk ? "velocity drop" : "on track"}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Avg Skill Score",  value: `${skillAvg}/100`,    icon: Star,       color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
          { label: "Tasks Completed",  value: completedTasks,       icon: Target,     color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20" },
          { label: "Velocity Status",  value: velocityRisk ? "At Risk" : "Stable", icon: TrendingUp, color: velocityRisk ? "text-red-400" : "text-amber-400", bg: velocityRisk ? "bg-red-500/10 border-red-500/20" : "bg-amber-500/10 border-amber-500/20" },
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
      <div className="grid grid-cols-2 gap-4">
        <SkillRadarChart data={radar} />
        <VelocityChart data={velocity} />
      </div>
    </div>
  );
}
