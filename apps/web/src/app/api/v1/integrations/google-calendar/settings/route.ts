/**
 * PATCH /api/v1/integrations/google-calendar/settings
 *
 * STUB. Persists which calendars to read and which one to write to.
 * When `writeCalendarId === "create_new"`, fabricates a new
 * `FAMM — {Tenant.name}` calendar in the mock list and substitutes
 * the real id into the response.
 *
 * TODO(google-oauth): swap the create-new path for a real
 * google.calendar.calendars.insert call against the user's account.
 */
import { type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/rbac/access-control";
import { apiSuccess, apiError, handleError, zodErrorsToDetails } from "@/lib/api-response";
import { saveCalendarSyncSettings } from "@/lib/integrations/mock-google-calendar";
import { getBundle } from "@/lib/business/mock-tenant-store";

const ALLOWED = new Set(["TENANT_OWNER", "TENANT_ADMIN", "SUPER_ADMIN"]);

const SettingsSchema = z.object({
  readCalendarIds: z.array(z.string().min(1)),
  writeCalendarId: z.string().min(1),
});

export async function PATCH(request: NextRequest) {
  try {
    const ctx = getAuthContext(request);
    if (!ALLOWED.has(ctx.userRole)) {
      return apiError("FORBIDDEN", "Integration is for tenant owners", 403);
    }
    const body = (await request.json().catch(() => null)) as unknown;
    const parsed = SettingsSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid settings",
        422,
        zodErrorsToDetails(parsed.error)
      );
    }
    const tenant = getBundle(ctx.tenantId).tenant;
    const next = saveCalendarSyncSettings(ctx.tenantId, {
      readCalendarIds: parsed.data.readCalendarIds,
      writeCalendarId: parsed.data.writeCalendarId,
      tenantName: tenant.name,
      tenantTimezone: tenant.timezone || "UTC",
    });
    if (!next) {
      return apiError("NOT_CONNECTED", "Connect Google Calendar first", 409);
    }
    return apiSuccess({
      integration: next.integration,
      settings: next.settings,
    });
  } catch (err) {
    return handleError(err);
  }
}
