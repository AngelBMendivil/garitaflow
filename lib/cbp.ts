/**
 * lib/cbp.ts — Fetch y parseo del JSON público de CBP (U.S. Customs and Border Protection)
 *
 * Fuente: https://bwt.cbp.gov/api/waittimes
 * No requiere API key. Actualizado ~cada 5-15 minutos por CBP.
 * Formato: JSON array de puertos.
 *
 * Puertos monitoreados (cbp_id → port_code interno):
 *   250401 → SAN_YSIDRO  (San Ysidro — vehicular + peatonal)
 *   250601 → OTAY        (Otay Mesa — vehicular + peatonal)
 *   250407 → PED_WEST    (San Ysidro PedWest — solo peatonal)
 *   250501 → TECATE      (Tecate)
 *   250301 → MEXICALI1   (Calexico East / Mexicali II)
 *   250302 → MEXICALI2   (Calexico West / Mexicali I)
 *   260402 → NOGALES1    (Nogales — Mariposa)
 *   260401 → NOGALES2    (Nogales — Deconcini)
 *   240203 → ELPASO1     (El Paso — Ysleta)
 *   240221 → ELPASO2     (El Paso — Bridge of Americas)
 *   240204 → ELPASO3     (El Paso — Stanton DCL)
 *   230401 → LAREDO1     (Laredo — Bridge I / Gateway)
 *   230403 → LAREDO2     (Laredo — Colombia Solidarity)
 */
const MONITORED_PORTS: Record<string, string> = {
  '250401': 'SAN_YSIDRO',
  '250601': 'OTAY',
  '250407': 'PED_WEST',
  '250501': 'TECATE',
  '250301': 'MEXICALI1',
  '250302': 'MEXICALI2',
  '260402': 'NOGALES1',
  '260401': 'NOGALES2',
  '240203': 'ELPASO1',
  '240221': 'ELPASO2',
  '240204': 'ELPASO3',
  '230401': 'LAREDO1',
  '230403': 'LAREDO2',
}

const CBP_URL = 'https://bwt.cbp.gov/api/waittimes'
const FETCH_TIMEOUT_MS = 10_000

export type LaneType = 'GENERAL' | 'READY' | 'SENTRI'
export type LaneMode = 'VEHICULAR' | 'PEDESTRIAN'

export interface CbpReading {
  portCbpId: string
  portCode: string
  laneType: LaneType
  mode: LaneMode
  waitMinutes: number | null
  lanesOpen: number | null
  cbpUpdated: Date | null
}

function parseIntOrNull(value: unknown): number | null {
  if (value == null) return null
  const str = String(value).trim()
  if (str === '' || str.toUpperCase() === 'N/A' || str === '0') return null
  const n = parseInt(str, 10)
  return isNaN(n) ? null : n
}

interface CbpLaneData {
  delay_minutes?: string | number
  lanes_open?: string | number
  operational_status?: string
}

function readLane(lane: CbpLaneData | undefined): { wait: number | null; open: number | null } {
  if (!lane) return { wait: null, open: null }
  return {
    wait: parseIntOrNull(lane.delay_minutes),
    open: parseIntOrNull(lane.lanes_open),
  }
}

export async function fetchCbpWaitTimes(): Promise<CbpReading[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any[]
  try {
    const response = await fetch(CBP_URL, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    clearTimeout(timer)
    if (!response.ok) {
      throw new Error(`CBP respondió con status ${response.status}`)
    }
    data = await response.json()
  } catch (err) {
    clearTimeout(timer)
    throw new Error(
      `Error al contactar CBP API: ${err instanceof Error ? err.message : String(err)}`
    )
  }

  if (!Array.isArray(data)) {
    throw new Error('CBP API no retornó un array JSON válido')
  }

  const readings: CbpReading[] = []

  for (const port of data) {
    const portNumber = String(port?.port_number ?? '').trim()
    if (!portNumber || !(portNumber in MONITORED_PORTS)) continue

    const portCode = MONITORED_PORTS[portNumber] as string
    const dateStr = port.date && port.time ? `${port.date} ${port.time}` : null
    const cbpUpdated = dateStr ? new Date(dateStr) : null

    const buildReading = (
      laneData: CbpLaneData | undefined,
      laneType: LaneType,
      mode: LaneMode
    ): CbpReading | null => {
      const { wait, open } = readLane(laneData)
      if (wait === null && open === null) return null
      return { portCbpId: portNumber, portCode, laneType, mode, waitMinutes: wait, lanesOpen: open, cbpUpdated }
    }

    const veh = port.passenger_vehicle_lanes
    if (veh) {
      const stdV    = buildReading(veh.standard_lanes,      'GENERAL', 'VEHICULAR')
      const readyV  = buildReading(veh.ready_lanes,         'READY',   'VEHICULAR')
      const sentriV = buildReading(veh.NEXUS_SENTRI_lanes,  'SENTRI',  'VEHICULAR')
      if (stdV)    readings.push(stdV)
      if (readyV)  readings.push(readyV)
      if (sentriV) readings.push(sentriV)
    }

    const ped = port.pedestrian_lanes
    if (ped) {
      const stdP   = buildReading(ped.standard_lanes, 'GENERAL', 'PEDESTRIAN')
      const readyP = buildReading(ped.ready_lanes,    'READY',   'PEDESTRIAN')
      if (stdP)   readings.push(stdP)
      if (readyP) readings.push(readyP)
    }
  }

  return readings
}
