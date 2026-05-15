import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, signAccessToken, signRefreshToken } from "@/lib/auth";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import { LoginSchema } from "@famm/shared";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const input = LoginSchema.parse(body);

    const tenant = await prisma.tenant.findUnique({
      where: { slug: input.tenantSlug },
    });

    if (!tenant || tenant.status === "SUSPENDED") {
      return apiError("UNAUTHORIZED", "Invalid credentials", 401);
    }

    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        memberships: { where: { tenantId: tenant.id } },
      },
    });

    if (!user?.passwordHash || !user.memberships[0]) {
      return apiError("UNAUTHORIZED", "Invalid credentials", 401);
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      return apiError("UNAUTHORIZED", "Invalid credentials", 401);
    }

    if (user.status === "SUSPENDED") {
      return apiError("FORBIDDEN", "Account suspended", 403);
    }

    const membership = user.memberships[0];

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

    return apiSuccess({
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
    });
  } catch (err) {
    return handleError(err);
  }
}
