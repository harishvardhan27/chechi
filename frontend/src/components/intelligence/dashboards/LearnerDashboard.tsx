"use client";
import { useEffect, useState } from "react";
import SkillRadarChart from "@/components/intelligence/charts/SkillRadarChart";
import VelocityChart from "@/components/intelligence/charts/VelocityChart";
import { mockRadarStats as RADAR_DATA, mockVelocityPoints as VELOCITY_DATA, mockLearnerRisks as LEARNERS } from "@/lib/intelligenceMockData";
import { useDemoMode } from "@/context/DemoModeContext";
import type { RadarStat, VelocityPoint } from "@/types/intelligence";
import { Star, TrendingUp, Target } from "lucide-react";

const LEARNER_ID = 3;
const COHORT_ID = 10;

const me = LEARNERS.find(l => l.id === 2)!;
const avgSkill = Math.round(RADAR_DATA.reduce((s, d) => s + d.learner, 0) / RADAR_DATA.length);

export default function LearnerDashboard() {
  const { demo } = useDemoMode();
  const [radar, setRadar] = useState<RadarStat[]>(RADAR_DATA);
  const [velocity, setVelocity] = useState<VelocityPoint[]>(VELOCITY_DATA);
  const [name, setName] = useState(me.name);
  const [streak, setStreak] = useState(5);
  const [completedTasks, setCompletedTasks] = useState(3);
  const [skillAvg, setSkillAvg] = useState(avgSkill);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (demo) {
      setRadar(RADAR_DATA); setVelocity(VELOCITY_DATA);
      setName(me.name); setStreak(5); setCompletedTasks(3); setSkillAvg(avgSkill);
      return;
    }
    const safeFetch = (url: string) => fetch(url).then(r => r.ok ? r.json() : null).catch(() => null);
    setLoading(true);
    Promise.all([
      safeFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/learner/${LEARNER_ID}/preread?cohort_id=${COHORT_ID}`),
      safeFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/intelligence/learner/${LEARNER_ID}/velocity?cohort_id=${COHORT_ID}`),
    ])
      .then(([preread, vel]) => {
        if (!preread && !vel) return;
        if (preread.name) setName(preread.name);
        if (preread.tasks_completed != null) setCompletedTasks(preread.tasks_completed);

        // Map velocity points
        const points: VelocityPoint[] = (vel.daily_completions ?? []).map((d: any, i: number) => ({
          day: `Day ${i + 1}`,
          completions: d.count ?? d.completions ?? 0,
          baseline: vel.tasks_per_day_prior ?? 3,
        }));
        if (points.length) setVelocity(points);

        // Build radar from preread scores if available
        if (preread.scores) {
          const mapped: RadarStat[] = Object.entries(preread.scores).map(([skill, val]) => ({
            skill: skill.charAt(0).toUpperCase() + skill.slice(1).replace(/_/g, " "),
            learner: Math.round((val as number) * 10),
            cohort: 60,
          }));
          setRadar(mapped);
          setSkillAvg(Math.round(mapped.reduce((s, d) => s + d.learner, 0) / mapped.length));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [demo]);

  return (
    <div className="space-y-6">
      {loading && <div className="text-xs text-white/30 text-center py-2">Fetching live data…</div>}
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 flex items-center justify-between">
        <div>
          <p className="text-white/40 text-xs mb-1">Welcome back</p>
          <h2 className="text-xl font-semibold text-white">{name}</h2>
          <p className="text-white/40 text-xs mt-1">Keep going — you&apos;re ahead of the cohort average on 4 of 6 skills.</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-indigo-400">{streak}</p>
          <p className="text-xs text-white/40">day streak 🔥</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Avg Skill Score", value: `${skillAvg}/100`, icon: Star,       color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
          { label: "Tasks Completed", value: completedTasks,    icon: Target,     color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20" },
          { label: "vs Cohort Avg",   value: "+14pts",          icon: TrendingUp, color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20" },
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
      <div className="grid grid-cols-2 gap-4">
        <SkillRadarChart data={radar} />
        <VelocityChart data={velocity} />
      </div>
    </div>
  );
}
