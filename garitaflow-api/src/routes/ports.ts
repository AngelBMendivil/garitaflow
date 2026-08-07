import { Router, Response } from 'express';
import { query } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /ports?city=tijuana — garitas con sus modos y carriles reales
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const city = req.query.city ? String(req.query.city) : null;

    const ports = await query(
      `SELECT p.id, p.code, p.name, p.city, p.is_active,
              COALESCE(
                json_agg(
                  json_build_object('mode', lt.mode, 'lane_type', lt.lane_type)
                  ORDER BY lt.mode, lt.lane_type
                ) FILTER (WHERE lt.id IS NOT NULL),
                '[]'
              ) AS lanes
       FROM ports p
       LEFT JOIN lane_types lt ON lt.port_id = p.id AND lt.is_active = TRUE
       WHERE p.is_active = TRUE
         AND ($1::text IS NULL OR p.city = $1)
       GROUP BY p.id, p.code, p.name, p.city, p.is_active
       ORDER BY p.id`,
      [city]
    );

    return res.json(ports);
  } catch (err) {
    console.error('ports list error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /ports/cities — ciudades disponibles con su número de garitas
router.get('/cities', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const cities = await query(
      `SELECT city, COUNT(*)::int AS ports
       FROM ports
       WHERE is_active = TRUE AND city IS NOT NULL
       GROUP BY city
       ORDER BY city`,
      []
    );
    return res.json(cities);
  } catch (err) {
    console.error('cities error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /ports/:portId/lane-types — carriles disponibles en una garita
router.get('/:portId/lane-types', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { portId } = req.params;
    const laneTypes = await query(
      `SELECT id, lane_type, mode
       FROM lane_types
       WHERE port_id = $1 AND is_active = TRUE
       ORDER BY mode, lane_type`,
      [portId]
    );
    return res.json(laneTypes);
  } catch (err) {
    console.error('lane-types error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;