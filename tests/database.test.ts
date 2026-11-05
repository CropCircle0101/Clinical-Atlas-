import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

test(
  "PostGIS migration, geography index, directory view and rollback work in a disposable schema",
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    const client = await pool.connect();
    const schema = `atlas_test_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    try {
      // TEST_DATABASE_URL must target a disposable test database, never production.
      await client.query("CREATE EXTENSION IF NOT EXISTS postgis");
      await client.query("BEGIN");
      await client.query(`CREATE SCHEMA ${schema}`);
      await client.query(`SET LOCAL search_path TO ${schema},public`);
      await client.query(
        await readFile(new URL("../db/migrations/001_initial.sql", import.meta.url), "utf8"),
      );
      await client.query(
        "INSERT INTO specialties VALUES('diagnostic-imaging','Diagnostic imaging')",
      );
      await client.query("INSERT INTO services VALUES('mri','MRI')");
      await client.query(
        "INSERT INTO clinics(id,slug,name,status) VALUES('test','test-clinic','Test clinic','published'),('draft','draft','Unpublished clinic','draft')",
      );
      await client.query(
        "INSERT INTO locations(id,clinic_id,address,city,state,postal_code,latitude,longitude) VALUES('location','test','100 Test Street','Boston','MA','02108',42.3601,-71.0589)",
      );
      await client.query("INSERT INTO clinic_specialties VALUES('test','diagnostic-imaging')");
      await client.query("INSERT INTO clinic_services VALUES('test','mri')");
      const result = await client.query(
        "SELECT c.id FROM clinics c JOIN locations l ON l.clinic_id=c.id WHERE c.status='published' AND c.is_demo=false AND ST_DWithin(l.coordinates,ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,$3)",
        [-71.0589, 42.3601, 1609.344],
      );
      assert.deepEqual(result.rows, [{ id: "test" }]);
      const { rows } = await client.query("SELECT * FROM clinic_directory WHERE id='test'");
      assert.equal(rows[0].locations[0].latitude, 42.3601);
      assert.equal(rows[0].services[0].id, "mri");
      assert.equal(rows[0].isDemo, false);
      assert.equal(rows[0].priceFrom, null);
      const indexes = await client.query(
        "SELECT indexdef FROM pg_indexes WHERE schemaname=$1 AND indexname='locations_coordinates_idx'",
        [schema],
      );
      assert.match(indexes.rows[0].indexdef, /gist/i);
      await assert.rejects(() =>
        client.query(
          "INSERT INTO locations(id,clinic_id,address,city,state,postal_code,latitude,longitude) VALUES('bad','test','100 Test','Boston','MA','02108',200,-71)",
        ),
      );
      await client.query("ROLLBACK");
    } finally {
      await client.query("ROLLBACK");
      client.release();
      await pool.end();
    }
  },
);
