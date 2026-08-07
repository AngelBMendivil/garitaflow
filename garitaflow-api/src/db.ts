import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Railway $5 plan: max 10 connections total
// Reserve 1 for web app, use 9 here (safe at 8)
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 8,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export async function queryOne<T = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
