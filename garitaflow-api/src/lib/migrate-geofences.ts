/**
 * GaritaFlow — Fase B: activar validación por geocerca + sembrar corredores reales.
 *
 * - Enciende geo_validation_enabled = true (UPDATE; el seed original lo dejó en false).
 * - Lista los puertos existentes (para ver códigos/nombres reales).
 * - Siembra/actualiza geocercas buscando el puerto por coincidencia flexible (code o name),
 *   ya NO depende de que el code sea exactamente 'SAN_YSIDRO'/'OTAY'.
 * - Reporta cuántas geocercas activas quedaron por puerto.
 *
 * Idempotente. Run: npx ts-node src/lib/migrate-geofences.ts
 */
import { pool } from '../db';

type Fence = {
  match: string[];        // subcadenas a buscar en code o name (case-insensitive)
  name: string;           // nombre único de la geocerca
  direction: string;      // NB / SB
  polygon: number[][];    // [[lng,lat], ...] cubriendo la zona de fila del lado MX
};

// Polígonos amplios (buenos para "estás cerca de la garita"); se afinan luego con GPS de campo.
const FENCES: Fence[] = [
  {
    match: ['san_ysidro', 'ysidro', 'chaparral', 'puerta'],
    name: 'San Ysidro — zona de garita',
    direction: 'NB',
    polygon: [
      [-117.0385, 32.5328],
      [-117.0248, 32.5328],
      [-117.0248, 32.5438],
      [-117.0385, 32.5438],
    ],
  },
  {
    match: ['otay', 'mesa de otay'],
    name: 'Otay — zona de garita',
    direction: 'NB',
    polygon: [
      [-116.9445, 32.5378],
      [-116.9318, 32.5378],
      [-116.9318, 32.5482],
      [-116.9445, 32.5482],
    ],
  },
];

async function run() {
  console.log('🔄 Fase B: activando validación por geocerca...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) Encender el flag (UPDATE real, no DO NOTHING)
    await client.query(
      `INSERT INTO gamification_config (key, value)
         VALUES ('geo_validation_enabled', 'true')
       ON CONFLICT (key) DO UPDATE
         SET value = 'true', updated_at = NOW()`
    );
    console.log('✅ geo_validation_enabled = true');

    // 2) Diagnóstico: puertos existentes (para ver los códigos reales)
    const ports = await client.query<{ id: number; code: string | null; name: string | null }>(
      `SELECT id, code, name FROM ports ORDER BY id`
    );
    console.log('🛂 Puertos en BD:');
    for (const p of ports.rows) {
      console.log(`   #${p.id}  code=${p.code ?? '—'}  name=${p.name ?? '—'}`);
    }

    // 3) Sembrar / actualizar geocercas por coincidencia flexible
    for (const f of FENCES) {
      const port = ports.rows.find((p) =>
        f.match.some((m) => {
          const needle = m.toLowerCase();
          return (
            String(p.code ?? '').toLowerCase().includes(needle) ||
            String(p.name ?? '').toLowerCase().includes(needle)
          );
        })
      );

      if (!port) {
        console.log(`⚠️  Sin puerto para "${f.name}" (match: ${f.match.join(', ')}). Saltando.`);
        continue;
      }

      const existing = await client.query<{ id: number }>(
        `SELECT id FROM geofences WHERE port_id = $1 AND name = $2`,
        [port.id, f.name]
      );

      if (existing.rows.length) {
        await client.query(
          `UPDATE geofences
              SET polygon = $1::jsonb, direction = $2, active = TRUE
            WHERE id = $3`,
          [JSON.stringify(f.polygon), f.direction, existing.rows[0].id]
        );
        console.log(`♻️  Geocerca actualizada: ${f.name} → puerto #${port.id}`);
      } else {
        await client.query(
          `INSERT INTO geofences (port_id, name, lane_type, direction, polygon, active)
           VALUES ($1, $2, NULL, $3, $4::jsonb, TRUE)`,
          [port.id, f.name, f.direction, JSON.stringify(f.polygon)]
        );
        console.log(`✅ Geocerca creada: ${f.name} → puerto #${port.id}`);
      }
    }

    // 4) Resumen de geocercas activas por puerto
    const counts = await client.query<{ name: string | null; fences: string }>(
      `SELECT p.name, COUNT(g.id)::text AS fences
         FROM ports p
         LEFT JOIN geofences g ON g.port_id = p.id AND g.active = TRUE
        GROUP BY p.id, p.name
        ORDER BY p.id`
    );
    console.log('📍 Geocercas activas por puerto:');
    for (const r of counts.rows) console.log(`   ${r.name ?? '—'}: ${r.fences}`);

    await client.query('COMMIT');
    console.log('✅ Fase B lista: geocercas activas y validación encendida.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Falló:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
