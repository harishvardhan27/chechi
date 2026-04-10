"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LabelList,
} from "recharts";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent } from "@/components/intelligence/IntelligenceCard";
import type { ConfusionTopic } from "@/types/intelligence";

interface Props { data: ConfusionTopic[] }

const COLORS = ["#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#10b981"];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as ConfusionTopic;
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-3 text-xs shadow-xl">
      <p className="font-semibold text-white mb-1">{d.topic}</p>
      <p className="text-white/60">{d.count} learners confused ({d.pct}%)</p>
    </div>
  );
};

export default function ConfusionTopicsChart({ data }: Props) {
  const sorted = [...data].sort((a, b) => b.pct - a.pct);
  return (
    <Card>
      <CardHeader>
        <CardTitle>LLM Confusion Topics</CardTitle>
        <CardSubtitle>Aggregated from cohort chat transcripts — what concepts are breaking learners</CardSubtitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={sorted} layout="vertical" margin={{ left: 10, right: 50, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="topic" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} tickLine={false} axisLine={false} width={120} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={18}>
              {sorted.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              <LabelList dataKey="pct" position="right" formatter={(v: number) => `${v}%`} style={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
