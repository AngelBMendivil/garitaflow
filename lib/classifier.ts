export type WaitStatus = "GREEN" | "YELLOW" | "RED" | "UNKNOWN"
export interface StatusColors { dot: string; text: string; bg: string; border: string }
const STATUS_COLORS: Record<WaitStatus, StatusColors> = {
  GREEN:   { dot: "bg-green-500",  text: "text-green-700",  bg: "bg-green-50",  border: "border-green-200" },
  YELLOW:  { dot: "bg-yellow-500", text: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200" },
  RED:     { dot: "bg-red-500",    text: "text-red-700",    bg: "bg-red-50",    border: "border-red-200" },
  UNKNOWN: { dot: "bg-gray-300",   text: "text-gray-400",   bg: "bg-gray-50",   border: "border-gray-200" },
}
export function classify(w: number | null): WaitStatus {
  if (w === null) return "UNKNOWN"; if (w < 20) return "GREEN"; if (w < 45) return "YELLOW"; return "RED"
}
export function getColors(s: WaitStatus): StatusColors { return STATUS_COLORS[s] }
export interface EstimateForReco { portCode: string; portName: string; laneType: string; mode: string; estimatedWait: number | null; status: WaitStatus }
function laneLabel(t: string) { return t === "GENERAL" ? "General" : t === "READY" ? "Ready Lane" : "SENTRI" }
function modeLabel(m: string) { return m === "PEDESTRIAN" ? "peatonal" : "vehicular" }
export function generateRecommendation(estimates: EstimateForReco[]) {
  const valid = estimates.filter(e => e.estimatedWait !== null && e.status !== "UNKNOWN")
  if (!valid.length) return { text: "Sin datos suficientes para recomendar", isSimilar: true }
  const sorted = [...valid].sort((a, b) => (a.estimatedWait ?? Infinity) - (b.estimatedWait ?? Infinity))
  const best = sorted[0]!; const worst = sorted[sorted.length - 1]!
  const diff = (worst.estimatedWait ?? 0) - (best.estimatedWait ?? 0)
  if (diff < 10) return { text: "Ambas garitas tienen tiempo similar en este momento", isSimilar: true }
  const p = best.portCode === "SAN_YSIDRO" ? "San Ysidro" : "Otay Mesa"
  return { text: `Cruza por ${p} · ${laneLabel(best.laneType)} ${modeLabel(best.mode)} — ahorras ~${diff} min`, isSimilar: false }
}
