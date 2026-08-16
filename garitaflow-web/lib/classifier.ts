export type WaitStatus = "GREEN" | "YELLOW" | "RED" | "UNKNOWN"

// Umbrales absolutos. Se usan como respaldo cuando no hay histórico confiable.
export function classifyAbsolute(w: number | null): WaitStatus {
  if (w === null) return "UNKNOWN"
  if (w < 20) return "GREEN"
  if (w < 45) return "YELLOW"
  return "RED"
}

// Clasificación relativa: compara contra el promedio de ese día y hora.
// Un San Ysidro de 90 min es buena noticia si lo normal son 120.
// Requiere al menos 5 muestras históricas para ser confiable.
const MIN_SAMPLES = 5
const BAND = 0.15   // ±15% se considera "como siempre"

export function classifyRelative(
  wait: number | null,
  historicalAvg: number | null,
  sampleCount: number
): WaitStatus {
  if (wait === null) return "UNKNOWN"
  if (historicalAvg === null || sampleCount < MIN_SAMPLES) {
    return classifyAbsolute(wait)
  }

  const ratio = wait / historicalAvg
  if (ratio <= 1 - BAND) return "GREEN"
  if (ratio >= 1 + BAND) return "RED"
  return "YELLOW"
}

// Texto para el usuario: explica el color en vez de repetir el número.
export function relativeLabel(
  wait: number | null,
  historicalAvg: number | null,
  sampleCount: number
): string {
  if (wait === null) return "Sin datos"
  if (historicalAvg === null || sampleCount < MIN_SAMPLES) {
    return classifyAbsolute(wait) === "GREEN" ? "Fluyendo bien"
      : classifyAbsolute(wait) === "YELLOW" ? "Tráfico moderado"
      : "Congestionado"
  }

  const diff = Math.round(wait - historicalAvg)
  if (Math.abs(diff) < historicalAvg * BAND) return "Como de costumbre"
  return diff < 0
    ? `${Math.abs(diff)} min menos de lo normal`
    : `${diff} min más de lo normal`
}