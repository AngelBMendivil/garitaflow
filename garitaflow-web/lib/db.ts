import { Pool } from "pg"
declare global { var _garitaflowPool: Pool | undefined }
function createPool() {
  const s = process.env.DATABASE_URL
  if (!s) throw new Error("DATABASE_URL no definida")
  return new Pool({ connectionString: s, max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 })
}
export const pool: Pool = process.env.NODE_ENV === "production" ? createPool() : (globalThis._garitaflowPool ??= createPool())
export async function query<T extends object = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
  const result = await pool.query<T>(sql, params)
  return result.rows
}
