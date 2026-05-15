import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, signAccessToken, signRefreshToken } from "@/lib/auth";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import { CreateTenantSchema } from "@famm/shared";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const input = CreateTenantSchema.parse(body);

    const slugExists = await prisma.tenant.findUnique({
      where: { slug: input.slug },
    });
    if (slugExists) {
      return apiError("CONFLICT", "Tenant slug already taken", 409);
    }

    const ownerPasswordHash = await hashPassword(input.ownerPassword);

    const { tenant, user, membership } = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: input.name,
          slug: input.slug,
          status: "TRIAL",
          plan: "FREE",
          settings: {
            create: {
              timezone: input.timezone,
              currency: input.currency,
            },
          },
          branding: { create: {} },
        },
      });

      const user = await tx.user.create({
        data: {
          email: input.ownerEmail,
          passwordHash: ownerPasswordHash,
          firstName: input.ownerFirstName,
          lastName: input.ownerLastName,
          status: "ACTIVE",
        },
      });

      const membership = await tx.tenantMembership.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: "TENANT_OWNER",
        },
      });

      return { tenant, user, membership };
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
      },
    });

    return apiSuccess(
      {
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          plan: tenant.plan,
          status: tenant.status,
        },
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
