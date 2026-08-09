import { Router, Response } from 'express';
import { query, queryOne } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const VALID_MODES = ['VEHICULAR', 'PEDESTRIAN'];
const VALID_SENS = ['low', 'medium', 'high'];
const HHMM = /^(\d{1,2}):(\d{2})$/;

function validDays(d: any): number[] | null {
  if (!Array.isArray(d)) return null;
  const out = d.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  return out.length ? Array.from(new Set(out)).sort() : null;
}

// GET /recurring — alarmas del usuario
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const rows = await query(
      `SELECT rc.id, rc.port_id, rc.lane_type, rc.mode, rc.days_of_week,
              rc.target_time, rc.lead_minutes, rc.sensitivity, rc.active,
              p.name AS port_name, p.code AS port_code
         FROM recurring_crossings rc
         JOIN ports p ON p.id = rc.port_id
        WHERE rc.user_id = $1
        ORDER BY rc.target_time`,
      [req.user!.userId]
    );
    return res.json(rows);
  } catch (err) {
    console.error('recurring list error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /recurring — crear alarma
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      port_id,
      lane_type = 'GENERAL',
      mode = 'VEHICULAR',
      days_of_week,
      target_time,
      lead_minutes = 45,
      sensitivity = 'medium',
    } = req.body || {};

    if (!port_id) return res.status(400).json({ error: 'port_id requerido' });
    if (!HHMM.test(String(target_time || ''))) {
      return res.status(400).json({ error: 'target_time debe ser HH:MM' });
    }
    const m = String(mode).toUpperCase();
    if (!VALID_MODES.includes(m)) return res.status(400).json({ error: 'mode inválido' });
    if (!VALID_SENS.includes(sensitivity)) return res.status(400).json({ error: 'sensitivity inválida' });
    const days = validDays(days_of_week) ?? [1, 2, 3, 4, 5];
    const lead = Math.max(5, Math.min(240, Number(lead_minutes) || 45));

    const port = await queryOne('SELECT id FROM ports WHERE id = $1', [port_id]);
    if (!port) return res.status(404).json({ error: 'Garita no encontrada' });

    const [row] = await query(
      `INSERT INTO recurring_crossings
         (user_id, port_id, lane_type, mode, days_of_week, target_time, lead_minutes, sensitivity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, port_id, lane_type, mode, days_of_week, target_time, lead_minutes, sensitivity, active`,
      [req.user!.userId, port_id, String(lane_type).toUpperCase(), m, days, target_time, lead, sensitivity]
    );
    return res.status(201).json(row);
  } catch (err) {
    console.error('recurring create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /recurring/:id — actualizar (activar/pausar, cambiar horario, etc.)
router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const owned = await queryOne(
      `SELECT id FROM recurring_crossings WHERE id = $1 AND user_id = $2`,
      [id, req.user!.userId]
    );
    if (!owned) return res.status(404).json({ error: 'Alarma no encontrada' });

    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    const b = req.body || {};

    if (b.target_time !== undefined) {
      if (!HHMM.test(String(b.target_time))) return res.status(400).json({ error: 'target_time debe ser HH:MM' });
      fields.push(`target_time = $${i++}`); values.push(b.target_time);
    }
    if (b.lead_minutes !== undefined) {
      fields.push(`lead_minutes = $${i++}`); values.push(Math.max(5, Math.min(240, Number(b.lead_minutes) || 45)));
    }
    if (b.sensitivity !== undefined) {
      if (!VALID_SENS.includes(b.sensitivity)) return res.status(400).json({ error: 'sensitivity inválida' });
      fields.push(`sensitivity = $${i++}`); values.push(b.sensitivity);
    }
    if (b.days_of_week !== undefined) {
      const days = validDays(b.days_of_week);
      if (!days) return res.status(400).json({ error: 'days_of_week inválido' });
      fields.push(`days_of_week = $${i++}`); values.push(days);
    }
    if (b.lane_type !== undefined) { fields.push(`lane_type = $${i++}`); values.push(String(b.lane_type).toUpperCase()); }
    if (b.mode !== undefined) {
      const m = String(b.mode).toUpperCase();
      if (!VALID_MODES.includes(m)) return res.status(400).json({ error: 'mode inválido' });
      fields.push(`mode = $${i++}`); values.push(m);
    }
    if (b.active !== undefined) { fields.push(`active = $${i++}`); values.push(!!b.active); }

    if (!fields.length) return res.status(400).json({ error: 'Nada que actualizar' });
    fields.push(`updated_at = NOW()`);
    values.push(id);

    const [row] = await query(
      `UPDATE recurring_crossings SET ${fields.join(', ')} WHERE id = $${i}
       RETURNING id, port_id, lane_type, mode, days_of_week, target_time, lead_minutes, sensitivity, active`,
      values
    );
    return res.json(row);
  } catch (err) {
    console.error('recurring update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /recurring/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM recurring_crossings WHERE id = $1 AND user_id = $2`, [id, req.user!.userId]);
    return res.json({ deleted: true });
  } catch (err) {
    console.error('recurring delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
