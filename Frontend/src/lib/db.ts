// Configura y reutiliza el pool de conexiones PostgreSQL de la aplicación.
import { Pool } from "pg";

const globalForPostgres = globalThis as typeof globalThis & {
  postgresPool?: Pool;
};

/**
 * Devuelve el pool PostgreSQL compartido para el proceso actual.
 * @returns Pool de conexiones de la base de datos.
 * @throws Error cuando DATABASE_URL no está configurada.
 */
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