import { requestAuthenticated } from "./auth";
import { isDemoMode } from "./db";
import { assertOrigin, HttpError, rateLimit } from "./http";
export function requireAdmin(request: Request, mutation = true) {
  if (mutation) assertOrigin(request);
  rateLimit(request, "admin", 50);
  if (!requestAuthenticated(request)) throw new HttpError(401, "Sign in to the admin interface.");
  if (mutation && isDemoMode())
    throw new HttpError(
      409,
      "Demo mode is read-only. Connect PostgreSQL and set DEMO_MODE=false to edit live records.",
    );
}
