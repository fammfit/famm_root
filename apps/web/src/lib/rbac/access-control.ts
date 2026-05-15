import { NextResponse, type NextRequest } from "next/server";
import type { Permission } from "@famm/auth";
import { can, canAny } from "@famm/auth";
import type { UserRole } from "@famm/types";

export interface AuthContext {
  userId: string;
  tenantId: string;
  userEmail: string;
  userRole: UserRole;
  sessionId: string;
  extraPermissions: string[];
}

// Extract auth context from request headers (set by middleware)
export function getAuthContext(request: NextRequest): AuthContext {
  const userId = request.headers.get("x-user-id");
  const tenantId = request.headers.get("x-tenant-id");
  const userEmail = request.headers.get("x-user-email");
  const userRole = request.headers.get("x-user-role") as UserRole | null;
  const sessionId = request.headers.get("x-session-id");
  const rawPerms = request.headers.get("x-extra-permissions");
  const extraPermissions = rawPerms ? rawPerms.split(",").filter(Boolean) : [];

  if (!userId || !tenantId || !userEmail || !userRole || !sessionId) {
    throw new Error("Missing auth context headers");
  }

  return { userId, tenantId, userEmail, userRole, sessionId, extraPermissions };
}

// Server component version (uses next/headers)
export async function getServerAuthContext(): Promise<AuthContext> {
  const { headers } = await import("next/headers");
  const h = headers();

  const userId = h.get("x-user-id");
  const tenantId = h.get("x-tenant-id");
  const userEmail = h.get("x-user-email");
  const userRole = h.get("x-user-role") as UserRole | null;
  const sessionId = h.get("x-session-id");
  const rawPerms = h.get("x-extra-permissions");
  const extraPermissions = rawPerms ? rawPerms.split(",").filter(Boolean) : [];

  if (!userId || !tenantId || !userEmail || !userRole || !sessionId) {
    throw new Error("Missing auth context");
  }

  return { userId, tenantId, userEmail, userRole, sessionId, extraPermissions };
}

// Inline permission check — throws if denied
export function assertPermission(
  ctx: AuthContext,
  permission: Permission
): void {
  if (!can(ctx.userRole, permission, ctx.extraPermissions)) {
    throw Object.assign(new Error("Insufficient permissions"), {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
}

// Route handler wrapper — returns 403 if permission check fails
export type RouteHandler = (
  request: NextRequest,
  context: { params: Record<string, string> }
) => Promise<NextResponse>;

export function withPermission(
  permission: Permission | Permission[],
  handler: (
    request: NextRequest,
    ctx: AuthContext,
    routeContext: { params: Record<string, string> }
  ) => Promise<NextResponse>
): RouteHandler {
  return async (request, routeContext) => {
    try {
      const ctx = getAuthContext(request);
      const perms = Array.isArray(permission) ? permission : [permission];

      if (!canAny(ctx.userRole, perms, ctx.extraPermissions)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "You don't have permission to perform this action",
            },
          },
          { status: 403 }
        );
      }

      return handler(request, ctx, routeContext);
    } catch {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }
  };
}

// Ensure the acting user can only modify resources within their own tenant
export function assertSameTenant(
  ctx: AuthContext,
  resourceTenantId: string
): void {
  if (ctx.userRole !== "SUPER_ADMIN" && ctx.tenantId !== resourceTenantId) {
    throw Object.assign(new Error("Cross-tenant access denied"), {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
}
