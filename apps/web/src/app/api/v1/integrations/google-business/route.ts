/**
 * GET    /api/v1/integrations/google-business   — current connection status
 * DELETE /api/v1/integrations/google-business   — revoke + remove the row
 *
 * STUB. Real implementation will exchange + persist OAuth tokens.
 * TODO(integration-model): swap for Prisma Integration model + real API.
 */
import { type NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/rbac/access-control";
import { disconnectIntegration, getIntegration } from "@/lib/integrations/mock-google-business";

const ALLOWED = new Set(["TENANT_OWNER", "TENANT_ADMIN", "SUPER_ADMIN"]);

function authError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

function ok<T>(data: T) {
  return NextResponse.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString(), version: "1.0" },
  });
}

export async function GET(request: NextRequest) {
  let ctx;
  try {
    ctx = getAuthContext(request);
  } catch {
    return authError("UNAUTHORIZED", "Not signed in", 401);
  }
  if (!ALLOWED.has(ctx.userRole)) {
    return authError("FORBIDDEN", "Integration is for tenant owners", 403);
  }
  return ok({ integration: getIntegration(ctx.tenantId) });
}

export async function DELETE(request: NextRequest) {
  let ctx;
  try {
    ctx = getAuthContext(request);
  } catch {
    return authError("UNAUTHORIZED", "Not signed in", 401);
  }
  if (!ALLOWED.has(ctx.userRole)) {
    return authError("FORBIDDEN", "Integration is for tenant owners", 403);
  }
  disconnectIntegration(ctx.tenantId);
  return ok({ ok: true });
}
