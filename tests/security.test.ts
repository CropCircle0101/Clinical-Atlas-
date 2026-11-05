import { test } from "node:test";
import assert from "node:assert/strict";
import { createSession, validSession } from "../src/lib/auth";
import { publicationProblems } from "../src/lib/publication";
import { assertOrigin, readBody, HttpError } from "../src/lib/http";
import { demoClinics } from "../src/data/demo";
import type { Clinic, VerificationSource } from "../src/lib/types";
test("admin sessions reject tampering, expiration and missing configuration", () => {
  const original = process.env.ADMIN_SECRET;
  try {
    process.env.ADMIN_SECRET = "a".repeat(40);
    const now = Date.now(),
      token = createSession(now);
    assert.equal(validSession(token, now + 1), true);
    assert.equal(validSession(`${token}x`, now + 1), false);
    assert.equal(validSession(token, now + 5 * 60 * 60 * 1000), false);
    process.env.ADMIN_SECRET = "short";
    assert.equal(validSession(token, now + 1), false);
  } finally {
    if (original === undefined) delete process.env.ADMIN_SECRET;
    else process.env.ADMIN_SECRET = original;
  }
});
function verifiedClinic(): Clinic {
  const clinic: Clinic = {
    ...demoClinics[0],
    isDemo: false,
    insurance: [],
    priceFrom: null,
    sources: [],
  };
  const scopes = ["identity", "address", "specialty"] as const;
  clinic.sources = scopes.map((scope) => ({
    id: scope,
    label: "Provider source",
    url: "https://provider.example/about",
    scope,
    status: "verified",
    checkedAt: new Date().toISOString(),
  }));
  clinic.sources.push(
    ...clinic.services.map((s) => ({
      id: s.id,
      label: "Service source",
      url: "https://provider.example/services",
      scope: "service" as const,
      serviceId: s.id,
      status: "verified" as const,
      checkedAt: new Date().toISOString(),
    })),
  );
  return clinic;
}
test("publication requires independent, recent evidence for every service", () => {
  const clinic = verifiedClinic();
  assert.deepEqual(publicationProblems(clinic), []);
  assert.ok(publicationProblems({ ...clinic, isDemo: true }).length > 0);
  assert.ok(
    publicationProblems({
      ...clinic,
      sources: clinic.sources.filter((s) => s.scope !== "service"),
    }).some((s) => s.includes("service-specific")),
  );
  assert.ok(
    publicationProblems({
      ...clinic,
      sources: clinic.sources.map((s) => ({ ...s, checkedAt: "2020-01-01T00:00:00Z" })),
    }).length > 0,
  );
  assert.ok(
    publicationProblems({
      ...clinic,
      sources: clinic.sources.map((s) => ({
        ...s,
        url: "https://npiregistry.cms.hhs.gov/provider-view/1234567893",
      })),
    }).length > 0,
  );
  assert.ok(publicationProblems({ ...clinic, insurance: ["Aetna"], priceFrom: 100 }).length >= 2);
});
test("NPI-only evidence never proves licensure or a service", () => {
  const source: VerificationSource = {
    id: "npi",
    label: "NPPES",
    url: "https://npiregistry.cms.hhs.gov",
    scope: "identity",
    status: "verified",
    checkedAt: new Date().toISOString(),
  };
  const problems = publicationProblems({
    ...verifiedClinic(),
    sources: [source],
    npi: "1234567893",
  });
  assert.ok(problems.length >= 4);
});
test("cross-origin mutations and oversized bodies are rejected", async () => {
  const original = process.env.APP_ORIGIN;
  process.env.APP_ORIGIN = "https://atlas.example";
  try {
    assert.throws(
      () =>
        assertOrigin(
          new Request("https://atlas.example/api/search", {
            headers: { origin: "https://evil.example" },
          }),
        ),
      HttpError,
    );
    assert.doesNotThrow(() =>
      assertOrigin(
        new Request("https://atlas.example/api/search", {
          headers: { origin: "https://atlas.example" },
        }),
      ),
    );
    await assert.rejects(
      () =>
        readBody(
          new Request("https://atlas.example/api/search", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ query: "a".repeat(13000) }),
          }),
        ),
      (e) => e instanceof HttpError && e.status === 413,
    );
  } finally {
    if (original === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = original;
  }
});
test("development loopback origin respects Host when Next normalizes request URLs", () => {
  const original = process.env.APP_ORIGIN;
  try {
    delete process.env.APP_ORIGIN;
    assert.doesNotThrow(() =>
      assertOrigin(
        new Request("http://localhost:3000/api/search", {
          headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
        }),
      ),
    );
    assert.throws(
      () =>
        assertOrigin(
          new Request("http://localhost:3000/api/search", {
            headers: { host: "127.0.0.1:3000", origin: "https://untrusted.example" },
          }),
        ),
      HttpError,
    );
  } finally {
    if (original === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = original;
  }
});
