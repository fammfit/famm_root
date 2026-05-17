import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyMagicLink } from "@/lib/auth/magic-link";
import { createSession } from "@/lib/auth/session";
import { newRefreshTokenPair, signAccessToken } from "@/lib/auth/tokens";
import { attachSessionCookies, jsonWithSessionCookies } from "@/lib/auth/session-cookies";
import { apiError, handleError } from "@/lib/api-response";
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

    const { refreshToken, refreshTokenHash } = newRefreshTokenPair();

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

    const finalToken = await signAccessToken({
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

    // If the request is an API call (the /auth/magic-link landing page does
    // this), return JSON with cookies attached so the SPA can immediately
    // navigate. Otherwise the email link arrived in a fresh browser tab —
    // set cookies and redirect to / (role-aware redirect routes from there).
    const acceptsJson = request.headers.get("accept")?.includes("application/json");
    if (acceptsJson) {
      return jsonWithSessionCookies(
        {
          success: true,
          data: {
            accessToken: finalToken,
            user: {
              id: user.id,
              email: user.email,
              role: membership.role,
              tenantId: tenant.id,
            },
          },
          meta: { timestamp: new Date().toISOString(), version: "1.0" },
        },
        { accessToken: finalToken, refreshToken }
      );
    }

    const appUrl =
      process.env["NEXT_PUBLIC_APP_URL"] ??
      (process.env["NODE_ENV"] === "production"
        ? (() => {
            throw new Error("NEXT_PUBLIC_APP_URL must be set in production");
          })()
        : "http://localhost:3000");
    return attachSessionCookies(NextResponse.redirect(new URL("/", appUrl)), {
      accessToken: finalToken,
      refreshToken,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (["INVALID_TOKEN", "TOKEN_ALREADY_USED", "TOKEN_EXPIRED"].includes(msg)) {
      return apiError(msg, "This magic link is invalid or has expired", 400);
    }
    return handleError(err);
  }
}
