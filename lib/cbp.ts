const MONITORED_PORTS = {
  '250401': 'SAN_YSIDRO',
  '250601': 'OTAY',
  '250407': 'PED_WEST',
}

const CBP_URL = 'https://bwt.cbp.gov/api/waittimes'
const FETCH_TIMEOUT_MS = 10_000

function parseIntOrNull(value: unknown) {
  if (value == null) return null
  const str = String(value).trim()
  if (str === '' || str.toUpperCase() === 'N/A' || str === '0') return null
  const n = parseInt(str, 10)
  return isNaN(n) ? null : n
}

function readLane(lane) {
  if (!lane) return { wait: null, open: null }
  return {
    wait: parseIntOrNull(lane.delay_minutes),
    open: parseIntOrNull(lane.lanes_open),
  }
}

export async function fetchCbpWaitTimes() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let data
  try {
    const response = await fetch(CBP_URL, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    clearTimeout(timer)
    if (!response.ok) throw new Error(`CBP respondio con status ${response.status}`)
    data = await response.json()
  } catch (err) {
    clearTimeout(timer)
    throw new Error(`Error al contactar CBP API: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (!Array.isArray(data)) throw new Error('CBP API no retorno un array JSON valido')

  const readings = []

  for (const port of data) {
    const portNumber = String(port?.port_number ?? '').trim()
    if (!portNumber || !(portNumber in MONITORED_PORTS)) continue

    const portCode = MONITORED_PORTS[portNumber]
    const dateStr = port.date && port.time ? `${port.date} ${port.time}` : null
    const cbpUpdated = dateStr ? new Date(dateStr) : null

    const buildReading = (laneData, laneType, mode) => {
      const { wait, open } = readLane(laneData)
      if (wait === null && open === null) return null
      return { portCbpId: portNumber, portCode, laneType, mode, waitMinutes: wait, lanesOpen: open, cbpUpdated }
    }

    const veh = port.passenger_vehicle_lanes
    if (veh) {
      const stdV   = buildReading(veh.standard_lanes,      'GENERAL', 'VEHICULAR')
      const readyV = buildReading(veh.ready_lanes,         'READY',   'VEHICULAR')
      const sentriV = buildReading(veh.NEXUS_SENTRI_lanes, 'SENTRI',  'VEHICULAR')
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
