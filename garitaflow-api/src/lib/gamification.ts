/**
 * Servicio de gamificación GaritaFlow.
 * Todo es parametrizable desde la BD (gamification_config, badges) — se puede
 * cambiar thresholds, cooldown, permanencia y corredores sin publicar la app.
 */
import { query, queryOne } from '../db';
import { pointInPolygon, haversineMeters, Ring } from './geo';

// ─── Config (cache corto para no golpear la BD en cada request) ──────────────
type ConfigMap = Record<string, string>;
let configCache: { at: number; data: ConfigMap } | null = null;
const CONFIG_TTL_MS = 60_000;

export async function getConfigMap(): Promise<ConfigMap> {
  if (configCache && Date.now() - configCache.at < CONFIG_TTL_MS) return configCache.data;
  const rows = await query<{ key: string; value: string }>(
    `SELECT key, value FROM gamification_config`
  );
  const data: ConfigMap = {};
  for (const r of rows) data[r.key] = r.value;
  configCache = { at: Date.now(), data };
  return data;
}

export async function getConfigNumber(key: string, fallback: number): Promise<number> {
  const c = await getConfigMap();
  const n = Number(c[key]);
  return Number.isFinite(n) ? n : fallback;
}

export async function getConfigBool(key: string, fallback: boolean): Promise<boolean> {
  const c = await getConfigMap();
  if (c[key] === undefined) return fallback;
  return c[key] === 'true' || c[key] === '1';
}

// ─── Badges ──────────────────────────────────────────────────────────────────
export interface BadgeDef {
  category: 'crossings' | 'community';
  level: number;
  name: string;
  threshold: number;
  special: boolean;
}

export async function getBadges(category?: string): Promise<BadgeDef[]> {
  const rows = await query<BadgeDef>(
    `SELECT category, level, name, threshold, special
       FROM badges
      WHERE active = TRUE ${category ? 'AND category = $1' : ''}
      ORDER BY category, level`,
    category ? [category] : []
  );
  return rows;
}

export interface BadgeProgress {
  category: 'crossings' | 'community';
  value: number;
  current: BadgeDef | null;   // badge ya alcanzado (nivel más alto)
  next: BadgeDef | null;      // siguiente por alcanzar
  toNext: number;             // cuánto falta para el siguiente
}

export function badgeForValue(
  category: 'crossings' | 'community',
  value: number,
  badges: BadgeDef[]
): BadgeProgress {
  const scale = badges
    .filter((b) => b.category === category)
    .sort((a, b) => a.threshold - b.threshold);

  let current: BadgeDef | null = null;
  let next: BadgeDef | null = null;
  for (const b of scale) {
    if (value >= b.threshold) current = b;
    else { next = b; break; }
  }
  return {
    category,
    value,
    current,
    next,
    toNext: next ? Math.max(0, next.threshold - value) : 0,
  };
}

/** Progreso de los dos badges del usuario (independientes). */
export async function getUserBadges(userId: string): Promise<{
  crossings: BadgeProgress;
  community: BadgeProgress;
}> {
  const profile = await queryOne<{ total_crossings: number; valid_contributions: number }>(
    `SELECT total_crossings, valid_contributions FROM profiles WHERE user_id = $1`,
    [userId]
  );
  const badges = await getBadges();
  const crossings = badgeForValue('crossings', Number(profile?.total_crossings ?? 0), badges);
  const community = badgeForValue('community', Number(profile?.valid_contributions ?? 0), badges);
  return { crossings, community };
}

// ─── Elegibilidad de un aporte para gamificación ─────────────────────────────
export type GeoStatus = 'VALIDATED_IN_LINE' | 'NEAR_BORDER' | 'OUTSIDE_VALID_AREA';

export interface EligibilityInput {
  userId: string;
  crossingId?: string | null;
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  portId?: number | string | null;
  laneType?: string | null;
}

export interface EligibilityResult {
  status: GeoStatus;
  eligible: boolean;
  reason?: string;
}

/**
 * Evalúa si un reporte debe sumar para el badge comunitario.
 * FASE A (geo_validation_enabled = false): usamos como proxy el estar en un
 * cruce activo (reportas mientras haces fila) + cooldown.
 * FASE B: cuando geo_validation_enabled = true, aquí se hará el point-in-polygon
 * contra `geofences`, permanencia mínima y vigencia de ubicación.
 */
export async function evaluateEligibility(input: EligibilityInput): Promise<EligibilityResult> {
  const cooldown = await getConfigNumber('cooldown_seconds', 900);
  const geoEnabled = await getConfigBool('geo_validation_enabled', false);
  const minStay = await getConfigNumber('min_stay_seconds', 180);
  const lowAccuracy = await getConfigNumber('low_accuracy_meters', 150);
  const maxSpeed = await getConfigNumber('max_speed_kmh', 160);

  const hasCoords =
    typeof input.lat === 'number' && typeof input.lng === 'number' &&
    Number.isFinite(input.lat) && Number.isFinite(input.lng);

  let status: GeoStatus = 'OUTSIDE_VALID_AREA';

  if (hasCoords) {
    const lat = input.lat as number;
    const lng = input.lng as number;

    // Detección básica de abuso (salto imposible + precisión pobre)
    let flagged = false;
    const lastPing = await queryOne<{ lat: string; lng: string; captured_at: string }>(
      `SELECT lat, lng, captured_at FROM user_location_pings
        WHERE user_id = $1 ORDER BY captured_at DESC LIMIT 1`,
      [input.userId]
    );
    if (lastPing) {
      const meters = haversineMeters(Number(lastPing.lat), Number(lastPing.lng), lat, lng);
      const secs = Math.max(1, (Date.now() - new Date(lastPing.captured_at).getTime()) / 1000);
      const kmh = (meters / 1000) / (secs / 3600);
      if (kmh > maxSpeed) flagged = true;
    }
    if (typeof input.accuracy === 'number' && input.accuracy > lowAccuracy) flagged = true;

    // ¿Dentro de algún corredor de esta garita?
    const fences = await query<{ id: number; polygon: any; minimum_stay_seconds: number | null }>(
      `SELECT id, polygon, minimum_stay_seconds
         FROM geofences
        WHERE active = TRUE AND port_id = $1
          AND (lane_type IS NULL OR lane_type = $2)`,
      [input.portId, input.laneType ?? null]
    );
    let insideFenceId: number | null = null;
    let fenceMinStay = minStay;
    for (const f of fences) {
      const ring = (Array.isArray(f.polygon) ? f.polygon : []) as Ring;
      if (ring.length >= 3 && pointInPolygon(lng, lat, ring)) {
        insideFenceId = f.id;
        if (f.minimum_stay_seconds) fenceMinStay = f.minimum_stay_seconds;
        break;
      }
    }

    // Registrar ping + flag de riesgo
    await query(
      `INSERT INTO user_location_pings (user_id, lat, lng, accuracy, geofence_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [input.userId, lat, lng, input.accuracy ?? null, insideFenceId]
    );
    if (flagged) {
      await query(`UPDATE profiles SET risk_flags = risk_flags + 1 WHERE user_id = $1`, [input.userId]);
    }

    if (insideFenceId && !flagged) {
      // Permanencia mínima: usamos el cruce activo como prueba de que lleva rato en fila.
      const cross = await queryOne<{ started_at: string }>(
        `SELECT started_at FROM crossings
          WHERE user_id = $1 AND ended_at IS NULL
          ORDER BY started_at DESC LIMIT 1`,
        [input.userId]
      );
      const inLineSecs = cross ? (Date.now() - new Date(cross.started_at).getTime()) / 1000 : 0;
      status = inLineSecs >= fenceMinStay ? 'VALIDATED_IN_LINE' : 'NEAR_BORDER';
    } else if (insideFenceId) {
      status = 'NEAR_BORDER'; // dentro pero con ubicación sospechosa
    } else {
      status = 'NEAR_BORDER'; // hay coords pero no está en un corredor conocido
    }
  } else {
    // Sin coordenadas. Si el geo no es obligatorio, usamos el cruce activo como proxy.
    if (!geoEnabled) status = input.crossingId ? 'VALIDATED_IN_LINE' : 'NEAR_BORDER';
    else status = 'NEAR_BORDER';
  }

  if (status !== 'VALIDATED_IN_LINE') {
    return { status, eligible: false, reason: 'no_validado' };
  }

  // Cooldown: máximo 1 aporte válido cada N segundos
  const last = await queryOne<{ created_at: string }>(
    `SELECT created_at FROM flow_events
      WHERE user_id = $1 AND eligible_for_gamification = TRUE
      ORDER BY created_at DESC LIMIT 1`,
    [input.userId]
  );
  if (last) {
    const secs = (Date.now() - new Date(last.created_at).getTime()) / 1000;
    if (secs < cooldown) return { status, eligible: false, reason: 'cooldown' };
  }

  return { status, eligible: true };
}

/** Suma 1 aporte válido al perfil (badge comunitario, acumulativo). */
export async function awardCommunityContribution(userId: string): Promise<void> {
  await query(
    `UPDATE profiles SET valid_contributions = valid_contributions + 1, updated_at = NOW()
      WHERE user_id = $1`,
    [userId]
  );
}
