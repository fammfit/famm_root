import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyMagicLink } from "@/lib/auth/magic-link";
import { createSession } from "@/lib/auth/session";
import { issueTokenBundle } from "@/lib/auth/tokens";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";
import { MagicLinkVerifySchema } from "@famm/shared";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = MagicLinkVerifySchema.parse({
      token: searchParams.get("token"),
      email: searchParams.get("email"),
      tenant: searchParams.get("tenant"),
    });

    const tenant = await prisma.tenant.findUnique({ where: { slug: params.tenant } });
    if (!tenant || tenant.status === "SUSPENDED") {
      return apiError("TENANT_NOT_FOUND", "Invalid magic link", 400);
    }

    await verifyMagicLink({
      token: params.token,
      email: params.email,
      tenantId: tenant.id,
    });

    // Upsert user
    const user = await prisma.user.upsert({
      where: { email: params.email.toLowerCase() },
      create: {
        email: params.email.toLowerCase(),
        emailVerified: new Date(),
        firstName: params.email.split("@")[0] ?? "User",
        lastName: "",
        status: "ACTIVE",
        memberships: {
          create: { tenantId: tenant.id, role: "CLIENT" },
        },
      },
      update: { emailVerified: new Date(), status: "ACTIVE" },
      include: {
        memberships: { where: { tenantId: tenant.id } },
      },
    });

    if (!user.memberships[0]) {
      await prisma.tenantMembership.create({
        data: { tenantId: tenant.id, userId: user.id, role: "CLIENT" },
      });
    }

    const membership = user.memberships[0] ?? { role: "CLIENT" as const, permissions: [] };

    const { accessToken, refreshToken, refreshTokenHash } = await issueTokenBundle({
      sub: user.id,
      email: user.email,
      tenantId: tenant.id,
      role: membership.role,
      sid: "", // will be overwritten below
    });

    const session = await createSession({
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      role: membership.role,
      authMethod: "MAGIC_LINK",
      refreshTokenHash,
      ipAddress: request.headers.get("x-forwarded-for") ?? request.ip ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
      extraPermissions: "permissions" in membership ? (membership.permissions as string[]) : [],
    });

    // Re-sign with actual sessionId
    const { accessToken: finalToken } = await issueTokenBundle({
      sub: user.id,
      email: user.email,
      tenantId: tenant.id,
      role: membership.role,
      sid: session.sessionId,
    });

    writeAuditLog({
      tenantId: tenant.id,
      userId: user.id,
      sessionId: session.sessionId,
      action: "auth.magic_link.verified",
      resource: "Session",
      resourceId: session.sessionId,
      ipAddress: request.headers.get("x-forwarded-for") ?? request.ip ?? undefined,
    });

    // If the request is an API call, return JSON; otherwise redirect with cookie
    const acceptsJson = request.headers.get("accept")?.includes("application/json");
    if (acceptsJson) {
      return apiSuccess({
        accessToken: finalToken,
        refreshToken,
        user: { id: user.id, email: user.email, role: membership.role, tenantId: tenant.id },
      });
    }

    const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
    const response = NextResponse.redirect(new URL("/dashboard", appUrl));
    response.cookies.set("access_token", finalToken, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      maxAge: 60 * 15,
    });
    response.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      path: "/api/v1/auth/refresh",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (["INVALID_TOKEN", "TOKEN_ALREADY_USED", "TOKEN_EXPIRED"].includes(msg)) {
      return apiError(msg, "This magic link is invalid or has expired", 400);
    }
    return handleError(err);
  }
}
