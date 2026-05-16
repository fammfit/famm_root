import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { newRefreshTokenPair, signAccessToken } from "@/lib/auth/tokens";
import { createSession } from "@/lib/auth/session";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import { RegisterSchema } from "@famm/shared";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const input = RegisterSchema.parse(body);

    const tenant = await prisma.tenant.findUnique({
      where: { slug: input.tenantSlug },
      include: { settings: true },
    });

    if (!tenant) {
      return apiError("TENANT_NOT_FOUND", "Tenant not found", 404);
    }

    if (tenant.status === "SUSPENDED") {
      return apiError("TENANT_SUSPENDED", "Tenant is suspended", 403);
    }

    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      const existingMembership = await prisma.tenantMembership.findUnique({
        where: {
          tenantId_userId: { tenantId: tenant.id, userId: existing.id },
        },
      });
      if (existingMembership) {
        return apiError("CONFLICT", "Email already registered in this tenant", 409);
      }
    }

    const passwordHash = await hashPassword(input.password);

    const { user, membership } = await prisma.$transaction(async (tx) => {
      const user =
        existing ??
        (await tx.user.create({
          data: {
            email: input.email,
            passwordHash,
            firstName: input.firstName,
            lastName: input.lastName,
            timezone: input.timezone,
            status: "ACTIVE",
          },
        }));

      const membership = await tx.tenantMembership.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: "CLIENT",
        },
      });

      return { user, membership };
    });

    const { refreshToken, refreshTokenHash } = newRefreshTokenPair();

    const session = await createSession({
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      role: membership.role,
      authMethod: "PASSWORD",
      refreshTokenHash,
      ipAddress: request.headers.get("x-forwarded-for") ?? request.ip ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      tenantId: tenant.id,
      role: membership.role,
      sid: session.sessionId,
    });

    return apiSuccess(
      {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: membership.role,
          tenantId: tenant.id,
        },
      },
      201
    );
  } catch (err) {
    return handleError(err);
  }
}
