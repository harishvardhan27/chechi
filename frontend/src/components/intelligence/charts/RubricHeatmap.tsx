"use client";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { heatColor } from "@/lib/intelligenceUtils";
import type { RubricCell } from "@/types/intelligence";

interface Props { data: RubricCell[] }

export default function RubricHeatmap({ data }: Props) {
  const [refreshing, setRefreshing] = useState(false);

  const tasks = [...new Set(data.map(d => d.taskTitle))];
  const criteria = [...new Set(data.map(d => d.criterion))];
  const lookup = new Map(data.map(d => [`${d.taskTitle}||${d.criterion}`, d.weaknessPct]));

  // count criteria below 60% cohort average (weakness pct >= 60 means failing)
  const weakCount = data.filter(d => d.weaknessPct >= 60).length;

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-orange-400" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Rubric weakness heatmap</h3>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 ml-4">
        Cohort-average scores per rubric criterion per task. Red = systemic skill gap.
      </p>

      {/* Card */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Rubric weakness heatmap</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {weakCount} of {data.length} criteria below 60% cohort average
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-left px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium w-48">Criterion</th>
                {tasks.map(task => (
                  <th key={task} className="text-left px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium min-w-[120px]">
                    {task.length > 14 ? task.slice(0, 14) + "\u2026" : task}
                  </th>
                ))}
                <th className="text-right px-4 py-2.5 text-gray-500 dark:text-gray-400 font-medium w-16">Avg</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map(criterion => {
                const vals = tasks.map(t => lookup.get(`${t}||${criterion}`) ?? 0);
                const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
                return (
                  <tr key={criterion} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">{criterion}</td>
                    {tasks.map(task => {
                      const pct = lookup.get(`${task}||${criterion}`) ?? 0;
                      const color = heatColor(pct);
                      const isEmpty = pct === 0;
                      return (
                        <td key={task} className="px-4 py-3">
                          {isEmpty ? (
                            <div className="w-8 h-6 flex items-center justify-center rounded bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 text-xs">
                              —
                            </div>
                          ) : (
                            <div
                              className="inline-flex items-center justify-center w-8 h-6 rounded text-[10px] font-semibold"
                              style={{ background: `${color}22`, border: `1px solid ${color}55`, color }}
                              title={`${task} · ${criterion}: ${pct}% failing`}
                            >
                              {pct}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right">
                      <div
                        className="inline-flex items-center justify-center w-8 h-6 rounded text-[10px] font-semibold ml-auto"
                        style={{ background: `${heatColor(avg)}22`, border: `1px solid ${heatColor(avg)}55`, color: heatColor(avg) }}
                      >
                        {avg}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
