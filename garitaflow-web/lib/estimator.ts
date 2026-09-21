export interface EstimateResult { estimatedWait: number | null; confidence: number }
export function calculateEstimate(cbpWait: number | null, historicalAvg: number | null, dataAgeMinutes: number): EstimateResult {
  // Regla única (ver lib/wait-source.ts en GaritaFlow-API-2.0): la lectura de
  // CBP tal cual si tiene menos de 60 min; si no, el promedio histórico. Antes
  // se mezclaba 70% CBP + 30% histórico: un backtest de 2.5 meses mostró que
  // eso duplicaba el error y escondía justo las anomalías. La comunidad no
  // entra aquí porque el scraper no la conoce; la agrega el API.
  const cbpVigente = cbpWait !== null && dataAgeMinutes < 60
  let estimatedWait: number | null = null
  if (cbpVigente) estimatedWait = cbpWait
  else if (historicalAvg !== null) estimatedWait = Math.round(historicalAvg)
  let confidence: number
  if (!cbpVigente) confidence = 25
  else if (dataAgeMinutes < 10) confidence = 85
  else if (dataAgeMinutes < 30) confidence = 65
  else if (dataAgeMinutes < 60) confidence = 40
  else confidence = 25
  return { estimatedWait, confidence }
}
