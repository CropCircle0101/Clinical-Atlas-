import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
export const sessionCookie = "clinicatlas_admin";
export function secretConfigured() {
  return (process.env.ADMIN_SECRET?.length ?? 0) >= 32;
}
function signature(value: string) {
  return createHmac("sha256", process.env.ADMIN_SECRET!).update(value).digest("base64url");
}
export function constantEqual(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function createSession(now = Date.now()) {
  if (!secretConfigured()) throw new Error("Admin is not configured");
  const value = `${now + 4 * 60 * 60 * 1000}.${randomBytes(16).toString("hex")}`;
  return `${value}.${signature(value)}`;
}
export function validSession(token: string | undefined, now = Date.now()) {
  if (!secretConfigured() || !token || token.length > 200) return false;
  const [expires, nonce, sig, ...rest] = token.split(".");
  if (
    rest.length ||
    !expires ||
    !nonce ||
    !sig ||
    !/^\d+$/.test(expires) ||
    !Number.isFinite(Number(expires)) ||
    Number(expires) <= now ||
    Number(expires) > now + 4 * 60 * 60 * 1000
  )
    return false;
  return constantEqual(sig, signature(`${expires}.${nonce}`));
}
export function requestAuthenticated(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${sessionCookie}=`))
    ?.slice(sessionCookie.length + 1);
  return validSession(token);
}
