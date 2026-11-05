import assert from "node:assert/strict";
const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";
async function search(body, origin = base) {
  return fetch(`${base}/api/search`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}
for (const path of ["/", "/about", "/admin", "/clinics/harborview-diagnostics"]) {
  const r = await fetch(`${base}${path}`);
  assert.equal(r.status, 200, path);
}
let response = await search({ query: "MRI in Boston" });
assert.equal(response.status, 200);
let data = await response.json();
assert.equal(data.total, 2);
assert.ok(
  data.clinics.every(
    (c) => c.isDemo && c.services.some((s) => s.id === "mri") && c.locations[0].city === "Boston",
  ),
);
assert.match(response.headers.get("cache-control"), /no-store/);
response = await search({ query: "stem cell rejuvenation" });
data = await response.json();
assert.equal(data.total, 0);
assert.equal(data.intent.unsupported, true);
response = await search({ query: "MRI and acupuncture" });
assert.equal((await response.json()).total, 0);
response = await search({
  query: "",
  filters: { insurance: "Aetna", maxPrice: 200, telehealth: true },
});
data = await response.json();
assert.ok(data.total > 0);
assert.ok(
  data.clinics.every(
    (c) =>
      c.priceFrom !== null &&
      c.priceFrom <= 200 &&
      c.telehealth === true &&
      c.insurance.includes("Aetna"),
  ),
);
response = await search({ query: "MRI", useAI: true });
data = await response.json();
assert.equal(data.parser, "fallback");
assert.ok(data.notice);
response = await search({ query: "MRI in Atlantis, ZZ" });
assert.equal(response.status, 422);
response = await search({ query: "MRI" }, "https://untrusted.example");
assert.equal(response.status, 403);
response = await search({ query: "x".repeat(501) });
assert.equal(response.status, 400);
response = await fetch(`${base}/api/admin/clinics`);
assert.equal(response.status, 401);
response = await fetch(`${base}/api/admin/clinics/not-real`, {
  method: "PATCH",
  headers: { origin: base, "content-type": "application/json" },
  body: JSON.stringify({ action: "publish" }),
});
assert.equal(response.status, 401);
response = await fetch(`${base}/clinics/not-a-real-provider`);
assert.equal(response.status, 404);
console.log(
  "Demo HTTP smoke checks passed: pages, search, unknown requests, filters, AI fallback, privacy headers, origin checks, protected admin and missing profiles.",
);
