import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/rbac/access-control";
import { apiSuccess, apiError, handleError, zodErrorsToDetails } from "@/lib/api-response";

const UpdateMeSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80).optional(),
    lastName: z.string().trim().min(1).max(80).optional(),
    phone: z
      .string()
      .regex(/^\+?[1-9]\d{6,19}$/)
      .optional(),
    timezone: z.string().min(1).max(64).optional(),
    avatarUrl: z.string().url().nullable().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "At least one field is required",
  });

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

export async function PATCH(request: NextRequest) {
  try {
    const ctx = getAuthContext(request);
    const body = (await request.json().catch(() => null)) as unknown;
    const parsed = UpdateMeSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid profile update",
        422,
        zodErrorsToDetails(parsed.error)
      );
    }
    const { phone, ...rest } = parsed.data;

    // If the phone changed, clear the verified marker. Re-verification is
    // enforced at the UI layer; this guarantees the server view is honest
    // even if a client tries to skip the verify step.
    const existing = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { phone: true },
    });
    const phoneChanged = phone !== undefined && phone !== existing?.phone;

    // Enforce uniqueness pre-flight so we can return a friendly error.
    if (phoneChanged && phone) {
      const taken = await prisma.user.findFirst({
        where: { phone, NOT: { id: ctx.userId } },
        select: { id: true },
      });
      if (taken) {
        return apiError("PHONE_TAKEN", "That phone is already on another account", 409);
      }
    }

    const updated = await prisma.user.update({
      where: { id: ctx.userId },
      data: {
        ...rest,
        ...(phone !== undefined ? { phone } : {}),
        ...(phoneChanged ? { phoneVerified: null } : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        timezone: true,
        emailVerified: true,
        phoneVerified: true,
        status: true,
      },
    });

    return apiSuccess({ user: updated });
  } catch (err) {
    return handleError(err);
  }
}
