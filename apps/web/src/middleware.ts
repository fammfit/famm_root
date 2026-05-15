import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env["JWT_SECRET"] ?? "dev-secret-change-in-production"
);

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/refresh",
  "/api/v1/tenants",
  "/api/health",
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/api/v1/public/")) return true;
  if (pathname.startsWith("/_next/") || pathname.startsWith("/favicon")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : request.cookies.get("access_token")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Missing token" } },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", payload["sub"] as string);
    requestHeaders.set("x-user-email", payload["email"] as string);
    requestHeaders.set("x-tenant-id", payload["tenantId"] as string);
    requestHeaders.set("x-user-role", payload["role"] as string);

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: { code: "TOKEN_EXPIRED", message: "Invalid or expired token" } },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
