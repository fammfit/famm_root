/**
 * POST /api/v1/integrations/google-calendar/connect
 *
 * STUB. Synchronously fakes a successful OAuth round-trip + initial
 * calendar list seed. Replaces the real consent + callback dance during
 * the v1 stub phase.
 *
 * TODO(google-oauth): replace with the real OAuth flow + token exchange.
 */
import { type NextRequest } from "next/server";
import { getAuthContext } from "@/lib/rbac/access-control";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import { connectCalendarsIntegration } from "@/lib/integrations/mock-google-calendar";

const ALLOWED = new Set(["TENANT_OWNER", "TENANT_ADMIN", "SUPER_ADMIN"]);

export async function POST(request: NextRequest) {
  try {
    const ctx = getAuthContext(request);
    if (!ALLOWED.has(ctx.userRole)) {
      return apiError("FORBIDDEN", "Integration is for tenant owners", 403);
    }
    const bundle = connectCalendarsIntegration(ctx.tenantId);
    return apiSuccess({ integration: bundle.integration });
  } catch (err) {
    return handleError(err);
  }
}
