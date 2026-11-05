import { NextResponse } from "next/server";
import { constantEqual, createSession, secretConfigured, sessionCookie } from "@/lib/auth";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  json,
  rateLimit,
  readBody,
  privateHeaders,
} from "@/lib/http";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    rateLimit(request, "admin-login", 5, 15 * 60000);
    if (!secretConfigured())
      throw new HttpError(
        503,
        "Set ADMIN_SECRET to at least 32 random characters to enable the admin interface.",
      );
    const body = (await readBody(request, 2000)) as { secret?: unknown };
    if (typeof body.secret !== "string" || !constantEqual(body.secret, process.env.ADMIN_SECRET!))
      throw new HttpError(401, "Invalid admin access key.");
    const response = NextResponse.json({ ok: true }, { headers: privateHeaders });
    response.cookies.set(sessionCookie, createSession(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 4 * 60 * 60,
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(request: Request) {
  try {
    assertOrigin(request);
    const r = json({ ok: true });
    r.cookies.set(sessionCookie, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
    return r;
  } catch (e) {
    return errorResponse(e);
  }
}
