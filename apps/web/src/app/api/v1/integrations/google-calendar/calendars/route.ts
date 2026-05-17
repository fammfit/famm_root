/**
 * GET /api/v1/integrations/google-calendar/calendars
 *
 * STUB. Returns the trainer's accessible calendars. Real implementation
 * pages google.calendar.calendarList.list and projects into the
 * GoogleCalendar shape.
 */
import { type NextRequest } from "next/server";
import { getAuthContext } from "@/lib/rbac/access-control";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import { getCalendarsIntegration } from "@/lib/integrations/mock-google-calendar";

const ALLOWED = new Set(["TENANT_OWNER", "TENANT_ADMIN", "SUPER_ADMIN"]);

export async function GET(request: NextRequest) {
  try {
    const ctx = getAuthContext(request);
    if (!ALLOWED.has(ctx.userRole)) {
      return apiError("FORBIDDEN", "Integration is for tenant owners", 403);
    }
    const bundle = getCalendarsIntegration(ctx.tenantId);
    if (!bundle) {
      return apiError("NOT_CONNECTED", "Connect Google Calendar first", 409);
    }
    return apiSuccess({ calendars: bundle.calendars });
  } catch (err) {
    return handleError(err);
  }
}
