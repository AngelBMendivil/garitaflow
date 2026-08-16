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
 *   240202 → ELPASO2     (El Paso — Bridge of Americas)
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

/**
 * CBP entrega `date` + `time` en la HORA LOCAL DE CADA GARITA, y el JSON no
 * incluye la zona horaria. `new Date("8/16/2026 13:33:16")` los interpretaba en
 * la zona del servidor —UTC en Railway— así que una lectura del Pacífico recién
 * salida aparecía con 7 h de antigüedad. Eso disparaba el piso de confianza de
 * 25% en `calculateEstimate()` de forma permanente, y la app mostraba
 * "hace 7h" aunque el scrape acabara de correr. En invierno serían 8 h.
 *
 * No se usa un mapa garita→zona horaria a propósito: CBP reporta Nogales en
 * UTC-6 aunque Arizona no aplica horario de verano, así que un mapa basado en
 * la geografía real fallaría justo ahí.
 *
 * En vez de eso se infiere el offset: CBP se refresca a lo mucho cada hora, así
 * que de los offsets continentales candidatos solo uno produce una antigüedad
 * plausible. Si ninguno cuadra se devuelve null y el estimador ya trata la
 * lectura como poco confiable, en vez de inventar una hora.
 */
const CANDIDATE_OFFSETS_H = [4, 5, 6, 7, 8, 9, 10] // Este → Hawái, todos UTC-N
const MAX_PLAUSIBLE_AGE_MIN = 180
const CLOCK_SKEW_TOLERANCE_MIN = 10

export function parseCbpTimestamp(
  date: unknown,
  time: unknown,
  now: Date = new Date()
): Date | null {
  if (!date || !time) return null

  // "8/16/2026" + "13:33:16" → partes numéricas, sin depender del locale del server.
  const d = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(date).trim())
  const t = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(time).trim())
  if (!d || !t) return null

  const mm = Number(d[1]), dd = Number(d[2]), yyyy = Number(d[3])
  const hh = Number(t[1]), mi = Number(t[2]), ss = Number(t[3] ?? 0)
  if ([mm, dd, yyyy, hh, mi, ss].some(Number.isNaN)) return null

  let best: { at: Date; age: number } | null = null
  for (const off of CANDIDATE_OFFSETS_H) {
    // La hora local declarada, reinterpretada como si fuera UTC-off.
    const at = new Date(Date.UTC(yyyy, mm - 1, dd, hh + off, mi, ss))
    const age = (now.getTime() - at.getTime()) / 60000
    // Se descartan los futuros (más allá del margen de desfase de reloj) y los
    // demasiado viejos; de los que quedan gana el más reciente.
    if (age < -CLOCK_SKEW_TOLERANCE_MIN || age > MAX_PLAUSIBLE_AGE_MIN) continue
    if (!best || age < best.age) best = { at, age }
  }

  return best?.at ?? null
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
    const cbpUpdated = parseCbpTimestamp(port.date, port.time)

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
