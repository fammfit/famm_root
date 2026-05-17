/**
 * GET /api/v1/integrations/google-business/listings?q=<search>
 *
 * STUB. Returns canned listings from MOCK_LISTINGS. Real implementation
 * pages the Google Business Profile API and projects results into the
 * GoogleBusinessListing shape.
 * TODO(integration-model): real backend + caching + rate limit handling.
 */
import { type NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/rbac/access-control";
import { getIntegration, listMockListings } from "@/lib/integrations/mock-google-business";

const ALLOWED = new Set(["TENANT_OWNER", "TENANT_ADMIN", "SUPER_ADMIN"]);

export async function GET(request: NextRequest) {
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
  const integration = getIntegration(ctx.tenantId);
  if (!integration) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "NOT_CONNECTED", message: "Connect Google first" },
      },
      { status: 409 }
    );
  }
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const listings = listMockListings(q);
  return NextResponse.json({
    success: true,
    data: { listings },
    meta: { timestamp: new Date().toISOString(), version: "1.0" },
  });
}
