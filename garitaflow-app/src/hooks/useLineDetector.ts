import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { gamificationApi } from '../lib/api';

/**
 * Estados del detector. Antes todo lo no-concluyente caía en 'UNKNOWN' y se
 * pintaba como "Detectando tu ubicación…", así que un fallo permanente
 * (sin geocercas, 401, GPS apagado) era indistinguible de "cargando".
 */
export type LineStatus =
  | 'IDLE'          // sin garita seleccionada
  | 'LOCATING'      // de verdad estamos esperando un fix
  | 'IN_LINE'
  | 'OUTSIDE'
  | 'NO_PERMISSION'
  | 'GPS_OFF'       // permiso concedido pero ubicación del sistema apagada
  | 'GPS_TIMEOUT'   // ningún fix en FIRST_FIX_TIMEOUT_MS
  | 'GPS_ERROR'
  | 'NO_COVERAGE';  // sin geocerca ni coordenada conocida para esta garita

export interface LineDetection {
  status: LineStatus;
  /** 'fence' = polígono real del backend. 'radius' = aproximación por distancia. */
  source: 'fence' | 'radius' | null;
  retry: () => void;
}

const FIRST_FIX_TIMEOUT_MS = 15_000;
const DEFAULT_RADIUS_M = 2_000;

/** Ray-casting: ¿el punto (lng,lat) está dentro del anillo [[lng,lat], ...]? */
function pointInPolygon(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect =
      (yi > lat) !== (yj > lat) &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/** Distancia en metros entre dos puntos (haversine). */
function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Respaldo por radio para las garitas que NO tienen geocerca sembrada en la BD
 * (hoy solo San Ysidro y Otay la tienen; el resto se quedaba "detectando" para
 * siempre). El radio es generoso a propósito: preferimos un "estás cerca"
 * aproximado antes que dejar la función muerta.
 *
 * ⚠️ Coordenadas APROXIMADAS tomadas del centro de cada cruce. Sirven para un
 * radio de 2 km, pero conviene verificarlas en campo con GPS antes de apretar
 * el radio. `match` compara subcadenas contra el code y el nombre de la garita,
 * igual que hace el seed del backend, para no depender del code exacto.
 */
const FALLBACK_PORTS: { match: string[]; lat: number; lng: number; radiusM?: number }[] = [
  { match: ['ped_west', 'pedwest', 'puerta mexico oeste'], lat: 32.5435, lng: -117.0432, radiusM: 1200 },
  { match: ['san_ysidro', 'ysidro', 'chaparral'], lat: 32.5422, lng: -117.0295 },
  { match: ['otay'], lat: 32.5432, lng: -116.9381 },
  { match: ['tecate'], lat: 32.5758, lng: -116.6274 },
  { match: ['mexicali_ii', 'mexicali 2', 'calexico_east', 'calexico east'], lat: 32.6726, lng: -115.3884 },
  { match: ['mexicali', 'calexico'], lat: 32.6652, lng: -115.4966 },
  { match: ['mariposa'], lat: 31.3479, lng: -110.98 },
  { match: ['nogales', 'deconcini'], lat: 31.3325, lng: -110.9425 },
  { match: ['zaragoza', 'ysleta'], lat: 31.6714, lng: -106.3324 },
  { match: ['paso_del_norte', 'paso del norte', 'santa fe'], lat: 31.7513, lng: -106.4855 },
  { match: ['cordova', 'americas', 'puente libre', 'juarez'], lat: 31.753, lng: -106.453 },
  { match: ['world trade', 'comercio mundial'], lat: 27.5758, lng: -99.5647 },
  { match: ['juarez_lincoln', 'juarez-lincoln', 'puente ii', 'puente 2'], lat: 27.4975, lng: -99.5155 },
  { match: ['laredo', 'gateway', 'puente i', 'puente 1'], lat: 27.5028, lng: -99.507 },
];

function resolveFallback(code?: string | null, name?: string | null) {
  const hay = `${code ?? ''} ${name ?? ''}`.toLowerCase();
  if (!hay.trim()) return null;
  return FALLBACK_PORTS.find((f) => f.match.some((m) => hay.includes(m))) ?? null;
}

/**
 * Detector en vivo "¿Estás en la línea?".
 * Usa la geocerca real de la garita cuando existe; si no, cae a un radio
 * aproximado. Nunca se queda colgado: todo camino termina en un estado
 * concluyente y `retry()` permite reintentar a mano.
 */
export function useLineDetector(
  portId: string | number | null,
  portCode?: string | null,
  portName?: string | null
): LineDetection {
  const [fences, setFences] = useState<number[][][] | null>(null);
  const [fencesFailed, setFencesFailed] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoState, setGeoState] = useState<
    'idle' | 'locating' | 'ok' | 'no_permission' | 'gps_off' | 'timeout' | 'error'
  >('idle');
  const [nonce, setNonce] = useState(0);

  const retry = useCallback(() => setNonce((n) => n + 1), []);

  // ── Geocercas de la garita ────────────────────────────────────────────────
  // A diferencia de antes esto vive en estado, no en un ref: si los polígonos
  // llegan después del primer fix de GPS, el resultado se recalcula solo.
  useEffect(() => {
    let alive = true;
    setFences(null);
    setFencesFailed(false);
    if (!portId) return;
    gamificationApi
      .geofences(portId)
      .then((rows: any[]) => {
        if (!alive) return;
        const parsed = (rows || [])
          .map((r) => {
            // el backend guarda jsonb; según el driver puede llegar como string
            const raw = typeof r.polygon === 'string' ? safeParse(r.polygon) : r.polygon;
            return Array.isArray(raw) ? (raw as number[][]) : [];
          })
          .filter((p) => p.length >= 3);
        setFences(parsed);
      })
      .catch(() => {
        // ya no se traga en silencio: sin geocercas caemos al radio aproximado
        if (alive) {
          setFences([]);
          setFencesFailed(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [portId, nonce]);

  // ── Ubicación ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    let sub: Location.LocationSubscription | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let gotFix = false;

    if (!portId) {
      setGeoState('idle');
      return;
    }

    setGeoState('locating');

    (async () => {
      try {
        let perm = await Location.getForegroundPermissionsAsync();
        if (perm.status !== 'granted' && perm.canAskAgain) {
          perm = await Location.requestForegroundPermissionsAsync();
        }
        if (!alive) return;
        if (perm.status !== 'granted') {
          setGeoState('no_permission');
          return;
        }

        // Permiso concedido pero ubicación del sistema apagada: antes se veía
        // igual que "cargando" y el usuario no sabía que debía prender el GPS.
        const servicesOn = await Location.hasServicesEnabledAsync().catch(() => true);
        if (!alive) return;
        if (!servicesOn) {
          setGeoState('gps_off');
          return;
        }

        // Corte de seguridad: si en 15 s no hubo un solo fix, lo decimos.
        // El watcher sigue vivo, así que si el fix llega tarde se recupera solo.
        timeoutId = setTimeout(() => {
          if (alive && !gotFix) setGeoState('timeout');
        }, FIRST_FIX_TIMEOUT_MS);

        const accept = (pos: Location.LocationObject) => {
          if (!alive) return;
          gotFix = true;
          if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGeoState('ok');
        };

        // Fix inmediato: `watchPositionAsync` con distanceInterval no emite
        // mientras el usuario está quieto, así que sin esto la primera lectura
        // podía no llegar nunca.
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          .then(accept)
          .catch(() => { /* el watcher de abajo sigue siendo la vía principal */ });

        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 25, timeInterval: 15000 },
          accept
        );
      } catch {
        if (alive) setGeoState('error');
      }
    })();

    return () => {
      alive = false;
      if (timeoutId) clearTimeout(timeoutId);
      sub?.remove();
    };
  }, [portId, nonce]);

  // ── Reintento al volver del segundo plano ─────────────────────────────────
  // Cubre el caso "concedí el permiso desde Ajustes y la app siguió atorada":
  // antes nada re-disparaba el efecto porque solo dependía de [portId].
  const geoStateRef = useRef(geoState);
  geoStateRef.current = geoState;
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      const s = geoStateRef.current;
      if (s === 'no_permission' || s === 'gps_off' || s === 'timeout' || s === 'error') {
        setNonce((n) => n + 1);
      }
    });
    return () => sub.remove();
  }, []);

  // ── Resultado ─────────────────────────────────────────────────────────────
  if (!portId) return { status: 'IDLE', source: null, retry };
  if (geoState === 'no_permission') return { status: 'NO_PERMISSION', source: null, retry };
  if (geoState === 'gps_off') return { status: 'GPS_OFF', source: null, retry };
  if (geoState === 'error') return { status: 'GPS_ERROR', source: null, retry };

  const fallback = resolveFallback(portCode, portName);
  const hasFences = !!fences && fences.length > 0;

  // Sabemos ya que no hay forma de resolver esta garita: no tiene caso seguir
  // diciendo "detectando".
  if (fences !== null && !hasFences && !fallback) {
    return { status: 'NO_COVERAGE', source: null, retry };
  }

  if (geoState === 'timeout') return { status: 'GPS_TIMEOUT', source: null, retry };
  if (geoState !== 'ok' || !coords) return { status: 'LOCATING', source: null, retry };
  if (fences === null) return { status: 'LOCATING', source: null, retry };

  if (hasFences) {
    const inside = fences!.some((ring) => pointInPolygon(coords.lng, coords.lat, ring));
    return { status: inside ? 'IN_LINE' : 'OUTSIDE', source: 'fence', retry };
  }

  if (fallback) {
    const d = distanceMeters(coords.lat, coords.lng, fallback.lat, fallback.lng);
    const inside = d <= (fallback.radiusM ?? DEFAULT_RADIUS_M);
    return { status: inside ? 'IN_LINE' : 'OUTSIDE', source: 'radius', retry };
  }

  return { status: 'NO_COVERAGE', source: null, retry };
}

/** Texto y tono de la pastilla, para que la pantalla no repita esta lógica. */
export function lineStatusLabel(d: LineDetection): { text: string; icon: string; tone: 'in' | 'out' | 'warn' | 'neutral' } {
  switch (d.status) {
    case 'IN_LINE':
      return {
        text: d.source === 'radius' ? 'Estás cerca de esta garita (aproximado)' : 'Estás en la línea de esta garita',
        icon: '🟢',
        tone: 'in',
      };
    case 'OUTSIDE':
      return {
        text: d.source === 'radius' ? 'No estás cerca de esta garita' : 'No estás en la línea de esta garita',
        icon: '⚪',
        tone: 'out',
      };
    case 'NO_PERMISSION':
      return { text: 'Sin permiso de ubicación · toca para reintentar', icon: '🚫', tone: 'warn' };
    case 'GPS_OFF':
      return { text: 'Prende la ubicación del teléfono · toca para reintentar', icon: '📴', tone: 'warn' };
    case 'GPS_TIMEOUT':
      return { text: 'No pudimos ubicarte · toca para reintentar', icon: '⚠️', tone: 'warn' };
    case 'GPS_ERROR':
      return { text: 'Error de ubicación · toca para reintentar', icon: '⚠️', tone: 'warn' };
    case 'NO_COVERAGE':
      return { text: 'Sin validación por GPS en esta garita', icon: 'ℹ️', tone: 'neutral' };
    case 'IDLE':
      return { text: 'Selecciona una garita', icon: '📍', tone: 'neutral' };
    default:
      return { text: 'Detectando tu ubicación…', icon: '📍', tone: 'neutral' };
  }
}
