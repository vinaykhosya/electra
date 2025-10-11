import { Pool, QueryResultRow } from "pg";

const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
  throw new Error("Missing SUPABASE_DB_URL environment variable");
}

export const pool = new Pool({ connectionString });

export const runQuery = <T extends QueryResultRow>(text: string, params: unknown[] = []) =>
  pool.query<T>(text, params);

export async function withTransaction<T>(
  handler: (client: import("pg").PoolClient) => Promise<T>,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await handler(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}