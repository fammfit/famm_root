import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { sendSmsOtp } from "@/lib/auth/sms-otp";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";
import { SmsOtpRequestSchema } from "@famm/shared";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const { phone, tenantSlug } = SmsOtpRequestSchema.parse(body);

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant || tenant.status === "SUSPENDED") {
      return apiSuccess({ sent: true }); // anti-enumeration
    }

    try {
      const result = await sendSmsOtp({
        phone,
        tenantId: tenant.id,
        requestIp: request.headers.get("x-forwarded-for") ?? request.ip ?? undefined,
      });

      writeAuditLog({
        tenantId: tenant.id,
        action: "auth.sms_otp.requested",
        resource: "User",
        metadata: { phone: phone.replace(/\d(?=\d{4})/g, "*") },
        ipAddress: request.headers.get("x-forwarded-for") ?? request.ip ?? undefined,
      });

      return apiSuccess({ sent: true, expiresAt: result.expiresAt });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "RATE_LIMITED") {
        return apiError("RATE_LIMITED", "Too many requests, please try again later", 429);
      }
      throw err;
    }
  } catch (err) {
    return handleError(err);
  }
}
