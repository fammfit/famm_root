import { type NextRequest } from "next/server";
import { withPermission, type AuthContext } from "@/lib/rbac/access-control";
import { createInvite } from "@/lib/auth/invite";
import { writeAuditLog } from "@/lib/audit";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import { CreateInviteSchema } from "@famm/shared";
import { ZodError } from "zod";

export const POST = withPermission("invites:create", async (request: NextRequest, ctx: AuthContext) => {
  try {
    if (!ctx.tenantId) {
      return apiError("FORBIDDEN", "Tenant context required", 403);
    }

    const body = await request.json();
    const data = CreateInviteSchema.parse(body);

    const { inviteId, token, expiresAt } = await createInvite({
      tenantId: ctx.tenantId,
      invitedByUserId: ctx.userId,
      invitedByRole: ctx.userRole,
      email: data.email,
      role: data.role,
      message: data.message,
    });

    writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "INVITE_CREATE",
      resourceType: "invite",
      resourceId: inviteId,
      metadata: { email: data.email, role: data.role },
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    const baseUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? request.nextUrl.origin;
    const inviteUrl = `${baseUrl}/invite/${token}`;

    return apiSuccess(
      {
        invite: {
          id: inviteId,
          email: data.email,
          role: data.role,
          expiresAt,
          inviteUrl,
        },
      },
      201
    );
  } catch (err) {
    if (err instanceof ZodError) {
      return apiError("VALIDATION_ERROR", "Invalid request data", 400, err.flatten());
    }
    return handleError(err);
  }
});
