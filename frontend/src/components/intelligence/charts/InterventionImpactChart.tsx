"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LabelList,
} from "recharts";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent } from "@/components/intelligence/IntelligenceCard";
import type { Intervention } from "@/types/intelligence";

interface Props { interventions: Intervention[] }

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-3 text-xs shadow-xl">
      <p className="font-semibold text-white mb-1">{d.action}</p>
      <p className="text-green-400">✓ Positive: {d.positive}</p>
      <p className="text-red-400">✗ Negative: {d.negative}</p>
      <p className="text-indigo-400">⏳ Pending: {d.pending}</p>
      <p className="text-white/60 mt-1">Win rate: <span className="text-white font-semibold">{d.winRate}%</span></p>
    </div>
  );
};

export default function InterventionImpactChart({ interventions }: Props) {
  const map: Record<string, { positive: number; negative: number; pending: number }> = {};
  for (const iv of interventions) {
    if (!map[iv.actionType]) map[iv.actionType] = { positive: 0, negative: 0, pending: 0 };
    map[iv.actionType][iv.outcome as "positive" | "negative" | "pending"]++;
  }
  const data = Object.entries(map).map(([action, counts]) => {
    const total = counts.positive + counts.negative + counts.pending;
    return { action: action.replace(/_/g, " "), ...counts, winRate: total > 0 ? Math.round((counts.positive / total) * 100) : 0 };
  }).sort((a, b) => b.winRate - a.winRate);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Intervention Win Rate</CardTitle>
        <CardSubtitle>% of interventions that resolved within 7 days</CardSubtitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 40, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="action" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} tickLine={false} axisLine={false} width={130} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="winRate" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.winRate >= 70 ? "#22c55e" : entry.winRate >= 40 ? "#f59e0b" : "#ef4444"} />
              ))}
              <LabelList dataKey="winRate" position="right" formatter={(v: number) => `${v}%`} style={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
