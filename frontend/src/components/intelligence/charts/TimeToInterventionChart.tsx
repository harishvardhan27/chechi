"use client";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Area, AreaChart,
} from "recharts";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent } from "@/components/intelligence/IntelligenceCard";
import type { InterventionTiming } from "@/types/intelligence";

interface Props { data: InterventionTiming[] }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-white/60 mb-1">{label}</p>
      <p className="text-indigo-400 font-semibold">{payload[0].value} min avg response</p>
    </div>
  );
};

export default function TimeToInterventionChart({ data }: Props) {
  const avg = Math.round(data.reduce((s, d) => s + d.avgMinutes, 0) / data.length);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Time-to-Intervention</CardTitle>
        <CardSubtitle>Avg minutes from High Severity alert → mentor sends message · 7-day avg: {avg} min</CardSubtitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="interventionGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}m`} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={avg} stroke="rgba(99,102,241,0.4)" strokeDasharray="4 4" label={{ value: `Avg ${avg}m`, fill: "rgba(99,102,241,0.7)", fontSize: 10 }} />
            <Area type="monotone" dataKey="avgMinutes" stroke="#6366f1" strokeWidth={2} fill="url(#interventionGrad)" dot={{ fill: "#6366f1", r: 3 }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
