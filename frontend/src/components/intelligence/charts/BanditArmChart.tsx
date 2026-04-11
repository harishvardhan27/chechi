"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDemoMode } from "@/context/DemoModeContext";
import { BrainCircuit } from "lucide-react";

interface Props { cohortId: string | number }

const MOCK_BANDIT_STATE = [
  { arm: "chat_heavy", pulls: 142, reward: 0.85, ucb: 1.25, fullName: "chat_heavy" },
  { arm: "balanced", pulls: 89, reward: 0.72, ucb: 1.15, fullName: "balanced" },
  { arm: "time_sens...", pulls: 45, reward: 0.65, ucb: 1.05, fullName: "time_sensitive" },
  { arm: "llm_dom...", pulls: 20, reward: 0.40, ucb: 0.95, fullName: "llm_dominant" },
  { arm: "attempt_he...", pulls: 12, reward: 0.35, ucb: 0.80, fullName: "attempt_heavy" },
];

export default function BanditArmChart({ cohortId }: Props) {
  const { demo } = useDemoMode();
  const [data, setData] = useState(MOCK_BANDIT_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (demo) {
      setData(MOCK_BANDIT_STATE);
      setLoading(false);
      return;
    }
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/agent/bandit/state/${cohortId}`)
      .then(res => res.json())
      .then(response => {
        if (!response?.state) return;
        const armsArray = Object.entries(response.state)
          .map(([armId, data]: any) => ({
            arm: armId.length > 10 ? armId.substring(0, 8) + "..." : armId,
            fullName: armId,
            pulls: data.pull_count,
            reward: Math.round(data.avg_reward * 100) / 100,
            ucb: Math.round(data.ucb_score * 100) / 100
          }))
          .filter(a => a.pulls > 0)
          .sort((a, b) => b.ucb - a.ucb)
          .slice(0, 5); // top 5
        if (armsArray.length > 0) setData(armsArray);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [demo, cohortId]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-3 text-xs shadow-xl min-w-[140px]">
        <p className="font-semibold text-white mb-2">{d.fullName}</p>
        <div className="flex justify-between items-center mb-1">
            <span className="text-gray-400">Uses</span>
            <span className="text-purple-400 font-medium">{d.pulls}</span>
        </div>
        <div className="flex justify-between items-center mb-1">
            <span className="text-gray-400">Reward</span>
            <span className="text-emerald-400 font-medium">{d.reward}</span>
        </div>
        <div className="flex justify-between items-center">
            <span className="text-gray-400">UCB Config</span>
            <span className="text-orange-400 font-medium">{d.ucb}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[var(--card)] p-5 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
            <BrainCircuit className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white/90 leading-none">Agent Evolution Profile</h3>
          <p className="text-[10px] text-gray-500 dark:text-white/40 mt-1 leading-none uppercase tracking-wider">Top Performing RL Configurations</p>
        </div>
      </div>
      
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-xs text-gray-500">Scanning neural weights...</div>
      ) : (
        <div className="flex-1 w-full min-h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="arm" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#666' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
              <Bar yAxisId="left" dataKey="pulls" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
