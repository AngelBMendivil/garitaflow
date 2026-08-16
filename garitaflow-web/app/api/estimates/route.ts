import { NextResponse } from "next/server"
import { query } from "@/lib/db"
interface EstimateRow { port_code: string; port_name: string; lane_type: string; mode: string; estimated_wait: number | null; confidence: number; status: string; calculated_at: string }
export interface LaneEstimate { laneType: string; mode: string; estimatedWait: number | null; confidence: number; status: string; calculatedAt: string }
export interface PortEstimates { portName: string; lanes: LaneEstimate[] }
export interface EstimatesResponse { updatedAt: string | null; ports: Record<string, PortEstimates>; stale: boolean }
export async function GET() {
  let rows: EstimateRow[]
  try { rows = await query<EstimateRow>(`SELECT port_code,port_name,lane_type,mode,estimated_wait,confidence,status,calculated_at::text FROM current_estimates ORDER BY port_code,mode,lane_type`) }
  catch { return NextResponse.json({ updatedAt: null, ports: {}, stale: true }, { headers: { "Cache-Control": "public, max-age=30" } }) }
  const ports: Record<string, PortEstimates> = {}
  for (const r of rows) {
    if (!ports[r.port_code]) ports[r.port_code] = { portName: r.port_name, lanes: [] }
    ports[r.port_code]!.lanes.push({ laneType: r.lane_type, mode: r.mode, estimatedWait: r.estimated_wait, confidence: r.confidence, status: r.status, calculatedAt: r.calculated_at })
  }
  let latest: Date | null = null
  for (const r of rows) { const d = new Date(r.calculated_at); if (!latest || d > latest) latest = d }
  const stale = !latest || Date.now() - latest.getTime() > 7200000
  return NextResponse.json({ updatedAt: latest?.toISOString() ?? null, ports, stale }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } })
}
