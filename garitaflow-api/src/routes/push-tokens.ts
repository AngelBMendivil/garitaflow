import { Router, Response } from 'express';
import { query, queryOne } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /push-tokens — register or refresh device token
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { token, platform } = req.body;
    const userId = req.user!.userId;

    if (!token || !platform) {
      return res.status(400).json({ error: 'token and platform required' });
    }

    if (!['ios', 'android', 'web'].includes(platform)) {
      return res.status(400).json({ error: 'platform must be ios, android, or web' });
    }

    // Upsert: update owner if token already exists (device re-used by different account)
    await query(
      `INSERT INTO push_tokens (user_id, token, platform, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (token) DO UPDATE
         SET user_id = EXCLUDED.user_id,
             platform = EXCLUDED.platform,
             updated_at = NOW()`,
      [userId, token, platform]
    );

    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('push-tokens register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /push-tokens/:token — unregister (logout / disable notifications)
router.delete('/:token', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.params;
    const userId = req.user!.userId;

    await query(
      `DELETE FROM push_tokens WHERE token = $1 AND user_id = $2`,
      [token, userId]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('push-tokens delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
