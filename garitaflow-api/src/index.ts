import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

import authRouter from './routes/auth';
import flowIndexRouter from './routes/flow-index';
import crossingsRouter from './routes/crossings';
import flowEventsRouter from './routes/flow-events';
import profileRouter from './routes/profile';
import pushTokensRouter from './routes/push-tokens';
import alertsRouter from './routes/alerts';
import cronRouter from './routes/cron';
import portsRouter from './routes/ports';
import gamificationRouter from './routes/gamification';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Security
app.use(helmet());

const allowedOrigins = [
  'https://garitaflow.com',
  'https://www.garitaflow.com',
];

// En desarrollo Expo toma el primer puerto libre (8081, 8083, 19006...).
// Este patrón acepta cualquier puerto de localhost, anclado con ^ y $ para
// que un dominio tipo http://localhost.sitio-falso.com no pase el filtro.
const localOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;
const allowLocal = process.env.ALLOW_LOCAL_ORIGINS === 'true';

app.use(cors({
  origin: (origin, callback) => {
    // Sin header Origin = app nativa, curl o Postman. Se permite.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (allowLocal && localOriginPattern.test(origin)) return callback(null, true);
   return callback(null, false);
  },
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10kb' }));

// Global rate limit: 100 req/min per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down' },
});
app.use(globalLimiter);

// Strict rate limit for auth: 10 req/min
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts' },
});

// Health check (no auth)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authLimiter, authRouter);
app.use('/flow-index', flowIndexRouter);
app.use('/crossings', crossingsRouter);
app.use('/flow-events', flowEventsRouter);
app.use('/profile', profileRouter);
app.use('/push-tokens', pushTokensRouter);
app.use('/alerts', alertsRouter);
app.use('/cron', cronRouter);
app.use('/ports', portsRouter);
app.use('/gamification', gamificationRouter);

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 GaritaFlow API running on port ${PORT}`);
  console.log(`   ENV: ${process.env.NODE_ENV || 'development'}`);
});

export default app;