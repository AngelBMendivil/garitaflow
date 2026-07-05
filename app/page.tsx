import HeaderStatus from '@/components/HeaderStatus'
import BorderCrossingView from '@/components/BorderCrossingView'
import FooterInfo from '@/components/FooterInfo'
import type { BorderCrossing, LaneWaitTime, LaneIcon } from '@/lib/types'
import { toWaitStatus, toConfidenceLevel } from '@/lib/types'
import type { EstimatesResponse } from './api/estimates/route'

export const revalidate = 60

async function getEstimates(): Promise<EstimatesResponse> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ??
      (process.env.NODE_ENV === 'production'
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : 'http://localhost:3000')
    const res = await fetch(`${base}/api/estimates`, { next: { revalidate: 60 } })
    if (!res.ok) throw new Error(`API ${res.status}`)
    return res.json() as Promise<EstimatesResponse>
  } catch {
    return { updatedAt: null, ports: {}, stale: true }
  }
}

const LANE_ICON: Record<string, LaneIcon> = {
  'GENERAL-VEHICULAR':  'general-vehicle',
  'READY-VEHICULAR':    'ready-lane',
  'SENTRI-VEHICULAR':   'sentri',
  'GENERAL-PEDESTRIAN': 'general-pedestrian',
  'READY-PEDESTRIAN':   'ready-lane',
}

const LANE_NAME: Record<string, string> = {
  GENERAL: 'General',
  READY:   'Ready Lane',
  SENTRI:  'SENTRI / NEXUS',
}

const LANE_DESC: Record<string, string> = {
  'GENERAL-VEHICULAR':  'Carril estándar',
  'READY-VEHICULAR':    'Tarjeta RFID requerida',
  'SENTRI-VEHICULAR':   'Viajero confiable',
  'GENERAL-PEDESTRIAN': 'Carril peatonal estándar',
  'READY-PEDESTRIAN':   'Tarjeta RFID requerida',
}

const PORT_ORDER = ['SAN_YSIDRO', 'OTAY']

function convertCrossing(portCode: string, port: EstimatesResponse['ports'][string]): BorderCrossing {
  const lanes: LaneWaitTime[] = port.lanes.map(l => {
    const key = `${l.laneType}-${l.mode}` as string
    return {
      id:          `${portCode}-${l.laneType}-${l.mode}`,
      category:    l.mode === 'VEHICULAR' ? 'vehicle' : 'pedestrian',
      icon:        LANE_ICON[key] ?? 'general-vehicle',
      name:        LANE_NAME[l.laneType] ?? l.laneType,
      description: LANE_DESC[key] ?? '',
      waitMinutes: l.estimatedWait,
      status:      toWaitStatus(l.estimatedWait),
    }
  })

  const avgConf = lanes.length > 0
    ? Math.round(port.lanes.reduce((s, l) => s + l.confidence, 0) / port.lanes.length)
    : 0

  const best = lanes.filter(l => l.waitMinutes !== null)
    .sort((a, b) => (a.waitMinutes ?? 0) - (b.waitMinutes ?? 0))[0]

  return {
    id:              portCode.toLowerCase().replace('_', '-'),
    portCode,
    name:            port.portName,
    overallStatus:   best ? toWaitStatus(best.waitMinutes) : 'moderate',
    confidence:      toConfidenceLevel(avgConf),
    confidenceScore: avgConf,
    lastUpdated:     null,
    stale:           false,
    lanes,
  }
}

export default async function HomePage() {
  const data = await getEstimates()

  const crossings: BorderCrossing[] = PORT_ORDER
    .filter(code => data.ports[code])
    .map(code => {
      const c = convertCrossing(code, data.ports[code]!)

      if (code === 'SAN_YSIDRO' && data.ports['PED_WEST']) {
        const pedwestLanes: LaneWaitTime[] = data.ports['PED_WEST']!.lanes.map(l => ({
          id:          `PED_WEST-${l.laneType}-${l.mode}`,
          category:    'pedwest' as const,
          icon:        (LANE_ICON[`${l.laneType}-${l.mode}`] ?? 'general-pedestrian') as LaneIcon,
          name:        LANE_NAME[l.laneType] ?? l.laneType,
          description: LANE_DESC[`${l.laneType}-${l.mode}`] ?? '',
          waitMinutes: l.estimatedWait,
          status:      toWaitStatus(l.estimatedWait),
        }))
        c.lanes = [...c.lanes, ...pedwestLanes]
      }

      return { ...c, stale: data.stale, lastUpdated: data.updatedAt }
    })

  return (
    <div className="min-h-screen bg-surface-bg">
      <div className="max-w-[480px] mx-auto min-h-screen flex flex-col shadow-sm">
        <HeaderStatus lastUpdated={data.updatedAt} stale={data.stale}/>
        <main className="flex-1">
          <BorderCrossingView crossings={crossings}/>
        </main>
        <FooterInfo/>
      </div>
    </div>
  )
}