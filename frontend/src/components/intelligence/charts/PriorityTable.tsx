"use client";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent } from "@/components/intelligence/IntelligenceCard";
import { frictionColor, riskBadgeClass } from "@/lib/intelligenceUtils";
import type { LearnerRisk } from "@/types/intelligence";

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const w = 80, h = 28, pad = 2;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  const lastPt = pts.split(" ").pop()!.split(",");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={lastPt[0]} cy={lastPt[1]} r={3} fill={color} />
    </svg>
  );
}

interface Props { learners: LearnerRisk[] }

export default function PriorityTable({ learners }: Props) {
  const top5 = [...learners].sort((a, b) => b.frictionScore - a.frictionScore).slice(0, 5);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 5 Priority Learners</CardTitle>
        <CardSubtitle>Sorted by friction score · Sparkline = 7-day trend</CardSubtitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/5">
              {["Learner", "Friction", "7-Day Trend", "Risk", "Velocity", "Last Active"].map(h => (
                <th key={h} className="px-5 py-2 text-left text-white/30 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {top5.map((l, i) => {
              const color = frictionColor(l.frictionScore);
              return (
                <tr key={l.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/50 font-bold">{i + 1}</span>
                      <div>
                        <p className="text-white/90 font-medium">{l.name}</p>
                        <p className="text-white/30">{l.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${l.frictionScore * 100}%`, background: color }} />
                      </div>
                      <span style={{ color }} className="font-semibold tabular-nums">{(l.frictionScore * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3"><MiniSparkline data={l.sparkline} color={color} /></td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${riskBadgeClass(l.riskLevel)}`}>{l.riskLevel}</span>
                  </td>
                  <td className="px-5 py-3">
                    {l.velocityRisk ? <span className="text-red-400">↓ Dropping</span> : <span className="text-green-400">Stable</span>}
                  </td>
                  <td className="px-5 py-3 text-white/40">{l.lastActive}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
