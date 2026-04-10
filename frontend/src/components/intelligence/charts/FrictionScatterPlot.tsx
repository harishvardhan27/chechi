"use client";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Label,
} from "recharts";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent } from "@/components/intelligence/IntelligenceCard";
import { frictionColor } from "@/lib/intelligenceUtils";
import type { LearnerRisk } from "@/types/intelligence";

interface Props { learners: LearnerRisk[] }

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  const color = frictionColor(payload.frictionScore);
  const r = payload.riskLevel === "critical" ? 10 : payload.riskLevel === "high" ? 8 : 6;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 4} fill={color} opacity={0.15} />
      <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.9} />
      <text x={cx} y={cy - r - 5} textAnchor="middle" fill="#fff" fontSize={10} opacity={0.8}>
        {payload.name.split(" ")[0]}
      </text>
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as LearnerRisk;
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-3 text-xs shadow-xl">
      <p className="font-semibold text-white mb-1">{d.name}</p>
      <p className="text-white/60">Friction: <span className="text-white">{(d.frictionScore * 100).toFixed(0)}%</span></p>
      <p className="text-white/60">Effort: <span className="text-white">{(d.effortScore * 100).toFixed(0)}%</span></p>
      <p className="text-white/60 mt-1">Risk: <span className="capitalize text-orange-400">{d.riskLevel}</span></p>
      {d.reasons.length > 0 && <p className="text-white/40 mt-1 max-w-[160px]">{d.reasons[0]}</p>}
    </div>
  );
};

export default function FrictionScatterPlot({ learners }: Props) {
  const data = learners.map(l => ({ ...l, x: Math.round(l.effortScore * 100), y: Math.round(l.frictionScore * 100) }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Friction vs. Effort</CardTitle>
        <CardSubtitle>Top-right = high effort, still failing · Top-left = apathy</CardSubtitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis type="number" dataKey="x" domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} tickLine={false} axisLine={false}>
              <Label value="Effort Score (%)" position="insideBottom" offset={-15} fill="rgba(255,255,255,0.3)" fontSize={11} />
            </XAxis>
            <YAxis type="number" dataKey="y" domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} tickLine={false} axisLine={false}>
              <Label value="Friction (%)" angle={-90} position="insideLeft" offset={15} fill="rgba(255,255,255,0.3)" fontSize={11} />
            </YAxis>
            <ReferenceLine x={50} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
            <ReferenceLine y={50} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Scatter data={data} shape={<CustomDot />} />
          </ScatterChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-2 gap-2 mt-2 text-[10px] text-white/30">
          <div className="text-right pr-4">← Low effort, high friction (Apathy)</div>
          <div className="pl-4">High effort, high friction (Struggling) →</div>
        </div>
      </CardContent>
    </Card>
  );
}
