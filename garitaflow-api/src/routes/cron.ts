import { Router, Request, Response } from 'express';
import { query } from '../db';
import { evaluateAlarms } from '../lib/alarms';

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

    // `refreshed` contaba results.length, que incluye los errores: un fracaso
    // total de 13/13 se reportaba como 200 {"refreshed":13} y los logs se veían
    // sanos. Ahora se cuentan solo los éxitos y, si fallaron todas, responde 500
    // para que el scheduler y el monitoreo se enteren.
    const ok = results.filter((r) => r.score !== null);
    const failed = results.filter((r) => r.error);
    const payload = {
      refreshed: ok.length,
      failed: failed.length,
      total: results.length,
      results,
    };
    if (results.length > 0 && ok.length === 0) {
      console.error(
        `cron refresh-flow-index: 0/${results.length} puertos actualizados. Primer error: ${failed[0]?.error}`
      );
      return res.status(500).json({ ...payload, error: 'Ningún puerto pudo actualizarse' });
    }
    return res.json(payload);
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

    // Retención de datos: purga best-effort de tablas que crecen con el uso.
    // Cada una en su try para no abortar si la tabla aún no existe en el entorno.
    async function purge(sql: string): Promise<number> {
      try {
        const [r] = await query<{ count: string }>(sql);
        return Number(r?.count || 0);
      } catch {
        return 0;
      }
    }

    const logsDeleted = await purge(
      `WITH deleted AS (
         DELETE FROM client_logs
         WHERE created_at < NOW() - INTERVAL '90 days'
         RETURNING id
       ) SELECT COUNT(*)::text as count FROM deleted`
    );

    const notifLogDeleted = await purge(
      `WITH deleted AS (
         DELETE FROM recurring_notifications_log
         WHERE created_at < NOW() - INTERVAL '45 days'
         RETURNING id
       ) SELECT COUNT(*)::text as count FROM deleted`
    );

    const pingsDeleted = await purge(
      `WITH deleted AS (
         DELETE FROM user_location_pings
         WHERE created_at < NOW() - INTERVAL '30 days'
         RETURNING id
       ) SELECT COUNT(*)::text as count FROM deleted`
    );

    // Auto-cierre de cruces olvidados (abiertos > 12h). Se cierran con
    // duration_seconds = NULL para NO contaminar el promedio de la comunidad
    // (esos promedios exigen duration_seconds > 0). Esto desatora al usuario
    // que quedó con un cruce fantasma bloqueando el inicio de uno nuevo.
    const staleClosed = await purge(
      `WITH closed AS (
         UPDATE crossings
            SET ended_at = NOW(), duration_seconds = NULL
          WHERE ended_at IS NULL
            AND started_at < NOW() - INTERVAL '12 hours'
          RETURNING id
       ) SELECT COUNT(*)::text as count FROM closed`
    );

    return res.json({
      events_deleted: Number(eventsResult?.count || 0),
      cache_entries_deleted: Number(cacheResult?.count || 0),
      client_logs_deleted: logsDeleted,
      recurring_notif_log_deleted: notifLogDeleted,
      location_pings_deleted: pingsDeleted,
      stale_crossings_closed: staleClosed,
    });
  } catch (err) {
    console.error('cron cleanup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /cron/evaluate-alarms — evalúa alarmas de cruce y envía avisos predictivos.
// Llamar cada ~5 min (Railway cron o cron-job.org).
router.post('/evaluate-alarms', async (req: Request, res: Response) => {
  if (!requireCronSecret(req, res)) return;
  try {
    const result = await evaluateAlarms();
    return res.json(result);
  } catch (err) {
    console.error('cron evaluate-alarms error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /cron/health — simple health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
