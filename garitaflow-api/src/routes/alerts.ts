import { Router, Response } from 'express';
import { query, queryOne } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const VALID_ALERT_TYPES = ['flow_drop', 'congestion', 'incident', 'lane_closed', 'fast_movement'];
const VALID_FREQUENCIES = ['immediate', 'hourly', 'daily'];

// GET /alerts — all alert settings for current user
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const alerts = await query(
      `SELECT ua.id, ua.port_id, p.name as port_name,
              ua.enabled, ua.alert_types, ua.frequency,
              ua.quiet_start, ua.quiet_end, ua.updated_at
       FROM user_alerts ua
       JOIN ports p ON p.id = ua.port_id
       WHERE ua.user_id = $1
       ORDER BY p.name`,
      [req.user!.userId]
    );

    return res.json(alerts);
  } catch (err) {
    console.error('alerts get error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /alerts/:portId — create or update alert for a port
router.put('/:portId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { portId } = req.params;
    const userId = req.user!.userId;
    const { enabled, alert_types, frequency, quiet_start, quiet_end } = req.body;

    // Validate port
    const port = await queryOne('SELECT id FROM ports WHERE id = $1', [portId]);
    if (!port) return res.status(404).json({ error: 'Port not found' });

    // Validate alert_types
    if (alert_types) {
      const invalid = alert_types.filter((t: string) => !VALID_ALERT_TYPES.includes(t));
      if (invalid.length > 0) {
        return res.status(400).json({ error: `Invalid alert types: ${invalid.join(', ')}` });
      }
    }

    if (frequency && !VALID_FREQUENCIES.includes(frequency)) {
      return res.status(400).json({
        error: `Invalid frequency. Valid: ${VALID_FREQUENCIES.join(', ')}`,
      });
    }

    const [alert] = await query(
      `INSERT INTO user_alerts
         (user_id, port_id, enabled, alert_types, frequency, quiet_start, quiet_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, port_id) DO UPDATE
         SET enabled = COALESCE(EXCLUDED.enabled, user_alerts.enabled),
             alert_types = COALESCE(EXCLUDED.alert_types, user_alerts.alert_types),
             frequency = COALESCE(EXCLUDED.frequency, user_alerts.frequency),
             quiet_start = EXCLUDED.quiet_start,
             quiet_end = EXCLUDED.quiet_end,
             updated_at = NOW()
       RETURNING *`,
      [
        userId,
        portId,
        enabled ?? true,
        alert_types ?? ['flow_drop', 'congestion', 'incident'],
        frequency ?? 'immediate',
        quiet_start || null,
        quiet_end || null,
      ]
    );

    return res.json(alert);
  } catch (err) {
    console.error('alerts put error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /alerts/:portId — remove alert subscription
router.delete('/:portId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await query(
      `DELETE FROM user_alerts WHERE user_id = $1 AND port_id = $2`,
      [req.user!.userId, req.params.portId]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('alerts delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
