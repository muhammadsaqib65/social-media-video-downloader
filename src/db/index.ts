import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

type DbClient = ReturnType<typeof drizzle>;

function createNoopDb(): DbClient {
  return {
    execute: async () => ({ rows: [], rowCount: 0 }),
    insert: () => ({
      values: async () => ({ rows: [], rowCount: 0 }),
    }),
  } as unknown as DbClient;
}

export const hasDatabase = Boolean(databaseUrl);

export const pool = databaseUrl
  ? globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({
      connectionString: databaseUrl,
    })
  : null;

if (process.env.NODE_ENV !== "production" && pool) {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = pool ? drizzle(pool) : createNoopDb();
