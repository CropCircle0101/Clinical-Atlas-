import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { errorResponse, HttpError, json, readBody } from "@/lib/http";
import { publicationProblems } from "@/lib/publication";
import { draftSchema } from "@/lib/validation";
import type { Clinic } from "@/lib/types";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    requireAdmin(request);
    const { id } = await context.params;
    const parsed = z
      .object({
        action: z.enum(["verify-source", "publish", "archive"]),
        sourceId: z.string().max(100).optional(),
      })
      .strict()
      .safeParse(await readBody(request));
    if (!parsed.success) throw new HttpError(400, "Invalid review action");
    const { action, sourceId } = parsed.data,
      client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const locked = await client.query(
        "SELECT id FROM clinics WHERE id=$1 AND is_demo=false FOR UPDATE",
        [id],
      );
      if (!locked.rowCount) throw new HttpError(404, "Provider not found");
      if (action === "verify-source") {
        const r = await client.query(
          "UPDATE verification_sources SET status='verified',checked_at=now() WHERE id=$1 AND clinic_id=$2 RETURNING id",
          [sourceId, id],
        );
        if (!r.rowCount) throw new HttpError(404, "Source not found");
      } else if (action === "publish") {
        const { rows } = await client.query("SELECT * FROM clinic_directory WHERE id=$1", [id]);
        const problems = publicationProblems(rows[0] as Clinic);
        if (problems.length) throw new HttpError(422, problems.join(" "));
        await client.query(
          "UPDATE clinics SET status='published',last_verified_at=now(),updated_at=now() WHERE id=$1",
          [id],
        );
      } else
        await client.query("UPDATE clinics SET status='archived',updated_at=now() WHERE id=$1", [
          id,
        ]);
      await client.query("INSERT INTO admin_audit(clinic_id,action) VALUES($1,$2)", [id, action]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function PUT(request: Request, context: Context) {
  try {
    requireAdmin(request);
    const { id } = await context.params;
    const parsed = draftSchema.safeParse(await readBody(request, 30000));
    if (!parsed.success)
      throw new HttpError(400, parsed.error.issues[0]?.message || "Invalid draft");
    const d = parsed.data,
      client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const r = await client.query(
        "UPDATE clinics SET name=$2,description=$3,website=$4,phone=$5,telehealth=$6,price_from=$7,price_note=$8,status='draft',last_verified_at=NULL,updated_at=now() WHERE id=$1 AND is_demo=false RETURNING id",
        [id, d.name, d.description, d.website, d.phone, d.telehealth, d.priceFrom, d.priceNote],
      );
      if (!r.rowCount) throw new HttpError(404, "Provider not found");
      // Editing withdraws publication and invalidates prior evidence, preventing stale assertions.
      for (const table of [
        "locations",
        "clinic_specialties",
        "clinic_services",
        "clinic_insurance",
        "verification_sources",
      ])
        await client.query(`DELETE FROM ${table} WHERE clinic_id=$1`, [id]);
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
      await client.query(
        "INSERT INTO admin_audit(clinic_id,action) VALUES($1,'edit_draft_reset_evidence')",
        [id],
      );
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
