"use client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent } from "@/components/intelligence/IntelligenceCard";
import type { VelocityPoint } from "@/types/intelligence";

interface Props { data: VelocityPoint[] }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const completions = payload.find((p: any) => p.dataKey === "completions")?.value ?? 0;
  const baseline = payload.find((p: any) => p.dataKey === "baseline")?.value ?? 0;
  const delta = completions - baseline;
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-white/60 mb-1">{label}</p>
      <p className="text-indigo-400">Completions: <span className="font-semibold text-white">{completions}</span></p>
      <p className="text-amber-400">Baseline: <span className="font-semibold text-white">{baseline}</span></p>
      <p className={`mt-1 font-semibold ${delta >= 0 ? "text-green-400" : "text-red-400"}`}>
        {delta >= 0 ? "+" : ""}{delta.toFixed(1)} vs baseline
      </p>
    </div>
  );
};

export default function VelocityChart({ data }: Props) {
  const recent = data.slice(-7);
  const recentAvg = recent.reduce((s, d) => s + d.completions, 0) / recent.length;
  const isSlowing = recentAvg < data[0].baseline;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Learning Velocity</CardTitle>
        <CardSubtitle>
          Daily completions vs your personal baseline ·{" "}
          <span className={isSlowing ? "text-red-400" : "text-green-400"}>
            {isSlowing ? "⚠ Slowing down" : "✓ On track"}
          </span>
        </CardSubtitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} tickLine={false} axisLine={false} interval={1} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="baseline" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 5" fill="transparent" dot={false} />
            <Area type="monotone" dataKey="completions" stroke="#6366f1" strokeWidth={2} fill="url(#velocityGrad)" dot={{ fill: "#6366f1", r: 3 }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
        {isSlowing && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            ⚠ Your completion pace has dropped below your baseline. Consider reviewing your schedule before burnout hits.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
