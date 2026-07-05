import { NextRequest, NextResponse } from "next/server"
import { pool, query } from "@/lib/db"
import { fetchCbpWaitTimes } from "@/lib/cbp"
import { calculateEstimate } from "@/lib/estimator"
import { classify } from "@/lib/classifier"
interface LTRow { id: number; port_code: string; lane_type: string; mode: string }
interface HARow { avg_wait: string | null; sample_count: number }
function auth(req: NextRequest) { const s = process.env.CRON_SECRET; return !!s && req.headers.get("authorization") === `Bearer ${s}` }
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const t0 = Date.now()
  let readings: Awaited<ReturnType<typeof fetchCbpWaitTimes>>
  try { readings = await fetchCbpWaitTimes() } catch (e) { return NextResponse.json({ success: false, error: String(e) }, { status: 503 }) }
  const lts = await query<LTRow>(`SELECT lt.id,p.code AS port_code,lt.lane_type,lt.mode FROM lane_types lt JOIN ports p ON p.id=lt.port_id WHERE lt.is_active=true`)
  const idx = new Map(lts.map(r => [`${r.port_code}|${r.lane_type}|${r.mode}`, r.id]))
  let processed = 0; const client = await pool.connect()
  try {
    await client.query("BEGIN")
    for (const rd of readings) {
      const lid = idx.get(`${rd.portCode}|${rd.laneType}|${rd.mode}`); if (!lid) continue
      await client.query(`INSERT INTO wait_snapshots(lane_type_id,wait_minutes,lanes_open,cbp_updated)VALUES($1,$2,$3,$4)`, [lid,rd.waitMinutes,rd.lanesOpen,rd.cbpUpdated])
      const now = new Date(new Date().toLocaleString("en-US",{timeZone:"America/Los_Angeles"}))
      const dow = now.getDay(); const hod = now.getHours()
      const hr = await client.query<HARow>(`SELECT avg_wait,sample_count FROM hourly_averages WHERE lane_type_id=$1 AND day_of_week=$2 AND hour_of_day=$3`,[lid,dow,hod])
      const hist = hr.rows[0] ?? null; const ha = hist?.avg_wait ? parseFloat(hist.avg_wait) : null
      const age = rd.cbpUpdated ? (Date.now()-rd.cbpUpdated.getTime())/60000 : Infinity
      const { estimatedWait, confidence } = calculateEstimate(rd.waitMinutes, ha, age)
      if (estimatedWait === null) continue
      await client.query(`INSERT INTO estimates(lane_type_id,estimated_wait,confidence,status)VALUES($1,$2,$3,$4)`,[lid,estimatedWait,confidence,classify(estimatedWait)])
      if (rd.waitMinutes !== null) await client.query(`INSERT INTO hourly_averages(lane_type_id,day_of_week,hour_of_day,avg_wait,sample_count,updated_at)VALUES($1,$2,$3,$4,1,NOW())ON CONFLICT(lane_type_id,day_of_week,hour_of_day)DO UPDATE SET avg_wait=(hourly_averages.avg_wait*hourly_averages.sample_count+$4)/(hourly_averages.sample_count+1),sample_count=hourly_averages.sample_count+1,updated_at=NOW()`,[lid,dow,hod,rd.waitMinutes])
      processed++
    }
    await client.query("COMMIT")
  } catch(e) { await client.query("ROLLBACK"); throw e } finally { client.release() }
  return NextResponse.json({ success: true, processed, timestamp: new Date().toISOString(), durationMs: Date.now()-t0 })
}
