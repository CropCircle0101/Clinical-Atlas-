import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const privateHeaders = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  Vary: "Cookie",
};
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: privateHeaders });
}
export async function readBody(request: Request, maxBytes = 12000): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "Expected JSON");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "A request body is required");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, "Request too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}
export function assertOrigin(request: Request) {
  const configured = process.env.APP_ORIGIN;
  if (process.env.NODE_ENV === "production" && !configured)
    throw new HttpError(503, "Application origin is not configured");
  // Next's development server may normalize request.url to localhost even when
  // reached through 127.0.0.1. In development, Host reflects the browser origin.
  // Production always requires an explicit trusted APP_ORIGIN above.
  const expected =
    configured ||
    (request.headers.get("host")
      ? `${new URL(request.url).protocol}//${request.headers.get("host")}`
      : new URL(request.url).origin);
  if (request.headers.get("origin") !== expected)
    throw new HttpError(403, "Request origin is not allowed");
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new HttpError(403, "Cross-site request rejected");
}
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(request: Request, scope: string, limit: number, windowMs = 60000) {
  // A trusted deployment proxy must overwrite X-Forwarded-For before enabling this.
  const client =
    process.env.TRUST_PROXY === "true"
      ? request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown"
      : "shared";
  const key = createHash("sha256").update(`${scope}:${client}`).digest("hex");
  const now = Date.now();
  for (const [key, b] of buckets) if (b.reset <= now) buckets.delete(key);
  const bucket = buckets.get(key) ?? { count: 0, reset: now + windowMs };
  if (bucket.count >= limit)
    throw new HttpError(429, "Too many requests. Please try again shortly.");
  bucket.count++;
  buckets.set(key, bucket);
}
export function errorResponse(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  // Deliberately avoid logging raw errors, query strings or health-related bodies.
  return json({ error: "The service is temporarily unavailable. Please try again." }, 503);
}
