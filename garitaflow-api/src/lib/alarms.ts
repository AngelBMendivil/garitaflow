/**
 * GaritaFlow — Motor de alarmas de cruce recurrente.
 * Baseline (interino) desde wait_snapshots por día-de-semana × hora; escenarios
 * prudentes (sal antes / despejado / sobresaturación) con gating de muestra y
 * anti-spam. Envía push por Expo. Se afinará con el histórico de la web.
 */
import { query, queryOne } from '../db';

// Zona horaria por ciudad (frontera). Default Tijuana.
const CITY_TZ: Record<string, string> = {
  tijuana: 'America/Tijuana',
  mexicali: 'America/Tijuana',
  nogales: 'America/Hermosillo',
  juarez: 'America/Ciudad_Juarez',
  laredo: 'America/Matamoros',
};
function tzFor(city?: string | null): string {
  return CITY_TZ[(city || '').toLowerCase()] || 'America/Tijuana';
}

const DOW: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Hora local (en la tz dada) ahora mismo: día de semana + minutos desde medianoche. */
export function localNow(tz: string): { dow: number; minutes: number; hour: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const hour = Number(get('hour')) % 24;
  const minute = Number(get('minute'));
  const dow = DOW[get('weekday')] ?? 0;
  return { dow, minutes: hour * 60 + minute, hour };
}

async function cfgNum(key: string, fallback: number): Promise<number> {
  const row = await queryOne<{ value: string }>(
    `SELECT value FROM gamification_config WHERE key = $1`,
    [key]
  );
  const n = row ? Number(row.value) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function parseHHMM(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** Baseline histórico (interino): promedio de wait_snapshots por dow×hora. */
async function baseline(
  portId: number,
  lane: string,
  mode: string,
  dow: number,
  hour: number,
  tz: string
) {
  return await queryOne<{ baseline: number | null; samples: number }>(
    `SELECT ROUND(AVG(ws.wait_minutes))::int AS baseline, COUNT(*)::int AS samples
       FROM wait_snapshots ws
       JOIN lane_types lt ON lt.id = ws.lane_type_id
      WHERE lt.port_id = $1 AND lt.lane_type = $2 AND lt.mode = $3
        AND ws.wait_minutes IS NOT NULL
        AND EXTRACT(DOW  FROM ws.recorded_at AT TIME ZONE $6)::int = $4
        AND EXTRACT(HOUR FROM ws.recorded_at AT TIME ZONE $6)::int = $5`,
    [portId, lane, mode, dow, hour, tz]
  );
}

/** Espera actual: última lectura CBP; si no hay, promedio de comunidad reciente. */
async function currentWait(portId: number, lane: string, mode: string): Promise<number | null> {
  const cbp = await queryOne<{ w: number | null }>(
    `SELECT ws.wait_minutes AS w
       FROM wait_snapshots ws
       JOIN lane_types lt ON lt.id = ws.lane_type_id
      WHERE lt.port_id = $1 AND lt.lane_type = $2 AND lt.mode = $3
        AND ws.wait_minutes IS NOT NULL
      ORDER BY ws.recorded_at DESC
      LIMIT 1`,
    [portId, lane, mode]
  );
  if (cbp?.w != null) return Number(cbp.w);

  const comm = await queryOne<{ w: number | null }>(
    `SELECT ROUND(AVG(duration_seconds) / 60.0)::int AS w
       FROM crossings
      WHERE port_id = $1 AND lane_type = $2 AND mode = $3
        AND ended_at IS NOT NULL AND ended_at > NOW() - INTERVAL '3 hours'
        AND duration_seconds > 0`,
    [portId, lane, mode]
  );
  return comm?.w ?? null;
}

// Sensibilidad ajusta los umbrales: alta = avisa con menos desviación.
function factorFor(sens: string): number {
  if (sens === 'high') return 0.7;
  if (sens === 'low') return 1.4;
  return 1;
}

async function sendExpoPush(tokens: string[], title: string, body: string): Promise<void> {
  const msgs = tokens
    .filter((t) => t && t.startsWith('ExponentPushToken'))
    .map((to) => ({ to, title, body, sound: 'default', priority: 'high' }));
  if (!msgs.length) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msgs),
    });
  } catch (e) {
    console.error('expo push error', e);
  }
}

export type EvalResult = { evaluated: number; sent: number; details: any[] };

/**
 * Evalúa todas las alarmas activas cuya ventana de cruce (target − lead .. target)
 * cae AHORA, y notifica solo si la desviación vs. baseline es significativa.
 */
export async function evaluateAlarms(): Promise<EvalResult> {
  const overPct = await cfgNum('alarm_over_pct', 30);
  const satPct = await cfgNum('alarm_saturation_pct', 70);
  const clearPct = await cfgNum('alarm_clear_pct', 25);
  const minSamples = await cfgNum('alarm_min_samples', 5);
  const dedupeMin = await cfgNum('alarm_dedupe_minutes', 180);

  const rows = await query<any>(
    `SELECT rc.*, p.city, p.name AS port_name
       FROM recurring_crossings rc
       JOIN ports p ON p.id = rc.port_id
      WHERE rc.active = TRUE`
  );

  const details: any[] = [];
  let sent = 0;
  let evaluated = 0;

  for (const rc of rows) {
    const tz = tzFor(rc.city);
    const { dow, minutes: nowMin } = localNow(tz);
    const days: number[] = rc.days_of_week || [];
    if (!days.includes(dow)) continue;

    const target = parseHHMM(rc.target_time);
    if (target == null) continue;

    const windowStart = target - Number(rc.lead_minutes || 45);
    if (nowMin < windowStart || nowMin > target) continue;

    // Anti-spam: no re-evaluar la misma alarma dentro de la ventana dedupe
    const recent = await queryOne<{ id: string }>(
      `SELECT id FROM recurring_notifications_log
        WHERE recurring_id = $1 AND created_at > NOW() - ($2 || ' minutes')::INTERVAL
        LIMIT 1`,
      [rc.id, dedupeMin]
    );
    if (recent) continue;

    evaluated++;
    const targetHour = Math.floor(target / 60);
    const base = await baseline(rc.port_id, rc.lane_type, rc.mode, dow, targetHour, tz);
    const cur = await currentWait(rc.port_id, rc.lane_type, rc.mode);

    let scenario = 'none';
    if (base && base.baseline != null && base.samples >= minSamples && cur != null && base.baseline > 0) {
      const pct = ((cur - base.baseline) / base.baseline) * 100;
      const f = factorFor(rc.sensitivity);
      if (pct >= satPct * f) scenario = 'saturation';
      else if (pct >= overPct * f) scenario = 'over';
      else if (pct <= -clearPct * f) scenario = 'clear';
    }

    // La alarma SIEMPRE avisa dentro de la ventana (como un recordatorio real),
    // y si hay anomalía se sobrepone el aviso. El dedupe evita repetirlo.
    let didSend = false;
    {
      const tks = await query<{ token: string }>(
        `SELECT token FROM push_tokens WHERE user_id = $1`,
        [rc.user_id]
      );
      const tokens = tks.map((t) => t.token);
      const hhmm = rc.target_time;
      const filaTxt = cur != null ? `La fila va en ~${cur} min ahora.` : 'Aún sin lectura de fila.';

      let title: string;
      let body: string;
      if (scenario === 'saturation') {
        title = '⚠️ Sobresaturación en tu cruce';
        body = `Recordatorio de tu cruce de las ${hhmm} en ${rc.port_name}: hay muchísima fila de lo habitual. ${filaTxt} Considera salir antes.`;
      } else if (scenario === 'over') {
        title = '⚠️ Hoy hay más fila de lo normal';
        body = `Recordatorio de tu cruce de las ${hhmm} en ${rc.port_name}: hay más fila de lo habitual. ${filaTxt} Considera salir antes.`;
      } else if (scenario === 'clear') {
        title = '✅ La fila se ve despejada';
        body = `Recordatorio de tu cruce de las ${hhmm} en ${rc.port_name}: la fila está más corta de lo normal. ${filaTxt} Buen momento para salir.`;
      } else {
        title = '⏰ Recordatorio de tu cruce';
        body = `Se acerca tu cruce de las ${hhmm} en ${rc.port_name}. ${filaTxt}`;
      }

      await sendExpoPush(tokens, title, body);
      didSend = tokens.length > 0;
      if (didSend) sent++;
    }

    await query(
      `INSERT INTO recurring_notifications_log (recurring_id, scenario, sent) VALUES ($1, $2, $3)`,
      [rc.id, scenario, didSend]
    );
    details.push({
      id: rc.id,
      scenario,
      sent: didSend,
      current: cur,
      baseline: base?.baseline ?? null,
      samples: base?.samples ?? 0,
    });
  }

  return { evaluated, sent, details };
}
