import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db';
import { hashPassword, comparePassword, validatePassword } from '../lib/password';
import { signToken } from '../lib/jwt';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

type AuthUser = {
  id: string;
  email: string;
  name: string;
  created_at?: string;
};

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'email, password and name are required' });
    }

    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ error: pwError });

    const existing = await queryOne(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hash = await hashPassword(password);

    const user = await queryOne<AuthUser>(
      `INSERT INTO users (email, password_hash, name, auth_provider)
       VALUES ($1, $2, $3, 'email')
       RETURNING id, email, name, created_at`,
      [email.toLowerCase(), hash, name]
    );

    if (!user) {
      return res.status(500).json({ error: 'Could not create user' });
    }

    // Create default profile
    await query(
      `INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
      [user.id]
    );

    const token = signToken({ userId: user.id, email: user.email });
    return res.status(201).json({ token, user });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await queryOne<{
      id: string;
      email: string;
      name: string;
      password_hash: string;
    }>(
      'SELECT id, email, name, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ userId: user.id, email: user.email });
    return res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/google — receive Google ID token, create or link account
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { google_id, email, name, avatar_url } = req.body;

    if (!google_id || !email) {
      return res.status(400).json({ error: 'google_id and email required' });
    }

    // Find or create user
    let user = await queryOne<AuthUser>(
      `SELECT id, email, name FROM users
       WHERE provider_id = $1 OR (email = $2 AND auth_provider = 'google')`,
      [google_id, email.toLowerCase()]
    );

    if (!user) {
      const created = await queryOne<AuthUser>(
        `INSERT INTO users (email, name, auth_provider, provider_id, avatar_url)
         VALUES ($1, $2, 'google', $3, $4)
         RETURNING id, email, name`,
        [email.toLowerCase(), name, google_id, avatar_url]
      );

      if (!created) {
        return res.status(500).json({ error: 'Could not create user' });
      }

      user = created;

      await query(`INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [user.id]);
    }

    const token = signToken({ userId: user.id, email: user.email });
    return res.json({ token, user });
  } catch (err) {
    console.error('google auth error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /auth/me — elimina la cuenta del usuario y todos sus datos.
// Requisito de Google Play (borrado de cuenta dentro de la app).
// Se apoya en ON DELETE CASCADE de las FKs; además limpiamos de forma
// explícita las tablas que pudieran no tener cascada, sin fallar si no existen.
router.delete('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Borrados explícitos best-effort (por si alguna tabla no tiene cascada).
    // Cada uno va en su try para no abortar el flujo si la tabla no existe.
    const softTables = [
      'client_logs',
      'recurring_notifications_log',
      'recurring_crossings',
      'push_tokens',
      'crossings',
      'flow_events',
      'profiles',
    ];
    for (const t of softTables) {
      try {
        await query(`DELETE FROM ${t} WHERE user_id = $1`, [userId]);
      } catch {
        // tabla inexistente o sin columna user_id → se ignora
      }
    }

    const del = await queryOne<{ id: string }>(
      `DELETE FROM users WHERE id = $1 RETURNING id`,
      [userId]
    );

    if (!del) return res.status(404).json({ error: 'User not found' });
    return res.json({ ok: true, deleted: del.id });
  } catch (err) {
    console.error('delete account error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await queryOne(
      `SELECT u.id, u.email, u.name, u.avatar_url,
              p.selected_city, p.selected_garita, p.avatar_key,
              p.total_xp, p.level, p.total_crossings,
              p.has_sentri, p.vehicle_key, p.vehicle_color
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [req.user!.userId]
    );

    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err) {
    console.error('me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;