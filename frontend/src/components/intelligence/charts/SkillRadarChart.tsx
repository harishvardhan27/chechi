"use client";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent } from "@/components/intelligence/IntelligenceCard";
import type { RadarStat } from "@/types/intelligence";

interface Props { data: RadarStat[] }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-white font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function SkillRadarChart({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Skill Mastery Radar</CardTitle>
        <CardSubtitle>Your stats vs anonymised cohort average</CardSubtitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis dataKey="skill" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9 }} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Radar name="You" dataKey="learner" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} dot={{ fill: "#6366f1", r: 3 }} />
            <Radar name="Cohort Avg" dataKey="cohort" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 4" />
            <Legend wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }} />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
