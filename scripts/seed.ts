import { demoClinics } from "../src/data/demo";
import { getPool } from "../src/lib/db";
async function main() {
  const pool = getPool(),
    client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const c of demoClinics) {
      const existing = await client.query(
        "INSERT INTO clinics(id,slug,name,description,is_demo,status,telehealth,price_from,price_note) VALUES($1,$2,$3,$4,true,'draft',$5,$6,$7) ON CONFLICT(id) DO NOTHING RETURNING id",
        [c.id, c.slug, c.name, c.description, c.telehealth, c.priceFrom, c.priceNote],
      );
      if (!existing.rowCount) continue;
      for (const l of c.locations)
        await client.query(
          "INSERT INTO locations(id,clinic_id,address,city,state,postal_code,latitude,longitude) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
          [l.id, c.id, l.address, l.city, l.state, l.postalCode, l.latitude, l.longitude],
        );
      for (const s of c.specialties)
        await client.query("INSERT INTO clinic_specialties VALUES($1,$2)", [c.id, s.id]);
      for (const s of c.services)
        await client.query("INSERT INTO clinic_services VALUES($1,$2)", [c.id, s.id]);
      for (const name of c.insurance)
        await client.query("INSERT INTO clinic_insurance VALUES($1,$2)", [c.id, name]);
      for (const v of c.sources)
        await client.query(
          "INSERT INTO verification_sources(id,clinic_id,label,url,scope) VALUES($1,$2,$3,$4,$5)",
          [v.id, c.id, v.label, v.url, v.scope],
        );
    }
    await client.query("COMMIT");
    console.log(
      "Fictional database fixtures seeded as drafts. Live discovery always excludes them.",
    );
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(() => {
  console.error("Seed failed. Run migrations first and verify the database connection.");
  process.exitCode = 1;
});
