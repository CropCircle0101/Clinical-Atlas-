import { Pool } from "pg";

const globalForDb = globalThis as unknown as { clinicPool?: Pool };
export function getPool() {
  if (!process.env.DATABASE_URL) throw new Error("Database not configured");
  if (!globalForDb.clinicPool)
    globalForDb.clinicPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 8000,
    });
  return globalForDb.clinicPool;
}
export function isDemoMode() {
  return (
    process.env.DEMO_MODE === "true" ||
    (!process.env.DATABASE_URL &&
      process.env.NODE_ENV !== "production" &&
      process.env.DEMO_MODE !== "false")
  );
}
