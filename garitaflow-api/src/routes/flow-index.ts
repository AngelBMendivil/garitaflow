import { Router, Response } from 'express';
import { query, queryOne } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const VALID_LANES = ['GENERAL', 'READY', 'SENTRI'];
const VALID_MODES = ['VEHICULAR', 'PEDESTRIAN'];

const COMMUNITY_WINDOW_MIN = 180; // ventana para el promedio de comunidad (min)

// Caché en memoria para /recommend. El cálculo es idéntico para todos los
// usuarios con el mismo (city, mode, hasSentri), así que lo compartimos ~90s.
// Reduce carga de DB/CPU en el plan de $5 sin afectar frescura percibida.
const RECOMMEND_TTL_MS = 90_000;
const recommendCache = new Map<string, { at: number; payload: any }>();

// GET /flow-index/recommend?city=tijuana&mode=VEHICULAR
// Sugiere la garita más rápida combinando comunidad (tiempos reales) + CBP en vivo + estimación.
// NOTA: debe declararse ANTES de '/:portId' para que Express no la tome como portId.
router.get('/recommend', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const city = req.query.city ? String(req.query.city) : null;
    const mode = String(req.query.mode || 'VEHICULAR').toUpperCase();
    if (!VALID_MODES.includes(mode)) {
      return res.status(400).json({ error: 'mode inválido' });
    }

    // Si el usuario NO tiene SENTRI, nunca se recomienda SENTRI.
    const prof = await queryOne<{ has_sentri: boolean }>(
      `SELECT has_sentri FROM profiles WHERE user_id = $1`,
      [req.user!.userId]
    );
    const hasSentri = !!prof?.has_sentri;

    // Cache hit: mismo (city, mode, hasSentri) dentro de la ventana TTL.
    const cacheKey = `${city || 'all'}|${mode}|${hasSentri ? 1 : 0}`;
    const cached = recommendCache.get(cacheKey);
    if (cached && Date.now() - cached.at < RECOMMEND_TTL_MS) {
      return res.json({ ...cached.payload, cached: true });
    }

    const ports = await query<{ id: number; code: string; name: string }>(
      `SELECT id, code, name FROM ports
        WHERE is_active = TRUE AND ($1::text IS NULL OR city = $1)
        ORDER BY id`,
      [city]
    );

    type Reco = {
      port_id: number; code: string; name: string; lane: string;
      effective_wait: number; basis: string;
      community_minutes: number | null; community_users: number;
      cbp_minutes: number | null; estimated_minutes: number | null;
    };
    const results: Reco[] = [];

    for (const p of ports) {
      const laneRows = await query<{ lane_type: string }>(
        `SELECT DISTINCT lane_type FROM lane_types
          WHERE port_id = $1 AND mode = $2 AND is_active = TRUE`,
        [p.id, mode]
      );
      let lanes = laneRows.map((r) => r.lane_type);
      if (!hasSentri) lanes = lanes.filter((l) => l !== 'SENTRI');
      if (!lanes.length) continue;

      let best: Reco | null = null;

      for (const lane of lanes) {
        const comm = await queryOne<{ users: number; avg_minutes: number | null }>(
          `SELECT COUNT(DISTINCT user_id)::int AS users,
                  ROUND(AVG(duration_seconds) / 60.0)::int AS avg_minutes
             FROM crossings
            WHERE port_id = $1 AND lane_type = $2 AND mode = $3
              AND ended_at IS NOT NULL
              AND ended_at > NOW() - ($4 || ' minutes')::INTERVAL
              AND duration_seconds > 0`,
          [p.id, lane, mode, COMMUNITY_WINDOW_MIN]
        );
        const cbpRow = await queryOne<{ w: number | null }>(
          `SELECT ws.wait_minutes AS w
             FROM wait_snapshots ws
             JOIN lane_types lt ON lt.id = ws.lane_type_id
            WHERE lt.port_id = $1 AND lt.lane_type = $2 AND lt.mode = $3
              AND ws.wait_minutes IS NOT NULL
            ORDER BY ws.recorded_at DESC LIMIT 1`,
          [p.id, lane, mode]
        );
        const estRow = await queryOne<{ e: number | null }>(
          `SELECT e.estimated_wait AS e
             FROM estimates e
             JOIN lane_types lt ON lt.id = e.lane_type_id
            WHERE lt.port_id = $1 AND lt.lane_type = $2 AND lt.mode = $3
              AND e.calculated_at > NOW() - INTERVAL '2 hours'
            ORDER BY e.calculated_at DESC LIMIT 1`,
          [p.id, lane, mode]
        );

        const users = comm?.users ?? 0;
        const communityMin = users > 0 ? comm!.avg_minutes : null;
        const cbpMin = cbpRow?.w != null ? Number(cbpRow.w) : null;
        const estMin = estRow?.e != null ? Number(estRow.e) : null;

        let effective: number | null = null;
        let basis = 'sin_datos';
        if (communityMin !== null && cbpMin !== null) {
          effective = Math.round(0.6 * communityMin + 0.4 * cbpMin); basis = 'comunidad+cbp';
        } else if (communityMin !== null) { effective = communityMin; basis = 'comunidad'; }
        else if (cbpMin !== null) { effective = cbpMin; basis = 'cbp'; }
        else if (estMin !== null) { effective = estMin; basis = 'estimacion'; }

        if (effective !== null && (best === null || effective < best.effective_wait)) {
          best = {
            port_id: p.id, code: p.code, name: p.name, lane,
            effective_wait: effective, basis,
            community_minutes: communityMin, community_users: users,
            cbp_minutes: cbpMin, estimated_minutes: estMin,
          };
        }
      }
      if (best) results.push(best);
    }

    results.sort((a, b) => a.effective_wait - b.effective_wait);
    const payload = { city, mode, has_sentri: hasSentri, recommended: results[0] ?? null, options: results };
    recommendCache.set(cacheKey, { at: Date.now(), payload });
    return res.json(payload);
  } catch (err) {
    console.error('flow-index recommend error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

// GET /flow-index/:portId?lane=GENERAL|READY|SENTRI&mode=VEHICULAR|PEDESTRIAN
// Lee la estimación vigente producida por el pipeline (CBP + histórico).
// No recalcula: estimates es la única fuente de verdad.
router.get('/:portId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { portId } = req.params;
    const lane = String(req.query.lane || 'GENERAL').toUpperCase();
    const mode = String(req.query.mode || 'VEHICULAR').toUpperCase();

    if (!VALID_LANES.includes(lane) || !VALID_MODES.includes(mode)) {
      return res.status(400).json({ error: 'lane o mode inválido' });
    }

    // Estimación más reciente del carril seleccionado
    const est = await queryOne<{
      estimated_wait: number;
      status: string;
      confidence: number;
      calculated_at: string;
    }>(
      `SELECT e.estimated_wait, e.status, e.confidence, e.calculated_at
       FROM estimates e
       JOIN lane_types lt ON lt.id = e.lane_type_id
       WHERE lt.port_id = $1
         AND lt.lane_type = $2
         AND lt.mode = $3
       ORDER BY e.calculated_at DESC
       LIMIT 1`,
      [portId, lane, mode]
    );

    // Lectura cruda del CBP, para contrastar contra la estimación
    const cbp = await queryOne<{
      wait_minutes: number | null;
      lanes_open: number | null;
      cbp_updated: string | null;
    }>(
      `SELECT ws.wait_minutes, ws.lanes_open, ws.cbp_updated
       FROM wait_snapshots ws
       JOIN lane_types lt ON lt.id = ws.lane_type_id
       WHERE lt.port_id = $1
         AND lt.lane_type = $2
         AND lt.mode = $3
       ORDER BY ws.recorded_at DESC
       LIMIT 1`,
      [portId, lane, mode]
    );

    // Todos los carriles del puerto, para comparar
    const all = await query<{
      lane_type: string;
      mode: string;
      estimated_wait: number;
      status: string;
    }>(
      `SELECT DISTINCT ON (lt.lane_type, lt.mode)
              lt.lane_type, lt.mode, e.estimated_wait, e.status
       FROM estimates e
       JOIN lane_types lt ON lt.id = e.lane_type_id
       WHERE lt.port_id = $1
         AND e.calculated_at > NOW() - INTERVAL '2 hours'
       ORDER BY lt.lane_type, lt.mode, e.calculated_at DESC`,
      [portId]
    );

    // Comunidad: promedio de tiempos REALES de cruce del carril (ventana) + N usuarios que cronometraron
    const communityRow = await queryOne<{ users: number; avg_minutes: number | null }>(
      `SELECT COUNT(DISTINCT user_id)::int AS users,
              ROUND(AVG(duration_seconds) / 60.0)::int AS avg_minutes
         FROM crossings
        WHERE port_id = $1 AND lane_type = $2 AND mode = $3
          AND ended_at IS NOT NULL
          AND ended_at > NOW() - ($4 || ' minutes')::INTERVAL
          AND duration_seconds > 0`,
      [portId, lane, mode, COMMUNITY_WINDOW_MIN]
    );
    const community =
      communityRow && communityRow.users > 0
        ? {
            avg_minutes: communityRow.avg_minutes,
            users: communityRow.users,
            window_minutes: COMMUNITY_WINDOW_MIN,
          }
        : null;

    if (!est) {
      return res.json({
        has_data: false,
        lane,
        mode,
        estimated_wait: null,
        status: 'UNKNOWN',
        confidence: 0,
        cbp: null,
        community,
        lanes: [],
      });
    }

    return res.json({
      has_data: true,
      lane,
      mode,
      estimated_wait: Number(est.estimated_wait),
      status: est.status,
      confidence: Number(est.confidence),
      calculated_at: est.calculated_at,
      cbp: cbp
        ? {
            wait_minutes: cbp.wait_minutes === null ? null : Number(cbp.wait_minutes),
            lanes_open: cbp.lanes_open === null ? null : Number(cbp.lanes_open),
            updated_at: cbp.cbp_updated,
          }
        : null,
      community,
      lanes: all.map((r) => ({
        lane_type: r.lane_type,
        mode: r.mode,
        estimated_wait: Number(r.estimated_wait),
        status: r.status,
      })),
    });
  } catch (err) {
    console.error('flow-index error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

// GET /flow-index — todos los puertos activos con su estimación vigente
router.get('/', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await query(
      `SELECT DISTINCT ON (p.id, lt.lane_type, lt.mode)
              p.id AS port_id, p.code, p.name,
              lt.lane_type, lt.mode,
              e.estimated_wait, e.status, e.confidence, e.calculated_at
       FROM ports p
       JOIN lane_types lt ON lt.port_id = p.id AND lt.is_active = TRUE
       JOIN estimates e ON e.lane_type_id = lt.id
       WHERE p.is_active = TRUE
         AND e.calculated_at > NOW() - INTERVAL '2 hours'
       ORDER BY p.id, lt.lane_type, lt.mode, e.calculated_at DESC`,
      []
    );

    return res.json(rows);
  } catch (err) {
    console.error('flow-index list error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

// GET /flow-index/:portId/history?hours=2&lane=&mode=
router.get('/:portId/history', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { portId } = req.params;
    const hours = Number(req.query.hours) || 2;
    const lane = String(req.query.lane || 'GENERAL').toUpperCase();
    const mode = String(req.query.mode || 'VEHICULAR').toUpperCase();

    if (!VALID_LANES.includes(lane) || !VALID_MODES.includes(mode)) {
      return res.status(400).json({ error: 'lane o mode inválido' });
    }

    const rows = await query(
      `SELECT e.estimated_wait, e.status, e.calculated_at
       FROM estimates e
       JOIN lane_types lt ON lt.id = e.lane_type_id
       WHERE lt.port_id = $1
         AND lt.lane_type = $3
         AND lt.mode = $4
         AND e.calculated_at > NOW() - ($2 || ' hours')::INTERVAL
       ORDER BY e.calculated_at ASC`,
      [portId, hours, lane, mode]
    );

    return res.json(rows);
  } catch (err) {
    console.error('flow-index history error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

// GET /flow-index/:portId/hourly?lane=GENERAL&mode=VEHICULAR
// Espera típica por hora del día (histórico) + tendencia de hoy + mejor/peor/ahora.
router.get('/:portId/hourly', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { portId } = req.params;
    const lane = String(req.query.lane || 'GENERAL').toUpperCase();
    const mode = String(req.query.mode || 'VEHICULAR').toUpperCase();
    if (!VALID_LANES.includes(lane) || !VALID_MODES.includes(mode)) {
      return res.status(400).json({ error: 'lane o mode inválido' });
    }

    const CITY_TZ: Record<string, string> = {
      tijuana: 'America/Tijuana', mexicali: 'America/Tijuana',
      nogales: 'America/Hermosillo', juarez: 'America/Ciudad_Juarez', laredo: 'America/Matamoros',
    };
    const portRow = await queryOne<{ city: string | null }>(`SELECT city FROM ports WHERE id = $1`, [portId]);
    const tz = CITY_TZ[(portRow?.city || '').toLowerCase()] || 'America/Tijuana';

    const hist = await query<{ hour: number; avg: number }>(
      `SELECT EXTRACT(HOUR FROM ws.recorded_at AT TIME ZONE $4)::int AS hour,
              ROUND(AVG(ws.wait_minutes))::int AS avg
         FROM wait_snapshots ws
         JOIN lane_types lt ON lt.id = ws.lane_type_id
        WHERE lt.port_id = $1 AND lt.lane_type = $2 AND lt.mode = $3 AND ws.wait_minutes IS NOT NULL
        GROUP BY 1 ORDER BY 1`,
      [portId, lane, mode, tz]
    );
    const today = await query<{ hour: number; avg: number }>(
      `SELECT EXTRACT(HOUR FROM ws.recorded_at AT TIME ZONE $4)::int AS hour,
              ROUND(AVG(ws.wait_minutes))::int AS avg
         FROM wait_snapshots ws
         JOIN lane_types lt ON lt.id = ws.lane_type_id
        WHERE lt.port_id = $1 AND lt.lane_type = $2 AND lt.mode = $3 AND ws.wait_minutes IS NOT NULL
          AND (ws.recorded_at AT TIME ZONE $4)::date = (NOW() AT TIME ZONE $4)::date
        GROUP BY 1 ORDER BY 1`,
      [portId, lane, mode, tz]
    );

    const histMap = new Map(hist.map((h) => [Number(h.hour), Number(h.avg)]));
    const todayMap = new Map(today.map((h) => [Number(h.hour), Number(h.avg)]));
    const hours = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      historic: histMap.has(h) ? (histMap.get(h) as number) : null,
      today: todayMap.has(h) ? (todayMap.get(h) as number) : null,
    }));

    let best: { hour: number; minutes: number } | null = null;
    let worst: { hour: number; minutes: number } | null = null;
    for (const h of hours) {
      if (h.historic == null) continue;
      if (best === null || h.historic < best.minutes) best = { hour: h.hour, minutes: h.historic };
      if (worst === null || h.historic > worst.minutes) worst = { hour: h.hour, minutes: h.historic };
    }

    const nowParts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', hour12: false }).formatToParts(new Date());
    const nowHour = Number(nowParts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
    const nowRow = await queryOne<{ w: number | null }>(
      `SELECT ws.wait_minutes AS w FROM wait_snapshots ws JOIN lane_types lt ON lt.id = ws.lane_type_id
        WHERE lt.port_id = $1 AND lt.lane_type = $2 AND lt.mode = $3 AND ws.wait_minutes IS NOT NULL
        ORDER BY ws.recorded_at DESC LIMIT 1`,
      [portId, lane, mode]
    );

    return res.json({ lane, mode, tz, hours, best, worst, now: { hour: nowHour, minutes: nowRow?.w ?? null } });
  } catch (err) {
    console.error('flow-index hourly error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

export default router;