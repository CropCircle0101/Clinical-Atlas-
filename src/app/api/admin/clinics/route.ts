import { randomUUID } from "node:crypto";
import { getPool } from "@/lib/db";
import { draftSchema } from "@/lib/validation";
import { requireAdmin } from "@/lib/admin";
import { errorResponse, HttpError, json, readBody } from "@/lib/http";
import { getReviewQueue } from "@/lib/repository";
export async function GET(request: Request) {
  try {
    requireAdmin(request, false);
    return json({ clinics: await getReviewQueue() });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    requireAdmin(request);
    const parsed = draftSchema.safeParse(await readBody(request, 30000));
    if (!parsed.success)
      throw new HttpError(400, parsed.error.issues[0]?.message || "Invalid draft");
    const d = parsed.data,
      id = randomUUID(),
      slug = `${d.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}-${id.slice(0, 8)}`;
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO clinics(id,slug,name,description,website,phone,telehealth,price_from,price_note) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [
          id,
          slug,
          d.name,
          d.description,
          d.website,
          d.phone,
          d.telehealth,
          d.priceFrom,
          d.priceNote,
        ],
      );
      const l = d.location;
      await client.query(
        "INSERT INTO locations(id,clinic_id,address,city,state,postal_code,latitude,longitude) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
        [randomUUID(), id, l.address, l.city, l.state, l.postalCode, l.latitude, l.longitude],
      );
      for (const sid of d.specialtyIds)
        await client.query("INSERT INTO clinic_specialties VALUES($1,$2) ON CONFLICT DO NOTHING", [
          id,
          sid,
        ]);
      for (const sid of d.serviceIds)
        await client.query("INSERT INTO clinic_services VALUES($1,$2) ON CONFLICT DO NOTHING", [
          id,
          sid,
        ]);
      for (const name of d.insurance)
        await client.query("INSERT INTO clinic_insurance VALUES($1,$2) ON CONFLICT DO NOTHING", [
          id,
          name,
        ]);
      for (const v of d.evidence)
        await client.query(
          "INSERT INTO verification_sources(id,clinic_id,label,url,scope,service_id) VALUES($1,$2,$3,$4,$5,$6)",
          [randomUUID(), id, v.label, v.url, v.scope, v.serviceId],
        );
      await client.query("INSERT INTO admin_audit(clinic_id,action) VALUES($1,'create_draft')", [
        id,
      ]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
    return json({ id, slug }, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
