import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { gamificationApi } from '../lib/api';

export type LineStatus = 'IN_LINE' | 'OUTSIDE' | 'UNKNOWN';

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

/**
 * Detector en vivo "¿Estás en la línea?".
 * Trae las geocercas activas de la garita y vigila el GPS del usuario.
 * Devuelve IN_LINE / OUTSIDE / UNKNOWN (sin permiso, sin geocercas o cargando).
 */
export function useLineDetector(portId: string | number | null): LineStatus {
  const [status, setStatus] = useState<LineStatus>('UNKNOWN');
  const fencesRef = useRef<number[][][]>([]);

  // Cargar geocercas de la garita
  useEffect(() => {
    let alive = true;
    setStatus('UNKNOWN');
    fencesRef.current = [];
    if (!portId) return;
    gamificationApi
      .geofences(portId)
      .then((rows: any[]) => {
        if (!alive) return;
        fencesRef.current = (rows || [])
          .map((r) => (Array.isArray(r.polygon) ? (r.polygon as number[][]) : []))
          .filter((p) => p.length >= 3);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [portId]);

  // Vigilar la ubicación
  useEffect(() => {
    let alive = true;
    let sub: Location.LocationSubscription | null = null;

    (async () => {
      if (!portId) return;
      try {
        let perm = await Location.getForegroundPermissionsAsync();
        if (perm.status !== 'granted') {
          perm = await Location.requestForegroundPermissionsAsync();
        }
        if (perm.status !== 'granted') {
          if (alive) setStatus('UNKNOWN');
          return;
        }
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 25, timeInterval: 15000 },
          (pos) => {
            if (!alive) return;
            const fences = fencesRef.current;
            if (!fences.length) {
              setStatus('UNKNOWN');
              return;
            }
            const { latitude, longitude } = pos.coords;
            const inside = fences.some((ring) => pointInPolygon(longitude, latitude, ring));
            setStatus(inside ? 'IN_LINE' : 'OUTSIDE');
          }
        );
      } catch {
        if (alive) setStatus('UNKNOWN');
      }
    })();

    return () => {
      alive = false;
      sub?.remove();
    };
  }, [portId]);

  return status;
}
