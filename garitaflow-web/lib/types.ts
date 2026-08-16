export type WaitStatus = 'fast' | 'moderate' | 'high' | 'critical'
export type ConfidenceLevel = 'low' | 'medium' | 'high'
export type LaneCategory = 'vehicle' | 'pedestrian' | 'pedwest'
export type LaneIcon = 'general-vehicle' | 'ready-lane' | 'sentri' | 'general-pedestrian'

export interface LaneWaitTime {
  id: string
  category: LaneCategory
  icon: LaneIcon
  name: string
  description: string
  waitMinutes: number | null
  status: WaitStatus
}

export interface BorderCrossing {
  id: string
  portCode: string
  name: string
  overallStatus: WaitStatus
  confidence: ConfidenceLevel
  confidenceScore: number
  lastUpdated: string | null
  stale: boolean
  lanes: LaneWaitTime[]
}

// Helpers
export function toWaitStatus(minutes: number | null): WaitStatus {
  if (minutes === null) return 'moderate'
  if (minutes <= 20) return 'fast'
  if (minutes <= 45) return 'moderate'
  if (minutes <= 75) return 'high'
  return 'critical'
}

export function toConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

export function getBestLane(lanes: LaneWaitTime[]): LaneWaitTime | null {
  const withData = lanes.filter(l => l.waitMinutes !== null)
  if (!withData.length) return null
  return withData.sort((a, b) => (a.waitMinutes ?? 999) - (b.waitMinutes ?? 999))[0] ?? null
}

export function getWorstLane(lanes: LaneWaitTime[]): LaneWaitTime | null {
  const withData = lanes.filter(l => l.waitMinutes !== null)
  if (!withData.length) return null
  return withData.sort((a, b) => (b.waitMinutes ?? 0) - (a.waitMinutes ?? 0))[0] ?? null
}