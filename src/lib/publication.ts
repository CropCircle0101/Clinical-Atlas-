import type { Clinic } from "./types";
export function publicationProblems(clinic: Clinic, now = Date.now()): string[] {
  const problems: string[] = [];
  if (clinic.isDemo) problems.push("Fictional records cannot be published to the live directory.");
  if (!clinic.locations.length)
    problems.push("Add and verify a physical location with coordinates.");
  if (!clinic.specialties.length || !clinic.services.length)
    problems.push("Add at least one specialty and service.");
  const verified = clinic.sources.filter(
    (s) =>
      s.status === "verified" &&
      s.checkedAt &&
      Date.parse(s.checkedAt) <= now &&
      Date.parse(s.checkedAt) >= now - 180 * 86400000,
  );
  for (const scope of ["identity", "address", "specialty"] as const)
    if (!verified.some((s) => s.scope === scope && !isNppesOnly(s.url)))
      problems.push(
        `Review independent ${scope} evidence from the provider or an authoritative source within 180 days.`,
      );
  for (const service of clinic.services)
    if (
      !verified.some(
        (s) => s.scope === "service" && s.serviceId === service.id && !isNppesOnly(s.url),
      )
    )
      problems.push(`Review service-specific evidence for ${service.name}.`);
  if (
    clinic.insurance.length &&
    !verified.some((s) => s.scope === "insurance" && !isNppesOnly(s.url))
  )
    problems.push("Review insurance evidence or leave insurance unknown.");
  if (
    clinic.priceFrom !== null &&
    !verified.some((s) => s.scope === "price" && !isNppesOnly(s.url))
  )
    problems.push("Review price evidence or leave price unknown.");
  return problems;
}
function isNppesOnly(url: string) {
  try {
    return /(^|\.)(?:cms\.hhs\.gov|cms\.gov)$/.test(new URL(url).hostname);
  } catch {
    return true;
  }
}
