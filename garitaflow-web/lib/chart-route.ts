import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

interface HourPoint { hour: number; avg: number | null; today: number | null }

function buildPoints(
  avgRows:   { hour: number; avg_wait: number }[],
  todayRows: { hour: number; wait: number }[]
): HourPoint[] {
  const avgMap:   Record<number, number> = {}
  const todayMap: Record<number, number> = {}
  avgRows.forEach(r   => { avgMap[r.hour]   = r.avg_wait })
  todayRows.forEach(r => { todayMap[r.hour] = r.wait })
  return Array.from({ length: 24 }, (_, h) => ({
    hour:  h,
    avg:   avgMap[h]   ?? null,
    today: todayMap[h] ?? null,
  }))
}

function avgQuery(laneType: string) {
  return `
    SELECT EXTRACT(HOUR FROM ws.recorded_at AT TIME ZONE $3)::int AS hour,
           ROUND(AVG(ws.wait_minutes))::int                       AS avg_wait
    FROM wait_snapshots ws
    JOIN lane_types lt ON lt.id = ws.lane_type_id
    JOIN ports      p  ON p.id  = lt.port_id
    WHERE p.code          = $1
      AND lt.mode         = 'VEHICULAR'
      AND lt.lane_type    = '${laneType}'
      AND ws.wait_minutes IS NOT NULL
      AND ws.recorded_at  > NOW() - INTERVAL '30 days'
      AND EXTRACT(DOW FROM ws.recorded_at AT TIME ZONE $3) = $2
    GROUP BY hour
    ORDER BY hour
  `
}

function todayQuery(laneType: string) {
  return `
    SELECT EXTRACT(HOUR FROM ws.recorded_at AT TIME ZONE $3)::int AS hour,
           ROUND(AVG(ws.wait_minutes))::int                       AS wait
    FROM wait_snapshots ws
    JOIN lane_types lt ON lt.id = ws.lane_type_id
    JOIN ports      p  ON p.id  = lt.port_id
    WHERE p.code          = $1
      AND lt.mode         = 'VEHICULAR'
      AND lt.lane_type    = '${laneType}'
      AND ws.wait_minutes IS NOT NULL
      AND (ws.recorded_at AT TIME ZONE $3)::date = (NOW() AT TIME ZONE $3)::date
    GROUP BY hour
    ORDER BY hour
  `
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const portCode = searchParams.get('portCode') ?? 'SAN_YSIDRO'
  const dow      = parseInt(searchParams.get('dow') ?? '1')
  const timezone = searchParams.get('timezone') ?? 'America/Los_Angeles'

  try {
    const [genAvg, genToday, readAvg, readToday, senAvg, senToday] = await Promise.all([
      query<{ hour: number; avg_wait: number }>(avgQuery('GENERAL'), [portCode, dow, timezone]),
      query<{ hour: number; wait: number }>    (todayQuery('GENERAL'), [portCode, dow, timezone]),
      query<{ hour: number; avg_wait: number }>(avgQuery('READY'),   [portCode, dow, timezone]),
      query<{ hour: number; wait: number }>    (todayQuery('READY'),  [portCode, dow, timezone]),
      query<{ hour: number; avg_wait: number }>(avgQuery('SENTRI'),   [portCode, dow, timezone]),
      query<{ hour: number; wait: number }>    (todayQuery('SENTRI'),  [portCode, dow, timezone]),
    ])

    return NextResponse.json({
      general: buildPoints(genAvg,   genToday),
      ready:   buildPoints(readAvg,  readToday),
      sentri:  buildPoints(senAvg,   senToday),
    })
  } catch (err) {
    console.error('[/api/chart]', err)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}
