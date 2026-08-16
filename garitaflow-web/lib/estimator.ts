export interface EstimateResult { estimatedWait: number | null; confidence: number }
export function calculateEstimate(cbpWait: number | null, historicalAvg: number | null, dataAgeMinutes: number): EstimateResult {
  let estimatedWait: number | null = null
  if (cbpWait !== null && historicalAvg !== null) estimatedWait = Math.round(cbpWait * 0.7 + historicalAvg * 0.3)
  else if (cbpWait !== null) estimatedWait = cbpWait
  else if (historicalAvg !== null) estimatedWait = Math.round(historicalAvg * 1.1)
  let confidence: number
  if (cbpWait === null) confidence = 25
  else if (dataAgeMinutes < 10) confidence = 85
  else if (dataAgeMinutes < 30) confidence = 65
  else if (dataAgeMinutes < 60) confidence = 40
  else confidence = 25
  return { estimatedWait, confidence }
}
