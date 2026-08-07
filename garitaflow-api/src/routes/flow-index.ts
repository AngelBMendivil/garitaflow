import { Router, Response } from 'express';
import { query, queryOne } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const VALID_LANES = ['GENERAL', 'READY', 'SENTRI'];
const VALID_MODES = ['VEHICULAR', 'PEDESTRIAN'];

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

    if (!est) {
      return res.json({
        has_data: false,
        lane,
        mode,
        estimated_wait: null,
        status: 'UNKNOWN',
        confidence: 0,
        cbp: null,
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

export default router;