export function frictionColor(score: number): string {
  if (score >= 0.75) return "#ef4444";
  if (score >= 0.50) return "#f97316";
  if (score >= 0.25) return "#eab308";
  return "#22c55e";
}

export function riskBadgeClass(level: string): string {
  switch (level) {
    case "critical": return "bg-red-500/15 text-red-400 border border-red-500/30";
    case "high":     return "bg-orange-500/15 text-orange-400 border border-orange-500/30";
    case "medium":   return "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30";
    default:         return "bg-green-500/15 text-green-400 border border-green-500/30";
  }
}

export function heatColor(pct: number): string {
  if (pct >= 75) return "#ef4444";
  if (pct >= 50) return "#f97316";
  if (pct >= 25) return "#eab308";
  return "#22c55e";
}
