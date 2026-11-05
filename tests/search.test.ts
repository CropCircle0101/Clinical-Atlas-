import { test } from "node:test";
import assert from "node:assert/strict";
import { demoClinics } from "../src/data/demo";
import { matchClinics, mergeFilters, milesBetween, parseCatalogIntent } from "../src/lib/search";
import { searchRequestSchema } from "../src/lib/validation";
import { validNpi } from "../src/lib/nppes";
const search = (q: string) => matchClinics(demoClinics, parseCatalogIntent(q), {});
test("natural language maps explicit MRI and Boston without generating records", () => {
  const intent = parseCatalogIntent("I need an MRI in Boston");
  assert.deepEqual(intent.serviceIds, ["mri"]);
  assert.equal(intent.location, "Boston");
  assert.equal(parseCatalogIntent("MRI near 02108").location, "02108");
  const place = { label: "Boston, MA", latitude: 42.3601, longitude: -71.0589 };
  const result = matchClinics(demoClinics, intent, {}, place);
  assert.equal(result.length, 2);
  assert.ok(result.every((c) => c.locations[0].city === "Boston"));
  assert.ok(result.every((c) => demoClinics.some((record) => record.id === c.id)));
});
test("unknown provider and unsupported procedure cannot produce unrelated results", () => {
  assert.equal(search("nonexistent quantum banana clinic").length, 0);
  assert.equal(search("stem cell anti-aging rejuvenation").length, 0);
  assert.equal(search("MRI with exosome rejuvenation").length, 0);
  assert.equal(search("MRI and acupuncture").length, 0);
  assert.equal(search("not MRI").length, 0);
});
test("unknown price, insurance and telehealth values do not count as matches", () => {
  const base = parseCatalogIntent("");
  const results = matchClinics(
    demoClinics,
    { ...base, maxPrice: 200, insurance: "Aetna", telehealth: true },
    {},
  );
  assert.ok(results.length > 0);
  assert.ok(
    results.every(
      (c) =>
        c.priceFrom !== null &&
        c.priceFrom <= 200 &&
        c.insurance.includes("Aetna") &&
        c.telehealth === true,
    ),
  );
});
test("all requested services are required", () => {
  const results = search("MRI and CT scan");
  assert.ok(results.length > 0);
  assert.ok(
    results.every(
      (c) => c.services.some((s) => s.id === "mri") && c.services.some((s) => s.id === "ct-scan"),
    ),
  );
});
test("map bounds and state filters synchronize results using the same location", () => {
  const results = matchClinics(demoClinics, parseCatalogIntent(""), {
    bounds: [-125, 32, -114, 43],
  });
  assert.equal(results.length, 2);
  const texas = matchClinics(
    demoClinics,
    parseCatalogIntent(""),
    {},
    { label: "Texas", stateOnly: true, state: "TX", latitude: 0, longitude: 0 },
  );
  assert.equal(texas.length, 2);
});
test("drafts are never discoverable and radius uses miles", () => {
  assert.equal(
    matchClinics(
      demoClinics.map((c) => ({ ...c, status: "draft" })),
      parseCatalogIntent(""),
      {},
    ).length,
    0,
  );
  assert.equal(milesBetween({ latitude: 42, longitude: -71 }, { latitude: 42, longitude: -71 }), 0);
  assert.ok(
    milesBetween(
      { latitude: 40.7128, longitude: -74.006 },
      { latitude: 42.3601, longitude: -71.0589 },
    ) > 180,
  );
  assert.ok(
    milesBetween(
      { latitude: 40.7128, longitude: -74.006 },
      { latitude: 42.3601, longitude: -71.0589 },
    ) < 200,
  );
});
test("explicit UI filters override parsed fields without broadening other constraints", () => {
  const i = mergeFilters(parseCatalogIntent("MRI in Boston under $500"), {
    location: "Seattle",
    maxPrice: 400,
  });
  assert.equal(i.location, "Seattle");
  assert.equal(i.maxPrice, 400);
  assert.deepEqual(i.serviceIds, ["mri"]);
});
test("untrusted requests reject invalid filters, out-of-range input and extra keys", () => {
  assert.equal(searchRequestSchema.safeParse({ query: "a".repeat(501) }).success, false);
  assert.equal(searchRequestSchema.safeParse({ filters: { serviceId: "fake" } }).success, false);
  assert.equal(
    searchRequestSchema.safeParse({ filters: { bounds: [10, 40, -10, 20] } }).success,
    false,
  );
  assert.equal(searchRequestSchema.safeParse({ filters: { radiusMiles: -1 } }).success, false);
  assert.equal(searchRequestSchema.safeParse({ sql: "DROP TABLE clinics" }).success, false);
});
test("NPI validates syntax and check digit, without asserting credentials", () => {
  assert.equal(validNpi("1234567893"), true);
  assert.equal(validNpi("1234567890"), false);
  assert.equal(validNpi("123"), false);
});
