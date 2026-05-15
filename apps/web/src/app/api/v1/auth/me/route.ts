import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/rbac/access-control";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const ctx = getAuthContext(request);

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        timezone: true,
        status: true,
        isSuperAdmin: true,
        createdAt: true,
        memberships: {
          where: { tenantId: ctx.tenantId },
          select: { role: true, permissions: true, joinedAt: true },
        },
        trainerProfile: {
          select: {
            id: true,
            bio: true,
            specialties: true,
            leadTrainerId: true,
            stripeConnectOnboarded: true,
            commissionRate: true,
          },
        },
      },
    });

    if (!user) return apiError("NOT_FOUND", "User not found", 404);

    const membership = user.memberships[0];

    return apiSuccess({
      ...user,
      role: membership?.role ?? ctx.userRole,
      permissions: membership?.permissions ?? [],
      tenantId: ctx.tenantId,
    });
  } catch (err) {
    return handleError(err);
  }
}
