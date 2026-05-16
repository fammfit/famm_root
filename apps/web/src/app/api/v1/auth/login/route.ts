import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { newRefreshTokenPair, signAccessToken } from "@/lib/auth/tokens";
import { createSession } from "@/lib/auth/session";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import { LoginSchema } from "@famm/shared";

// Pre-computed bcrypt hash of an unlikely password. Used to keep the
// not-found path's timing close to the found path's timing so login attempts
// cannot enumerate registered emails via response time.
const DUMMY_BCRYPT_HASH = "$2a$12$CwTycUXWue0Thq9StjUM0uJ8.dFZmZUO0QO1QO1QO1QO1QO1QO1Qa";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const input = LoginSchema.parse(body);

    const tenant = await prisma.tenant.findUnique({
      where: { slug: input.tenantSlug },
    });

    const user =
      tenant && tenant.status !== "SUSPENDED"
        ? await prisma.user.findUnique({
            where: { email: input.email },
            include: { memberships: { where: { tenantId: tenant.id } } },
          })
        : null;

    // Always run a bcrypt compare so the not-found path's response time
    // matches the wrong-password path's, preventing email enumeration.
    const passwordOk = await verifyPassword(
      input.password,
      user?.passwordHash ?? DUMMY_BCRYPT_HASH
    );

    if (!tenant || tenant.status === "SUSPENDED") {
      return apiError("UNAUTHORIZED", "Invalid credentials", 401);
    }
    if (!user?.passwordHash || !user.memberships[0] || !passwordOk) {
      return apiError("UNAUTHORIZED", "Invalid credentials", 401);
    }
    if (user.status === "SUSPENDED") {
      return apiError("FORBIDDEN", "Account suspended", 403);
    }

    const membership = user.memberships[0];

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
