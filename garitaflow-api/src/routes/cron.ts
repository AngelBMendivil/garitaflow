import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// Simple secret check for cron endpoints
function requireCronSecret(req: Request, res: Response): boolean {
  const secret = req.headers['x-cron-secret'] || req.query.secret;
  if (!secret || secret !== process.env.CRON_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

// POST /cron/refresh-flow-index
// Called by Railway cron or cron-job.org every 2 minutes
// Refreshes flow index cache for all ports
router.post('/refresh-flow-index', async (req: Request, res: Response) => {
  if (!requireCronSecret(req, res)) return;

  try {
    const ports = await query<{ id: string }>(`SELECT id FROM ports`);
    const results: { portId: string; score: number | null; error?: string }[] = [];

    for (const port of ports) {
      try {
        const [result] = await query(
          `SELECT * FROM calculate_flow_index($1)`,
          [port.id]
        );

        if (result) {
          await query(
            `INSERT INTO flow_index_cache (port_id, score, components, computed_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (port_id) DO UPDATE
               SET score = EXCLUDED.score,
                   components = EXCLUDED.components,
                   computed_at = EXCLUDED.computed_at`,
            [port.id, result.score, result.components]
          );
          results.push({ portId: port.id, score: result.score });
        }
      } catch (portErr) {
        results.push({ portId: port.id, score: null, error: String(portErr) });
      }
    }

    return res.json({ refreshed: results.length, results });
  } catch (err) {
    console.error('cron refresh-flow-index error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /cron/cleanup — purge old data to keep DB lean
// Run daily: removes flow_events older than 24h, old cache entries
router.post('/cleanup', async (req: Request, res: Response) => {
  if (!requireCronSecret(req, res)) return;

  try {
    const [eventsResult] = await query<{ count: string }>(
      `WITH deleted AS (
         DELETE FROM flow_events
         WHERE created_at < NOW() - INTERVAL '24 hours'
         RETURNING id
       ) SELECT COUNT(*)::text as count FROM deleted`
    );

    const [cacheResult] = await query<{ count: string }>(
      `WITH deleted AS (
         DELETE FROM flow_index_cache
         WHERE computed_at < NOW() - INTERVAL '3 hours'
         RETURNING port_id
       ) SELECT COUNT(*)::text as count FROM deleted`
    );

    return res.json({
      events_deleted: Number(eventsResult?.count || 0),
      cache_entries_deleted: Number(cacheResult?.count || 0),
    });
  } catch (err) {
    console.error('cron cleanup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /cron/health — simple health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
