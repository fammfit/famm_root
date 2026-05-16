import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import type { AccessTokenPayload } from "@famm/auth";
import { getJwtSecret, JWT_ISSUER, JWT_AUDIENCE_WEB } from "@famm/auth";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/refresh",
  "/api/v1/auth/magic-link",
  "/api/v1/auth/magic-link/verify",
  "/api/v1/auth/sms",
  "/api/v1/auth/sms/verify",
  "/api/v1/tenants",
  "/api/health",
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/invite/")) return true;
  // Auth landing surfaces (verify code, magic-link click-through) need to
  // run without a session — that's the whole point of them.
  if (pathname.startsWith("/verify/")) return true;
  if (pathname.startsWith("/auth/")) return true;
  if (pathname.startsWith("/api/v1/public/")) return true;
  if (pathname.startsWith("/_next/") || pathname.startsWith("/favicon")) return true;
  return false;
}

function getRequestId(request: NextRequest): string {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = getRequestId(request);

  if (isPublicPath(pathname)) {
    const response = NextResponse.next();
    response.headers.set("x-request-id", requestId);
    return response;
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : request.cookies.get("access_token")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Missing token" } },
        { status: 401, headers: { "x-request-id": requestId } }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE_WEB,
    });
    const claims = payload as unknown as AccessTokenPayload;

    // Note: revocation is checked in the route layer (getRequestContext /
    // getAuthContext) because Next.js 14 middleware runs in the Edge runtime
    // where the Node-only Redis client is unavailable. Access tokens have a
    // short TTL (15m) so missing the edge check has bounded impact.

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", claims.sub);
    requestHeaders.set("x-user-email", claims.email);
    requestHeaders.set("x-tenant-id", claims.tenantId ?? "");
    requestHeaders.set("x-user-role", claims.role);
    requestHeaders.set("x-session-id", claims.sid);
    requestHeaders.set("x-request-id", requestId);
    // Extra permissions are not in JWT (size) — routes that need them fetch from Redis

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "TOKEN_EXPIRED", message: "Invalid or expired token" },
        },
        { status: 401, headers: { "x-request-id": requestId } }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
