import { Router, Response } from 'express';
import { query, queryOne } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const VALID_CITIES = ['tijuana', 'mexicali', 'nogales', 'juarez', 'laredo', 'reynosa'];

// GET /profile — my profile
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await queryOne(
      `SELECT u.id, u.email, u.name, u.avatar_url,
              p.selected_city, p.selected_garita, p.avatar_key,
              p.total_xp, p.level, p.total_crossings,
              p.has_sentri, p.vehicle_key, p.vehicle_color,
              p.badges, p.updated_at
       FROM users u
       JOIN profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [req.user!.userId]
    );

    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    return res.json(profile);
  } catch (err) {
    console.error('profile get error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /profile — update preferences
router.patch('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { selected_city, selected_garita, avatar_key, name, has_sentri, vehicle_key, vehicle_color } = req.body;
    const userId = req.user!.userId;

    // Validate city if provided
    if (selected_city && !VALID_CITIES.includes(selected_city)) {
      return res.status(400).json({ error: `Invalid city. Valid: ${VALID_CITIES.join(', ')}` });
    }

    // Update profile fields
    const updates: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (selected_city !== undefined) {
      updates.push(`selected_city = $${i++}`);
      values.push(selected_city);
    }
    if (selected_garita !== undefined) {
      updates.push(`selected_garita = $${i++}`);
      values.push(selected_garita);
    }
    if (avatar_key !== undefined) {
      updates.push(`avatar_key = $${i++}`);
      values.push(avatar_key);
    }
    if (has_sentri !== undefined) {
      updates.push(`has_sentri = $${i++}`);
      values.push(!!has_sentri);
    }
    if (vehicle_key !== undefined) {
      updates.push(`vehicle_key = $${i++}`);
      values.push(vehicle_key);
    }
    if (vehicle_color !== undefined) {
      updates.push(`vehicle_color = $${i++}`);
      values.push(vehicle_color);
    }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      values.push(userId);
      await query(
        `UPDATE profiles SET ${updates.join(', ')} WHERE user_id = $${i}`,
        values
      );
    }

    // Update user name if provided
    if (name) {
      await query(`UPDATE users SET name = $1 WHERE id = $2`, [name, userId]);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('profile patch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /profile/stats — leaderboard stats
router.get('/stats', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { city } = req.query;

    const stats = await query(
      `SELECT u.name, p.avatar_key, p.total_xp, p.level, p.total_crossings,
              p.selected_city
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       WHERE ($1::text IS NULL OR p.selected_city = $1)
       ORDER BY p.total_xp DESC
       LIMIT 20`,
      [city || null]
    );

    return res.json(stats);
  } catch (err) {
    console.error('stats error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
