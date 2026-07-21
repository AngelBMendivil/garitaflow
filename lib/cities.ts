export interface CityPort {
  code:   string
  name:   string
  cbpId:  number
  coords: string
}

export interface City {
  key:      string
  label:    string
  state:    string
  timezone: string
  tzLabel:  string
  ports:    CityPort[]
}

export const CITIES: City[] = [
  {
    key: 'tijuana', label: 'Tijuana', state: 'Baja California',
    timezone: 'America/Los_Angeles', tzLabel: 'Hora del Pacífico',
    ports: [
      { code: 'SAN_YSIDRO', name: 'San Ysidro',  cbpId: 250401, coords: 'San Diego, CA'  },
      { code: 'OTAY',       name: 'Otay Mesa',    cbpId: 250601, coords: 'Otay Mesa, CA'  },
    ],
  },
  {
    key: 'tecate', label: 'Tecate', state: 'Baja California',
    timezone: 'America/Los_Angeles', tzLabel: 'Hora del Pacífico',
    ports: [
      { code: 'TECATE', name: 'Tecate', cbpId: 250201, coords: 'Tecate, CA' },
    ],
  },
  {
    key: 'mexicali', label: 'Mexicali', state: 'Baja California',
    timezone: 'America/Los_Angeles', tzLabel: 'Hora del Pacífico',
    ports: [
      { code: 'MEXICALI1', name: 'Mexicali — Garita 1', cbpId: 250301, coords: 'Calexico West, CA' },
      { code: 'MEXICALI2', name: 'Mexicali — Garita 2', cbpId: 250302, coords: 'Calexico East, CA' },
    ],
  },
  {
    key: 'nogales', label: 'Nogales', state: 'Sonora',
    timezone: 'America/Phoenix', tzLabel: 'Hora de Arizona (sin cambio de horario)',
    ports: [
      { code: 'NOGALES1', name: 'Nogales — Mariposa',   cbpId: 260601, coords: 'Nogales, AZ' },
      { code: 'NOGALES2', name: 'Nogales — DeConcini',  cbpId: 260602, coords: 'Nogales, AZ' },
    ],
  },
  {
    key: 'juarez', label: 'Cd. Juárez', state: 'Chihuahua',
    timezone: 'America/Denver', tzLabel: 'Hora de la Montaña',
    ports: [
      { code: 'ELPASO1', name: 'El Paso — Ysleta',             cbpId: 240401, coords: 'El Paso, TX' },
      { code: 'ELPASO2', name: 'El Paso — Bridge of Americas', cbpId: 240601, coords: 'El Paso, TX' },
      { code: 'ELPASO3', name: 'El Paso — Stanton',            cbpId: 240301, coords: 'El Paso, TX' },
    ],
  },
  {
    key: 'laredo', label: 'Nuevo Laredo', state: 'Tamaulipas',
    timezone: 'America/Chicago', tzLabel: 'Hora del Centro',
    ports: [
      { code: 'LAREDO1', name: 'Laredo — Gateway to the Americas', cbpId: 230101, coords: 'Laredo, TX' },
      { code: 'LAREDO2', name: 'Laredo — Colombia Solidarity',     cbpId: 230201, coords: 'Laredo, TX' },
    ],
  },
]

// Mapeo timezone → ciudad por defecto
const TZ_TO_CITY: Record<string, string> = {
  'America/Los_Angeles': 'tijuana',
  'America/Tijuana':     'tijuana',
  'America/Phoenix':     'nogales',
  'America/Denver':      'juarez',
  'America/Boise':       'juarez',
  'America/Chicago':     'laredo',
  'America/Monterrey':   'laredo',
  'America/Matamoros':   'laredo',
}

export function detectCityKey(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return TZ_TO_CITY[tz] ?? 'tijuana'
  } catch {
    return 'tijuana'
  }
}

export function getCityByKey(key: string): City {
  return CITIES.find(c => c.key === key) ?? CITIES[0]!
}
