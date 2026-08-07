import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getBadges, getUserBadges } from '../lib/gamification';

const router = Router();

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
