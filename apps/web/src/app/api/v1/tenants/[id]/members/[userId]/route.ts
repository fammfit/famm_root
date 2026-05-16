import { type NextRequest } from "next/server";
import { getAuthContextChecked, assertPermission } from "@/lib/rbac/access-control";
import { assertMembership } from "@/lib/tenant/query-helpers";
import { canAssignRole } from "@famm/auth";
import { writeAuditLog } from "@/lib/audit";
import { apiSuccess, apiError, handleError, zodErrorsToDetails } from "@/lib/api-response";
import { UpdateMemberRoleSchema } from "@famm/shared";
import { prisma } from "@/lib/db";
import { ZodError } from "zod";
import type { UserRole } from "@famm/db";

type RouteParams = { params: Promise<{ id: string; userId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: tenantId, userId: targetUserId } = await params;
    const ctx = await getAuthContextChecked(request);

    assertPermission(ctx, "user:update:role");
    await assertMembership(ctx.userId, tenantId);

    const body = await request.json();
    const { role: newRole } = UpdateMemberRoleSchema.parse(body);

    if (!canAssignRole(ctx.userRole, newRole as UserRole)) {
      return apiError("FORBIDDEN", "Cannot assign a role equal to or higher than your own", 403);
    }

    const membership = await prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId: targetUserId } },
      include: { user: true },
    });

    if (!membership) {
      return apiError("NOT_FOUND", "Member not found", 404);
    }

    if (!canAssignRole(ctx.userRole, membership.role as UserRole)) {
      return apiError("FORBIDDEN", "Cannot modify a member with equal or higher role", 403);
    }

    const updated = await prisma.tenantMembership.update({
      where: { tenantId_userId: { tenantId, userId: targetUserId } },
      data: { role: newRole as UserRole },
    });

    writeAuditLog({
      tenantId,
      userId: ctx.userId,
      action: "MEMBER_ROLE_UPDATE",
      resource: "tenantMembership",
      resourceId: `${targetUserId}:${tenantId}`,
      metadata: { previousRole: membership.role, newRole },
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return apiSuccess({ membership: updated });
  } catch (err) {
    if (err instanceof ZodError) {
      return apiError("VALIDATION_ERROR", "Invalid request data", 400, zodErrorsToDetails(err));
    }
    return handleError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: tenantId, userId: targetUserId } = await params;
    const ctx = await getAuthContextChecked(request);

    // Allow self-removal or require member:delete permission
    if (ctx.userId !== targetUserId) {
      assertPermission(ctx, "member:delete");
    }

    await assertMembership(ctx.userId, tenantId);

    const membership = await prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId: targetUserId } },
    });

    if (!membership) {
      return apiError("NOT_FOUND", "Member not found", 404);
    }

    // Prevent removing a member with equal or higher role (unless self-removal)
    if (ctx.userId !== targetUserId && !canAssignRole(ctx.userRole, membership.role as UserRole)) {
      return apiError("FORBIDDEN", "Cannot remove a member with equal or higher role", 403);
    }

    await prisma.tenantMembership.delete({
      where: { tenantId_userId: { tenantId, userId: targetUserId } },
    });

    writeAuditLog({
      tenantId,
      userId: ctx.userId,
      action: "MEMBER_REMOVE",
      resource: "tenantMembership",
      resourceId: `${targetUserId}:${tenantId}`,
      metadata: { removedRole: membership.role, selfRemoval: ctx.userId === targetUserId },
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return apiSuccess({ removed: true });
  } catch (err) {
    return handleError(err);
  }
}
