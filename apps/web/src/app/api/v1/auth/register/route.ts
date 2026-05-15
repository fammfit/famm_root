import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, signAccessToken, signRefreshToken } from "@/lib/auth";
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
        return apiError(
          "CONFLICT",
          "Email already registered in this tenant",
          409
        );
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

    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      tenantId: tenant.id,
      role: membership.role,
    });

    const refreshToken = await signRefreshToken();

    await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        ipAddress:
          request.headers.get("x-forwarded-for") ?? request.ip ?? null,
        userAgent: request.headers.get("user-agent") ?? undefined,
      },
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
