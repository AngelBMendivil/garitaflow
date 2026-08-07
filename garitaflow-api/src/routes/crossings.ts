import { Router, Response } from 'express';
import { query, queryOne } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const VALID_LANES = ['GENERAL', 'READY', 'SENTRI', 'PEDWEST'];
const VALID_MODES = ['VEHICULAR', 'PEDESTRIAN'];

// POST /crossings/start — user taps START
router.post('/start', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { port_id, lane_type, mode } = req.body;
    const userId = req.user!.userId;

    if (!port_id || !lane_type) {
      return res.status(400).json({ error: 'port_id and lane_type required' });
    }

    const lane = String(lane_type).toUpperCase();
    const crossingMode = String(mode || 'VEHICULAR').toUpperCase();

    if (!VALID_LANES.includes(lane) || !VALID_MODES.includes(crossingMode)) {
      return res.status(400).json({ error: 'lane_type o mode inválido' });
    }

    const active = await queryOne(
      `SELECT id FROM crossings WHERE user_id = $1 AND ended_at IS NULL`,
      [userId]
    );

    if (active) {
      return res.status(409).json({
        error: 'Ya tienes un cruce en curso',
        crossing_id: active.id,
      });
    }

    const port = await queryOne('SELECT id FROM ports WHERE id = $1', [port_id]);
    if (!port) return res.status(404).json({ error: 'Port not found' });

    const crossing = await queryOne(
      `INSERT INTO crossings (user_id, port_id, lane_type, mode, started_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, port_id, lane_type, mode, started_at`,
      [userId, port_id, lane, crossingMode]
    );

    return res.status(201).json(crossing);
  } catch (err) {
    console.error('crossing start error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /crossings/:id/end — cierra el cruce y otorga XP
router.post('/:id/end', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const crossing = await queryOne(
      `SELECT * FROM crossings WHERE id = $1 AND user_id = $2 AND ended_at IS NULL`,
      [id, userId]
    );

    if (!crossing) {
      return res.status(404).json({ error: 'Active crossing not found' });
    }

    const ended = await queryOne(
      `UPDATE crossings
       SET ended_at = NOW(),
           duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::int
       WHERE id = $1
       RETURNING id, port_id, lane_type, mode, started_at, ended_at, duration_seconds`,
      [id]
    );

    const eventsCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM flow_events WHERE crossing_id = $1`,
      [id]
    );
    const xpEarned = 10 + (Number(eventsCount?.count || 0) * 5);

    await query(
      `UPDATE profiles
       SET total_xp = total_xp + $1,
           total_crossings = total_crossings + 1,
           updated_at = NOW()
       WHERE user_id = $2`,
      [xpEarned, userId]
    );

    await query(
      `UPDATE profiles
       SET level = GREATEST(1, FLOOR(total_xp / 100) + 1)
       WHERE user_id = $1`,
      [userId]
    );

    return res.json({ ...ended, xp_earned: xpEarned });
  } catch (err) {
    console.error('crossing end error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /crossings/active
router.get('/active', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const crossing = await queryOne(
      `SELECT c.*, p.name as port_name, p.code as port_code
       FROM crossings c
       JOIN ports p ON p.id = c.port_id
       WHERE c.user_id = $1 AND c.ended_at IS NULL`,
      [req.user!.userId]
    );

    return res.json(crossing || null);
  } catch (err) {
    console.error('active crossing error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /crossings/history — cruces terminados del usuario
router.get('/history', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;

    const rows = await query(
      `SELECT c.id, c.lane_type, c.mode, c.started_at, c.ended_at, c.duration_seconds,
              p.name as port_name, p.code as port_code,
              COUNT(fe.id)::int as events_reported
       FROM crossings c
       JOIN ports p ON p.id = c.port_id
       LEFT JOIN flow_events fe ON fe.crossing_id = c.id
       WHERE c.user_id = $1 AND c.ended_at IS NOT NULL
       GROUP BY c.id, p.name, p.code
       ORDER BY c.started_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user!.userId, limit, offset]
    );

    return res.json(rows);
  } catch (err) {
    console.error('crossing history error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;