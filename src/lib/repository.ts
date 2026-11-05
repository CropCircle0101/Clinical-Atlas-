import "server-only";
import { demoClinics } from "../data/demo";
import { getPool, isDemoMode } from "./db";
import { matchClinics } from "./search";
import type { Clinic, ResolvedPlace, SearchFilters, SearchIntent } from "./types";

export async function searchClinics(
  intent: SearchIntent,
  filters: SearchFilters,
  place?: ResolvedPlace | null,
): Promise<{ clinics: Clinic[]; total: number }> {
  if (isDemoMode()) {
    const clinics = matchClinics(demoClinics, intent, filters, place);
    return { clinics, total: clinics.length };
  }
  if (intent.unsupported) return { clinics: [], total: 0 };
  const params: unknown[] = [];
  const bind = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  const where = ["c.status='published'", "c.is_demo=false"];
  if (intent.specialtyIds.length)
    where.push(
      `EXISTS(SELECT 1 FROM clinic_specialties cs WHERE cs.clinic_id=c.id AND cs.specialty_id=ANY(${bind(intent.specialtyIds)}::text[]))`,
    );
  for (const id of intent.serviceIds)
    where.push(
      `EXISTS(SELECT 1 FROM clinic_services cs JOIN verification_sources v ON v.clinic_id=cs.clinic_id AND v.service_id=cs.service_id AND v.scope='service' AND v.status='verified' WHERE cs.clinic_id=c.id AND cs.service_id=${bind(id)})`,
    );
  if (intent.telehealth !== null) where.push(`c.telehealth=${bind(intent.telehealth)}`);
  if (intent.maxPrice !== null) where.push(`c.price_from<=${bind(intent.maxPrice)}`);
  if (intent.insurance)
    where.push(
      `EXISTS(SELECT 1 FROM clinic_insurance ci WHERE ci.clinic_id=c.id AND lower(ci.name)=lower(${bind(intent.insurance)}))`,
    );
  for (const term of intent.terms) {
    const p = bind(`%${term.replace(/[\\%_]/g, "\\$&")}%`);
    where.push(
      `(c.name ILIKE ${p} OR EXISTS(SELECT 1 FROM clinic_services cs JOIN services s ON s.id=cs.service_id WHERE cs.clinic_id=c.id AND s.name ILIKE ${p}) OR EXISTS(SELECT 1 FROM clinic_specialties cs JOIN specialties s ON s.id=cs.specialty_id WHERE cs.clinic_id=c.id AND s.name ILIKE ${p}))`,
    );
  }
  const locationWhere = ["l.clinic_id=c.id"];
  let distance = "NULL::float8";
  if (place?.stateOnly) locationWhere.push(`l.state=${bind(place.state)}`);
  else if (place) {
    const point = `ST_SetSRID(ST_MakePoint(${bind(place.longitude)},${bind(place.latitude)}),4326)::geography`;
    locationWhere.push(
      `ST_DWithin(l.coordinates,${point},${bind((intent.radiusMiles ?? 50) * 1609.344)})`,
    );
    distance = `ST_Distance(l.coordinates,${point})/1609.344`;
  }
  if (filters.bounds) {
    const [w, s, e, n] = filters.bounds;
    locationWhere.push(
      `l.longitude BETWEEN ${bind(w)} AND ${bind(e)} AND l.latitude BETWEEN ${bind(s)} AND ${bind(n)}`,
    );
  }
  const query = `SELECT c.id,loc.id AS "matchedLocationId",loc.distance AS "distanceMiles", count(*) OVER()::int AS total FROM clinics c JOIN LATERAL(SELECT l.id,${distance} AS distance FROM locations l WHERE ${locationWhere.join(" AND ")} ORDER BY distance NULLS LAST,l.id LIMIT 1) loc ON true WHERE ${where.join(" AND ")} ORDER BY loc.distance NULLS LAST,c.name LIMIT 200`;
  const { rows } = await getPool().query(query, params);
  if (!rows.length) return { clinics: [], total: 0 };
  const records = await getPool().query("SELECT * FROM clinic_directory WHERE id=ANY($1::text[])", [
    rows.map((r) => r.id),
  ]);
  const byId = new Map(records.rows.map((c) => [c.id, c]));
  return {
    clinics: rows.map(
      (r) =>
        ({
          ...byId.get(r.id),
          matchedLocationId: r.matchedLocationId,
          distanceMiles:
            r.distanceMiles === null ? undefined : Math.round(r.distanceMiles * 10) / 10,
        }) as Clinic,
    ),
    total: rows[0].total,
  };
}

export async function getClinic(slug: string): Promise<Clinic | null> {
  if (isDemoMode()) return demoClinics.find((c) => c.slug === slug) ?? null;
  const { rows } = await getPool().query(
    "SELECT * FROM clinic_directory WHERE slug=$1 AND status='published' AND is_demo=false",
    [slug],
  );
  return rows[0] ?? null;
}
export async function getReviewQueue(): Promise<Clinic[]> {
  if (isDemoMode()) return [{ ...demoClinics[0], status: "draft" }, ...demoClinics.slice(1, 4)];
  const { rows } = await getPool().query(
    "SELECT * FROM clinic_directory WHERE is_demo=false ORDER BY CASE WHEN status='draft' THEN 0 ELSE 1 END,name LIMIT 100",
  );
  return rows;
}
