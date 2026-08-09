import { Request, Response, NextFunction } from 'express';

// Rate limiter en memoria (sin dependencias). Suficiente para una sola
// instancia en Railway; si algún día se escala horizontalmente, migrar a Redis.
// Ventana deslizante simple por clave (IP por defecto).

type Bucket = { count: number; resetAt: number };

export function rateLimit(opts: {
  windowMs: number;
  max: number;
  keyFn?: (req: Request) => string;
  message?: string;
}) {
  const { windowMs, max } = opts;
  const message = opts.message || 'Demasiadas solicitudes, intenta más tarde.';
  const keyFn = opts.keyFn || ((req: Request) => {
    const fwd = req.headers['x-forwarded-for'];
    const ip = Array.isArray(fwd) ? fwd[0] : (fwd || '').split(',')[0].trim();
    return ip || req.ip || req.socket.remoteAddress || 'unknown';
  });

  const buckets = new Map<string, Bucket>();

  // Limpieza periódica para no acumular memoria (cada ventana).
  let lastSweep = 0;
  function sweep(now: number) {
    if (now - lastSweep < windowMs) return;
    lastSweep = now;
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }

  return function (req: Request, res: Response, next: NextFunction) {
    const now = Date.now();
    sweep(now);

    const key = keyFn(req);
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retry = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retry));
      return res.status(429).json({ error: message });
    }
    next();
  };
}
