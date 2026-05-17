/**
 * GET    /api/v1/integrations/google-calendar — status + sync settings
 * DELETE /api/v1/integrations/google-calendar — disconnect
 *
 * STUB. Backed by the in-memory mock-google-calendar store.
 * TODO(integration-model): wire to Prisma + real Google Calendar API.
 */
import { type NextRequest } from "next/server";
import { getAuthContext } from "@/lib/rbac/access-control";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import {
  disconnectCalendarsIntegration,
  getCalendarsIntegration,
} from "@/lib/integrations/mock-google-calendar";

const ALLOWED = new Set(["TENANT_OWNER", "TENANT_ADMIN", "SUPER_ADMIN"]);

export async function GET(request: NextRequest) {
  try {
    const ctx = getAuthContext(request);
    if (!ALLOWED.has(ctx.userRole)) {
      return apiError("FORBIDDEN", "Integration is for tenant owners", 403);
    }
    const bundle = getCalendarsIntegration(ctx.tenantId);
    return apiSuccess({
      integration: bundle?.integration ?? null,
      settings: bundle?.settings ?? null,
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = getAuthContext(request);
    if (!ALLOWED.has(ctx.userRole)) {
      return apiError("FORBIDDEN", "Integration is for tenant owners", 403);
    }
    disconnectCalendarsIntegration(ctx.tenantId);
    return apiSuccess({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
