import { type NextRequest } from "next/server";
import { getInviteByToken, acceptInvite } from "@/lib/auth/invite";
import { createSession } from "@/lib/auth/session";
import { issueTokenBundle } from "@/lib/auth/tokens";
import { secureCookieFlag } from "@/lib/auth/cookies";
import { writeAuditLog } from "@/lib/audit";
import { apiSuccess, apiError, handleError, zodErrorsToDetails } from "@/lib/api-response";
import { AcceptInviteSchema } from "@famm/shared";
import { prisma } from "@/lib/db";
import { ZodError } from "zod";

type RouteParams = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    let invite;
    try {
      invite = await getInviteByToken(token);
    } catch {
      return apiError("NOT_FOUND", "Invite not found or expired", 404);
    }

    return apiSuccess({
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        tenantId: invite.tenantId,
        tenantName: invite.tenant.name,
        tenantSlug: invite.tenant.slug,
        inviterName: `${invite.inviter.firstName} ${invite.inviter.lastName}`.trim(),
        message: invite.message,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const body = await request.json();
    const data = AcceptInviteSchema.parse(body);

    let invite;
    try {
      invite = await getInviteByToken(token);
    } catch {
      return apiError("NOT_FOUND", "Invite not found or expired", 404);
    }

    // Upsert the user account — email comes from the invite, not the body
    let user = await prisma.user.findUnique({
      where: { email: invite.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: invite.email,
          firstName: data.firstName ?? invite.email.split("@")[0] ?? "User",
          lastName: data.lastName ?? ".",
        },
      });
    }

    const { tenantId, role } = await acceptInvite({
      rawToken: token,
      userId: user.id,
      userEmail: invite.email,
    });

    const ipAddress = request.headers.get("x-forwarded-for") ?? undefined;
    const userAgent = request.headers.get("user-agent") ?? undefined;

    const { refreshToken, refreshTokenHash } = await issueTokenBundle({
      sub: user.id,
      email: user.email,
      tenantId,
      role,
      sid: "placeholder",
    });

    const session = await createSession({
      userId: user.id,
      tenantId,
      email: user.email,
      role,
      authMethod: "MAGIC_LINK",
      refreshTokenHash,
      ipAddress,
      userAgent,
      extraPermissions: [],
    });

    const accessToken = (
      await issueTokenBundle({
        sub: user.id,
        email: user.email,
        tenantId,
        role,
        sid: session.sessionId,
      })
    ).accessToken;

    writeAuditLog({
      tenantId,
      userId: user.id,
      action: "INVITE_ACCEPT",
      resource: "invite",
      resourceId: invite.id,
      ipAddress,
      userAgent,
    });

    const response = apiSuccess({ user: { id: user.id, email: user.email, role } });
    const secure = secureCookieFlag();
    response.cookies.set("access_token", accessToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: 60 * 15,
      path: "/",
    });
    response.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 30,
      path: "/api/v1/auth/refresh",
    });

    return response;
  } catch (err) {
    if (err instanceof ZodError) {
      return apiError("VALIDATION_ERROR", "Invalid request data", 400, zodErrorsToDetails(err));
    }
    return handleError(err);
  }
}
