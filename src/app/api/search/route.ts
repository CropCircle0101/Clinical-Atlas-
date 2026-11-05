import { parseIntent } from "@/lib/intent";
import { searchRequestSchema } from "@/lib/validation";
import { mergeFilters } from "@/lib/search";
import { resolvePlace } from "@/lib/places";
import { searchClinics } from "@/lib/repository";
import { isDemoMode } from "@/lib/db";
import { assertOrigin, errorResponse, HttpError, json, rateLimit, readBody } from "@/lib/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    rateLimit(request, "search", 60);
    const parsed = searchRequestSchema.safeParse(await readBody(request));
    if (!parsed.success) throw new HttpError(400, "Check your search and filters.");
    const { query, useAI, filters } = parsed.data;
    if (useAI) rateLimit(request, "ai-search", 12);
    const { intent: raw, parser, notice } = await parseIntent(query, useAI);
    const intent = mergeFilters(raw, filters);
    if (intent.radiusMiles && !intent.location)
      throw new HttpError(422, "Enter a city or ZIP to use a distance filter.");
    const place = intent.location ? await resolvePlace(intent.location) : null;
    if (intent.location && !place)
      throw new HttpError(
        422,
        "We couldn’t resolve that location. Try a full state name or a city and state. Additional city/ZIP lookup requires configured geocoding.",
      );
    const result = await searchClinics(intent, filters, place);
    return json({
      ...result,
      intent,
      parser,
      mode: isDemoMode() ? "demo" : "live",
      notice: intent.unsupported
        ? "This request is outside our verified service catalog. No provider or treatment claims were inferred."
        : notice,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
