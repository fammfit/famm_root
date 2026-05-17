/**
 * POST /api/v1/integrations/google-business/connect
 *
 * STUB. Synchronously fakes a successful OAuth round-trip so the UI flow
 * can be tested end-to-end. Real implementation:
 *   1. GET /oauth-url -> redirect to Google consent
 *   2. GET /callback?code=…&state=… -> exchange, persist token, redirect
 *
 * This single endpoint stands in for both during the stub phase.
 * TODO(google-oauth): replace with the consent + callback dance.
 */
import { type NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/rbac/access-control";
import { connectIntegration } from "@/lib/integrations/mock-google-business";

const ALLOWED = new Set(["TENANT_OWNER", "TENANT_ADMIN", "SUPER_ADMIN"]);

export async function POST(request: NextRequest) {
  let ctx;
  try {
    ctx = getAuthContext(request);
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not signed in" } },
      { status: 401 }
    );
  }
  if (!ALLOWED.has(ctx.userRole)) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Integration is for tenant owners" } },
      { status: 403 }
    );
  }
  const integration = connectIntegration(ctx.tenantId);
  return NextResponse.json({
    success: true,
    data: { integration },
    meta: { timestamp: new Date().toISOString(), version: "1.0" },
  });
}
