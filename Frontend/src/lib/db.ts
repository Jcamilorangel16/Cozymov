import { Pool } from "pg";

const globalForPostgres = globalThis as typeof globalThis & {
  postgresPool?: Pool;
};

export function getDbPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no está configurada.");
  }

  if (!globalForPostgres.postgresPool) {
    globalForPostgres.postgresPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  return globalForPostgres.postgresPool;
}