import { emptyIntent, insuranceOptions, services, specialties } from "./catalog";
import type { Clinic, SearchFilters, SearchIntent, ResolvedPlace } from "./types";

export function parseCatalogIntent(query: string): SearchIntent {
  const q = query.toLowerCase().trim();
  const includes = (alias: string) =>
    new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(q);
  const specialtyIds = specialties.filter((s) => s.aliases.some(includes)).map((s) => s.id);
  const serviceIds = services.filter((s) => s.aliases.some(includes)).map((s) => s.id);
  const locationMatch = query.match(
    /\b(?:in|near|around)\s+(\d{5}(?:-\d{4})?|[a-zA-Z][a-zA-Z .,-]{1,55}?)(?=\s+(?:within|under|with|for|accepting|that|offering)|[?;]|$)/i,
  );
  const distance = q.match(/(?:within|radius of)\s+(\d{1,4})\s*(?:miles|mi)\b/);
  const price = q.match(/(?:under|less than|max(?:imum)?)\s*\$?\s*(\d{1,5})\b/);
  const insurance = insuranceOptions.find((s) => q.includes(s.toLowerCase())) ?? null;
  let unmatched = q;
  if (locationMatch) unmatched = unmatched.replace(locationMatch[0].toLowerCase(), "");
  if (insurance) unmatched = unmatched.replace(insurance.toLowerCase(), "");
  for (const alias of [...specialties, ...services]
    .flatMap((s) => s.aliases)
    .sort((a, b) => b.length - a.length))
    unmatched = unmatched.replace(
      new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"),
      " ",
    );
  unmatched = unmatched
    .replace(/(?:within|radius of)\s+\d+\s*(?:miles|mi)\b/g, "")
    .replace(/(?:under|less than|max(?:imum)?)\s*\$?\s*\d+/g, "");
  const leftovers = unmatched
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(
      (t) =>
        t &&
        !new Set([
          "find",
          "me",
          "an",
          "the",
          "a",
          "i",
          "need",
          "want",
          "looking",
          "for",
          "clinics",
          "clinic",
          "providers",
          "provider",
          "please",
          "with",
          "offering",
          "that",
          "offers",
          "accepting",
          "accepts",
          "telehealth",
          "virtual",
          "visits",
          "and",
          "or",
          "scan",
          "scans",
          "test",
          "tests",
          "specialist",
          "specialists",
        ]).has(t),
    );
  let terms: string[] = [];
  if (q && !specialtyIds.length && !serviceIds.length) {
    let remainder = q;
    if (locationMatch) remainder = remainder.replace(locationMatch[0].toLowerCase(), "");
    if (insurance) remainder = remainder.replace(insurance.toLowerCase(), "");
    remainder = remainder
      .replace(/(?:within|radius of)\s+\d+\s*(?:miles|mi)\b/g, "")
      .replace(/(?:under|less than|max(?:imum)?)\s*\$?\s*\d+/g, "");
    terms = remainder
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter(
        (t) =>
          t.length > 1 &&
          !new Set([
            "find",
            "me",
            "an",
            "the",
            "a",
            "i",
            "need",
            "looking",
            "for",
            "clinics",
            "clinic",
            "providers",
            "provider",
            "please",
            "with",
            "offering",
            "that",
            "offers",
            "accepting",
            "accepts",
            "telehealth",
            "virtual",
            "visits",
          ]).has(t),
      )
      .slice(0, 8);
  }
  // Prevent a recognized term from hiding an unsupported additional procedure.
  const unsupported =
    /\b(?:reverse aging|age reversal|anti[- ]aging|rejuvenation|stem cell|exosome|cure cancer|diagnose me|not|without|except)\b/i.test(
      q,
    ) ||
    ((serviceIds.length > 0 || specialtyIds.length > 0) && leftovers.length > 0);
  return {
    ...emptyIntent,
    specialtyIds,
    serviceIds,
    terms,
    location: locationMatch?.[1].trim().replace(/,$/, "") ?? null,
    radiusMiles: distance ? Math.min(Number(distance[1]), 2000) : null,
    maxPrice: price ? Number(price[1]) : null,
    insurance,
    telehealth: /\b(?:telehealth|virtual)\b/.test(q) ? true : null,
    unsupported,
  };
}

export function mergeFilters(intent: SearchIntent, filters: SearchFilters): SearchIntent {
  return {
    ...intent,
    specialtyIds: filters.specialtyId ? [filters.specialtyId] : intent.specialtyIds,
    serviceIds: filters.serviceId ? [filters.serviceId] : intent.serviceIds,
    location: filters.location?.trim() || intent.location,
    radiusMiles: filters.radiusMiles ?? intent.radiusMiles,
    telehealth: filters.telehealth ?? intent.telehealth,
    insurance: filters.insurance || intent.insurance,
    maxPrice: filters.maxPrice ?? intent.maxPrice,
  };
}

export function milesBetween(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const rad = (n: number) => (n * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude),
    dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 3958.7613 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function matchClinics(
  records: Clinic[],
  intent: SearchIntent,
  filters: SearchFilters,
  place?: ResolvedPlace | null,
): Clinic[] {
  if (intent.unsupported) return [];
  return records
    .filter((c) => c.status === "published")
    .flatMap((c) => {
      if (
        intent.specialtyIds.length &&
        !intent.specialtyIds.some((id) => c.specialties.some((s) => s.id === id))
      )
        return [];
      if (
        intent.serviceIds.length &&
        !intent.serviceIds.every((id) => c.services.some((s) => s.id === id))
      )
        return [];
      if (intent.telehealth !== null && c.telehealth !== intent.telehealth) return [];
      if (
        intent.insurance &&
        !c.insurance.some((i) => i.toLowerCase() === intent.insurance!.toLowerCase())
      )
        return [];
      if (intent.maxPrice !== null && (c.priceFrom === null || c.priceFrom > intent.maxPrice))
        return [];
      const searchable = [
        c.name,
        ...c.specialties.map((s) => s.name),
        ...c.services.map((s) => s.name),
      ]
        .join(" ")
        .toLowerCase();
      if (!intent.terms.every((t) => searchable.includes(t.toLowerCase()))) return [];
      let locations = c.locations.filter(
        (l) =>
          !filters.bounds ||
          (l.longitude >= filters.bounds[0] &&
            l.longitude <= filters.bounds[2] &&
            l.latitude >= filters.bounds[1] &&
            l.latitude <= filters.bounds[3]),
      );
      if (place?.stateOnly) locations = locations.filter((l) => l.state === place.state);
      if (!locations.length) return [];
      if (place && !place.stateOnly) {
        const nearest = locations
          .map((l) => ({ id: l.id, distance: milesBetween(place, l) }))
          .sort((a, b) => a.distance - b.distance)[0];
        if (nearest.distance > (intent.radiusMiles ?? 50)) return [];
        return [
          {
            ...c,
            distanceMiles: Math.round(nearest.distance * 10) / 10,
            matchedLocationId: nearest.id,
          },
        ];
      }
      return [{ ...c, matchedLocationId: locations[0].id }];
    })
    .sort(
      (a, b) => (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0) || a.name.localeCompare(b.name),
    );
}
