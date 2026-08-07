import { Router, Response } from 'express';
import { query, queryOne } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { evaluateEligibility, awardCommunityContribution } from '../lib/gamification';

const router = Router();

// Event types supported
const VALID_EVENT_TYPES = [
  'slow_movement',
  'fast_movement',
  'lane_open',
  'lane_closed',
  'incident',
  'other',
];

// XP por tipo de reporte: los más útiles/urgentes valen más.
const XP_HIGH = ['lane_closed', 'incident'];
function xpForType(type: string): number {
  return XP_HIGH.includes(type) ? 25 : 20;
}

// GET /flow-events/:portId — recent community events for a port
router.get('/:portId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { portId } = req.params;
    const minutes = Number(req.query.minutes) || 60;

    const events = await query(
      `SELECT fe.id, fe.event_type, fe.lane_type, fe.description,
              fe.created_at,
              u.name as reporter_name,
              p.avatar_key as reporter_avatar,
              COUNT(fec.event_id)::int as confirmations,
              EXTRACT(EPOCH FROM (c.ended_at - c.started_at))::int AS crossing_seconds,
              CASE WHEN fe.event_type IN ('lane_closed','incident') THEN 25 ELSE 20 END AS xp,
              fe.geo_validation_status,
              fe.eligible_for_gamification
       FROM flow_events fe
       JOIN users u ON u.id = fe.user_id
       LEFT JOIN profiles p ON p.user_id = fe.user_id
       LEFT JOIN flow_event_confirmations fec ON fec.event_id = fe.id
       LEFT JOIN crossings c ON c.id = fe.crossing_id
       WHERE fe.port_id = $1
         AND fe.created_at > NOW() - ($2 || ' minutes')::INTERVAL
       GROUP BY fe.id, u.name, p.avatar_key, c.ended_at, c.started_at,
                fe.geo_validation_status, fe.eligible_for_gamification
       ORDER BY fe.created_at DESC
       LIMIT 50`,
      [portId, minutes]
    );

    return res.json(events);
  } catch (err) {
    console.error('flow-events list error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /flow-events — report a new event
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { port_id, crossing_id, event_type, lane_type, description, lat, lng, accuracy } = req.body;
    const userId = req.user!.userId;

    if (!port_id || !event_type) {
      return res.status(400).json({ error: 'port_id and event_type required' });
    }

    if (!VALID_EVENT_TYPES.includes(event_type)) {
      return res.status(400).json({
        error: `Invalid event_type. Valid: ${VALID_EVENT_TYPES.join(', ')}`,
      });
    }

    // Rate limit: max 10 events per hour per user per port
    const recentCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count
       FROM flow_events
       WHERE user_id = $1 AND port_id = $2
         AND created_at > NOW() - INTERVAL '1 hour'`,
      [userId, port_id]
    );

    if (Number(recentCount?.count || 0) >= 10) {
      return res.status(429).json({ error: 'Too many reports. Max 10 per hour per port.' });
    }

    // Elegibilidad para gamificación (geo + cooldown). No bloquea publicar.
    const elig = await evaluateEligibility({
      userId,
      crossingId: crossing_id || null,
      lat: typeof lat === 'number' ? lat : null,
      lng: typeof lng === 'number' ? lng : null,
      accuracy: typeof accuracy === 'number' ? accuracy : null,
      portId: port_id,
      laneType: lane_type || null,
    });

    const [event] = await query(
      `INSERT INTO flow_events
         (user_id, port_id, crossing_id, event_type, lane_type, description,
          geo_validation_status, eligible_for_gamification, lat, lng)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, event_type, lane_type, description, created_at,
                 geo_validation_status, eligible_for_gamification`,
      [
        userId, port_id, crossing_id || null, event_type, lane_type || null, description || null,
        elig.status, elig.eligible,
        typeof lat === 'number' ? lat : null,
        typeof lng === 'number' ? lng : null,
      ]
    );

    // XP por reporte (se mantiene para todos los reportes)
    const xpEarned = xpForType(event_type);
    await query(
      `UPDATE profiles SET total_xp = total_xp + $2 WHERE user_id = $1`,
      [userId, xpEarned]
    );

    // Badge comunitario: SOLO suma si el aporte es válido (geo + cooldown)
    if (elig.eligible) {
      await awardCommunityContribution(userId);
    }

    return res.status(201).json({
      ...event,
      xp_earned: xpEarned,
      geo_validation_status: elig.status,
      eligible_for_gamification: elig.eligible,
      eligibility_reason: elig.reason ?? null,
    });
  } catch (err) {
    console.error('flow-events create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /flow-events/:eventId/confirm — user confirms an event
router.post('/:eventId/confirm', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const userId = req.user!.userId;

    const event = await queryOne(
      `SELECT id, user_id FROM flow_events WHERE id = $1`,
      [eventId]
    );
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.user_id === userId) {
      return res.status(400).json({ error: 'Cannot confirm your own event' });
    }

    // Upsert confirmation (idempotent)
    await query(
      `INSERT INTO flow_event_confirmations (event_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (event_id, user_id) DO NOTHING`,
      [eventId, userId]
    );

    const [{ count }] = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM flow_event_confirmations WHERE event_id = $1`,
      [eventId]
    );

    return res.json({ confirmed: true, total_confirmations: Number(count) });
  } catch (err) {
    console.error('confirm event error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
