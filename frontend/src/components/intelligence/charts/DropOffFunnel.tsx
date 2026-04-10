"use client";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent } from "@/components/intelligence/IntelligenceCard";
import type { FunnelStage } from "@/types/intelligence";

interface Props { data: FunnelStage[] }

export default function DropOffFunnel({ data }: Props) {
  const max = data[0]?.learners ?? 1;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Drop-Off Funnel</CardTitle>
        <CardSubtitle>Where learners abandon the module</CardSubtitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.map((stage, i) => {
            const widthPct = (stage.learners / max) * 100;
            const isDropping = i > 0 && stage.dropPct > 0;
            return (
              <div key={stage.stage}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-white/70">{stage.stage}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-semibold tabular-nums">{stage.learners} learners</span>
                    {isDropping && <span className="text-red-400 text-[10px]">↓ {stage.dropPct}% dropped</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-8 bg-white/5 rounded-md overflow-hidden relative">
                    <div
                      className="h-full rounded-md transition-all duration-700"
                      style={{ width: `${widthPct}%`, background: "linear-gradient(90deg, #6366f1, #8b5cf6)", opacity: 0.7 + (widthPct / 100) * 0.3 }}
                    />
                    <span className="absolute inset-0 flex items-center px-3 text-xs text-white/60">
                      {widthPct.toFixed(0)}% remaining
                    </span>
                  </div>
                </div>
                {i < data.length - 1 && <div className="flex justify-center mt-1"><div className="w-px h-2 bg-white/10" /></div>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
