import { readFile } from "node:fs/promises";
import { getPool } from "../src/lib/db";
import { services, specialties } from "../src/lib/catalog";
async function main() {
  const pool = getPool(),
    client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(6241921)");
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    const { rowCount } = await client.query(
      "SELECT version FROM schema_migrations WHERE version='001'",
    );
    if (!rowCount) {
      await client.query(
        await readFile(new URL("../db/migrations/001_initial.sql", import.meta.url), "utf8"),
      );
      await client.query("INSERT INTO schema_migrations(version) VALUES('001')");
    }
    for (const s of specialties)
      await client.query(
        "INSERT INTO specialties(id,name) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name",
        [s.id, s.name],
      );
    for (const s of services)
      await client.query(
        "INSERT INTO services(id,name) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name",
        [s.id, s.name],
      );
    await client.query("COMMIT");
    console.log("ClinicAtlas schema and catalog are ready.");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    "Migration failed. Check the database connection, PostGIS privileges and schema state.",
  );
  process.exitCode = 1;
});
