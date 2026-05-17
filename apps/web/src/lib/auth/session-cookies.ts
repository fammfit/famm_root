import { NextResponse } from "next/server";
import { secureCookieFlag } from "./cookies";

/**
 * Standard auth cookies used by browser sessions.
 *
 * access_token  — httpOnly, lax, sent on every request to /. Read by edge
 *                 middleware (apps/web/src/middleware.ts) to populate the
 *                 x-user-id / x-tenant-id / x-user-role headers consumed
 *                 by getRequestContext.
 * refresh_token — httpOnly, strict, path-scoped to /api/v1/auth/refresh so
 *                 it never leaks to feature routes.
 *
 * Why a helper: the magic-link verify route already inlined this pattern;
 * login and sms/verify need the same shape to actually log a browser in.
 * Keeping one definition prevents drift (e.g. mismatched maxAge or path).
 */

const ACCESS_TOKEN_MAX_AGE = 60 * 15; // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface SessionCookieInput {
  accessToken: string;
  refreshToken: string;
}

/** Attach the auth cookie pair to an existing NextResponse. */
export function attachSessionCookies<T extends NextResponse>(
  response: T,
  { accessToken, refreshToken }: SessionCookieInput
): T {
  const secure = secureCookieFlag();
  response.cookies.set("access_token", accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: ACCESS_TOKEN_MAX_AGE,
    path: "/",
  });
  response.cookies.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/api/v1/auth/refresh",
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
  return response;
}

/**
 * Build a JSON response with auth cookies attached. Use this from the
 * verify-OTP / login / magic-link-verify routes when the browser is the
 * caller (Accept: application/json or default form post).
 */
export function jsonWithSessionCookies(
  payload: unknown,
  cookies: SessionCookieInput
): NextResponse {
  const response = NextResponse.json(payload);
  return attachSessionCookies(response, cookies);
}

/** Clear the auth cookies. Use from /logout. */
export function clearSessionCookies<T extends NextResponse>(response: T): T {
  response.cookies.set("access_token", "", { maxAge: 0, path: "/" });
  response.cookies.set("refresh_token", "", {
    maxAge: 0,
    path: "/api/v1/auth/refresh",
  });
  return response;
}
