import { NextResponse } from "next/server";
import { getRequestContext, type RequestContext } from "@/lib/request-context";

export const OWNER_ROLES = new Set(["TENANT_OWNER", "SUPER_ADMIN"]);
export const ADMIN_ROLES = new Set(["TENANT_OWNER", "TENANT_ADMIN", "SUPER_ADMIN"]);

export function envelope<T>(data: T) {
  return {
    success: true,
    data,
    meta: { timestamp: new Date().toISOString(), version: "1.0" },
  };
}

export function error(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export function ok<T>(data: T) {
  return NextResponse.json(envelope(data));
}

/**
 * Resolve the request context or return a 401 envelope. Returns either a
 * NextResponse (caller should `return` it) or a context.
 */
export function resolveCtx(): RequestContext | NextResponse {
  try {
    return getRequestContext();
  } catch {
    return error("UNAUTHORIZED", "Not signed in", 401);
  }
}

export function requireAdmin(ctx: RequestContext): NextResponse | null {
  if (!ADMIN_ROLES.has(ctx.userRole)) {
    return error("FORBIDDEN", "Admins only", 403);
  }
  return null;
}

export function requireOwner(ctx: RequestContext): NextResponse | null {
  if (!OWNER_ROLES.has(ctx.userRole)) {
    return error("FORBIDDEN", "Owner only", 403);
  }
  return null;
}
