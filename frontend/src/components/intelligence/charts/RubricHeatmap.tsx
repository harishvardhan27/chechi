"use client";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent } from "@/components/intelligence/IntelligenceCard";
import { heatColor } from "@/lib/intelligenceUtils";
import type { RubricCell } from "@/types/intelligence";

interface Props { data: RubricCell[] }

export default function RubricHeatmap({ data }: Props) {
  const tasks = [...new Set(data.map(d => d.taskTitle))];
  const criteria = [...new Set(data.map(d => d.criterion))];
  const lookup = new Map(data.map(d => [`${d.taskTitle}||${d.criterion}`, d.weaknessPct]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rubric Weakness Heatmap</CardTitle>
        <CardSubtitle>Red = majority of learners failing this criterion on this task</CardSubtitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="text-left text-white/30 font-medium pb-2 pr-4 min-w-[160px]">Task</th>
                {criteria.map(c => (
                  <th key={c} className="text-center text-white/40 font-medium pb-2 px-2 min-w-[90px]">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr key={task}>
                  <td className="text-white/70 pr-4 py-1 font-medium text-[11px] leading-tight max-w-[160px]">{task}</td>
                  {criteria.map(criterion => {
                    const pct = lookup.get(`${task}||${criterion}`) ?? 0;
                    const bg = heatColor(pct);
                    return (
                      <td key={criterion} className="text-center py-1 px-1">
                        <div
                          className="rounded-md py-2 px-1 font-semibold transition-all hover:scale-105 cursor-default"
                          style={{ background: `${bg}22`, border: `1px solid ${bg}44`, color: bg }}
                          title={`${task} · ${criterion}: ${pct}% failing`}
                        >
                          {pct}%
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-4 mt-4 text-[10px] text-white/30">
          {[["#22c55e", "< 25% (Good)"], ["#eab308", "25–50% (Watch)"], ["#f97316", "50–75% (Concern)"], ["#ef4444", "> 75% (Critical)"]].map(([c, l]) => (
            <div key={l} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: c }} />
              <span>{l}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
