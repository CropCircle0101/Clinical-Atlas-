import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/admin";
import { getPool } from "@/lib/db";
import { errorResponse, HttpError, json, rateLimit, readBody } from "@/lib/http";
import { validNpi } from "@/lib/nppes";
export async function POST(request: Request) {
  try {
    requireAdmin(request);
    rateLimit(request, "nppes-import", 10);
    const body = (await readBody(request)) as { npi?: unknown };
    if (typeof body.npi !== "string" || !validNpi(body.npi))
      throw new HttpError(400, "Enter a valid 10-digit organization NPI.");
    const response = await fetch(
      `https://npiregistry.cms.hhs.gov/api/?version=2.1&number=${body.npi}`,
      { cache: "no-store", signal: AbortSignal.timeout(10000) },
    );
    if (!response.ok) throw new HttpError(502, "The NPI Registry is unavailable.");
    const data = await response.json();
    const record = data.results?.[0];
    if (!record || record.enumeration_type !== "NPI-2" || record.basic?.status !== "A")
      throw new HttpError(
        422,
        "Only active organization records can be staged. An NPI is not proof of licensure or services.",
      );
    const name = String(record.basic?.organization_name || "")
      .trim()
      .slice(0, 160);
    if (name.length < 3)
      throw new HttpError(422, "The registry record has no usable organization name.");
    const id = randomUUID(),
      slug = `${name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}-${id.slice(0, 8)}`,
      client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query("SELECT id FROM clinics WHERE npi=$1", [body.npi]);
      if (existing.rowCount) throw new HttpError(409, "This NPI is already in the review queue.");
      // Do not import contact-person names, residential addresses, licenses, taxonomy
      // assertions or inferred services. A reviewer supplies a public practice location.
      await client.query(
        "INSERT INTO clinics(id,slug,name,npi,description) VALUES($1,$2,$3,$4,$5)",
        [
          id,
          slug,
          name,
          body.npi,
          "Organization identity staged from NPPES. Public practice address, coordinates, specialties and services require independent review before publication.",
        ],
      );
      await client.query(
        "INSERT INTO verification_sources(id,clinic_id,label,url,scope) VALUES($1,$2,$3,$4,'identity')",
        [
          randomUUID(),
          id,
          "NPPES organization identity lead — not licensure or service evidence",
          `https://npiregistry.cms.hhs.gov/provider-view/${body.npi}`,
        ],
      );
      await client.query(
        "INSERT INTO admin_audit(clinic_id,action) VALUES($1,'import_nppes_identity_draft')",
        [id],
      );
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
    return json(
      {
        id,
        slug,
        notice:
          "Identity staged as an unpublished draft. Add a public practice location, coordinates and independent offering evidence.",
      },
      201,
    );
  } catch (e) {
    return errorResponse(e);
  }
}
