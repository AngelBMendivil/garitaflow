import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getBadges, getUserBadges } from '../lib/gamification';
import { query } from '../db';

const router = Router();

// GET /gamification/geofences?portId= — polígonos activos de una garita (para el detector en vivo de la app)
router.get('/geofences', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const portId = req.query.portId ? Number(req.query.portId) : null;
    if (!portId || Number.isNaN(portId)) {
      return res.status(400).json({ error: 'portId requerido' });
    }
    const fences = await query(
      `SELECT id, name, lane_type, direction, polygon, minimum_stay_seconds
         FROM geofences
        WHERE port_id = $1 AND active = TRUE
        ORDER BY id`,
      [portId]
    );
    return res.json(fences);
  } catch (err) {
    console.error('gamification geofences error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /gamification/badges — catálogo completo de badges (la app lo lee; editable en BD)
router.get('/badges', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const badges = await getBadges();
    return res.json(badges);
  } catch (err) {
    console.error('gamification badges error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /gamification/me — progreso de los dos badges del usuario
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const progress = await getUserBadges(req.user!.userId);
    return res.json(progress);
  } catch (err) {
    console.error('gamification me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
