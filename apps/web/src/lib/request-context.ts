import { headers } from "next/headers";
import { UnauthorizedError } from "@famm/shared";
import { isSessionRevoked } from "@/lib/auth/session";

export interface RequestContext {
  userId: string;
  tenantId: string;
  userEmail: string;
  userRole: string;
  sessionId: string;
}

/**
 * Synchronous extraction of identity from request headers (set by the edge
 * middleware). Does NOT check session revocation - middleware only verifies
 * the JWT signature/expiry, so revoked-but-not-yet-expired tokens still
 * pass. For state-changing routes, prefer {@link getRequestContextChecked}
 * which additionally consults the Redis revocation marker.
 */
export function getRequestContext(): RequestContext {
  const headersList = headers();
  const userId = headersList.get("x-user-id");
  const tenantId = headersList.get("x-tenant-id");
  const userEmail = headersList.get("x-user-email");
  const userRole = headersList.get("x-user-role");
  const sessionId = headersList.get("x-session-id");

  if (!userId || !tenantId || !userEmail || !userRole || !sessionId) {
    throw new UnauthorizedError();
  }

  return { userId, tenantId, userEmail, userRole, sessionId };
}

/**
 * Same as {@link getRequestContext} plus a Redis revocation check. Use this
 * for any handler that performs side effects (writes, payments, deletes).
 */
export async function getRequestContextChecked(): Promise<RequestContext> {
  const ctx = getRequestContext();
  if (await isSessionRevoked(ctx.sessionId)) {
    throw new UnauthorizedError();
  }
  return ctx;
}
