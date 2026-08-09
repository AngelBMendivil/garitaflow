import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { rateLimit } from '../lib/rate-limit';

const router = Router();

// Límite anti-abuso: la ruta es pública, así que topamos por IP.
// 30 logs / minuto por IP es holgado para un cliente honesto y frena floods.
const logsLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  message: 'Demasiados registros, intenta más tarde.',
});

// POST /logs — bitácora del cliente. Pública a propósito (los fallos de red
// pueden ocurrir sin sesión); si viene token, se asocia el user_id. Best-effort.
router.post('/', logsLimiter, async (req: Request, res: Response) => {
  try {
    const { level, event, message, context, platform, app_version } = req.body || {};
    if (!event) return res.status(400).json({ error: 'event requerido' });

    // user_id opcional desde el token si viene
    let userId: string | null = null;
    const auth = req.headers['authorization'];
    if (auth && auth.startsWith('Bearer ') && process.env.JWT_SECRET) {
      try {
        const payload: any = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
        userId = payload.userId || payload.sub || null;
      } catch {
        // token inválido → log anónimo
      }
    }

    await query(
      `INSERT INTO client_logs (user_id, level, event, message, context, platform, app_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        ['error', 'warn', 'info'].includes(level) ? level : 'error',
        String(event).slice(0, 120),
        message ? String(message).slice(0, 500) : null,
        context ? JSON.stringify(context).slice(0, 4000) : null,
        platform ? String(platform).slice(0, 40) : null,
        app_version ? String(app_version).slice(0, 40) : null,
      ]
    );
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error('logs error:', err);
    // nunca fallar ruidosamente en la bitácora
    return res.status(200).json({ ok: false });
  }
});

export default router;
