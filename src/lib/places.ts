import type { ResolvedPlace } from "./types";
import { demoClinics } from "../data/demo";
import { getPool, isDemoMode } from "./db";
import { states } from "./us-states";

export async function resolvePlace(input: string): Promise<ResolvedPlace | null> {
  const cleaned = input
    .trim()
    .replace(/,?\s*(usa|united states)$/i, "")
    .trim();
  const state = Object.entries(states).find(
    ([code, name]) =>
      code.toLowerCase() === cleaned.toLowerCase() || name.toLowerCase() === cleaned.toLowerCase(),
  );
  if (state)
    return { label: state[1], state: state[0], latitude: 0, longitude: 0, stateOnly: true };
  const [city, stateCode] = cleaned.split(",").map((s) => s.trim());
  const matching = (l: { city: string; state: string; postalCode: string }) =>
    (l.city.toLowerCase() === city.toLowerCase() &&
      (!stateCode || l.state.toLowerCase() === stateCode.toLowerCase())) ||
    l.postalCode === cleaned;
  if (isDemoMode()) {
    const l = demoClinics.flatMap((c) => c.locations).find(matching);
    if (l) return { ...l, label: `${l.city}, ${l.state}` };
  } else {
    const { rows } = await getPool().query(
      'SELECT city,state,postal_code AS "postalCode",latitude,longitude FROM locations WHERE (lower(city)=lower($1) AND ($2::text IS NULL OR lower(state)=lower($2))) OR postal_code=$3 LIMIT 1',
      [city, stateCode || null, cleaned],
    );
    if (rows[0]) return { ...rows[0], label: `${rows[0].city}, ${rows[0].state}` };
  }
  // Optional licensed geocoding; send only the place, never the health search.
  if (process.env.STADIA_API_KEY) {
    const url = new URL("https://api.stadiamaps.com/geocoding/v2/search");
    url.searchParams.set("text", cleaned);
    url.searchParams.set("boundary.country", "USA");
    url.searchParams.set("size", "1");
    const response = await fetch(url, {
      headers: { Authorization: `Stadia-Auth ${process.env.STADIA_API_KEY}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const data = await response.json();
      const f = data.features?.[0];
      const coordinates = f?.geometry?.coordinates;
      if (
        Array.isArray(coordinates) &&
        coordinates.length === 2 &&
        coordinates.every(Number.isFinite) &&
        ["USA", "US"].includes(f.properties?.country_a)
      )
        return {
          label: String(f.properties.label),
          longitude: coordinates[0],
          latitude: coordinates[1],
        };
    }
  }
  return null;
}
