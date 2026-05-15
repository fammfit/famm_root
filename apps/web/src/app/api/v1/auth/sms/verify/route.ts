import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifySmsOtp } from "@/lib/auth/sms-otp";
import { createSession } from "@/lib/auth/session";
import { issueTokenBundle } from "@/lib/auth/tokens";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";
import { SmsOtpVerifySchema } from "@famm/shared";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const { phone, code, tenantSlug } = SmsOtpVerifySchema.parse(body);

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant || tenant.status === "SUSPENDED") {
      return apiError("UNAUTHORIZED", "Invalid credentials", 401);
    }

    try {
      await verifySmsOtp({ phone, code, tenantId: tenant.id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      const codeMap: Record<string, [string, number]> = {
        INVALID_OR_EXPIRED_OTP: ["INVALID_CODE", 401],
        INVALID_CODE: ["INVALID_CODE", 401],
        MAX_ATTEMPTS_EXCEEDED: ["MAX_ATTEMPTS_EXCEEDED", 429],
      };
      const [code, status] = codeMap[msg] ?? ["INVALID_CODE", 401];
      return apiError(code, "Invalid or expired code", status);
    }

    // Find or create user by phone
    const normalizedPhone = phone.replace(/\s+/g, "").replace(/[()-]/g, "");
    const user = await prisma.user.upsert({
      where: { phone: normalizedPhone },
      create: {
        email: `${normalizedPhone.replace("+", "")}@phone.famm.local`,
        phone: normalizedPhone,
        phoneVerified: new Date(),
        firstName: "User",
        lastName: "",
        status: "ACTIVE",
        memberships: { create: { tenantId: tenant.id, role: "CLIENT" } },
      },
      update: { phoneVerified: new Date(), status: "ACTIVE" },
      include: { memberships: { where: { tenantId: tenant.id } } },
    });

    if (!user.memberships[0]) {
      await prisma.tenantMembership.create({
        data: { tenantId: tenant.id, userId: user.id, role: "CLIENT" },
      });
    }

    const membership = user.memberships[0] ?? { role: "CLIENT" as const, permissions: [] };

    const session = await createSession({
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      role: membership.role,
      authMethod: "SMS_OTP",
      refreshTokenHash: "placeholder",
      ipAddress: request.headers.get("x-forwarded-for") ?? request.ip ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    const { accessToken, refreshToken, refreshTokenHash } = await issueTokenBundle({
      sub: user.id,
      email: user.email,
      tenantId: tenant.id,
      role: membership.role,
      sid: session.sessionId,
    });

    await prisma.session.update({
      where: { id: session.sessionId },
      data: { refreshTokenHash },
    });

    writeAuditLog({
      tenantId: tenant.id,
      userId: user.id,
      sessionId: session.sessionId,
      action: "auth.sms_otp.verified",
      resource: "Session",
      resourceId: session.sessionId,
      ipAddress: request.headers.get("x-forwarded-for") ?? request.ip ?? undefined,
    });

    return apiSuccess({
      accessToken,
      refreshToken,
      user: { id: user.id, phone: user.phone, role: membership.role, tenantId: tenant.id },
    });
  } catch (err) {
    return handleError(err);
  }
}
