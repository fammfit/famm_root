import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createMagicLink, buildMagicLinkUrl } from "@/lib/auth/magic-link";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";
import { MagicLinkRequestSchema } from "@famm/shared";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const { email, tenantSlug } = MagicLinkRequestSchema.parse(body);

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant || tenant.status === "SUSPENDED") {
      // Return success regardless to avoid tenant enumeration
      return apiSuccess({ sent: true });
    }

    try {
      const { token, expiresAt } = await createMagicLink({
        email,
        tenantId: tenant.id,
        requestIp: request.headers.get("x-forwarded-for") ?? request.ip ?? undefined,
      });

      const magicUrl = buildMagicLinkUrl(
        process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000",
        token,
        email,
        tenantSlug
      );

      // TODO: send email via your email provider (Resend, SendGrid, etc.)
      // await sendEmail({ to: email, subject: "Your login link", body: magicUrl });
      if (process.env["NODE_ENV"] !== "production") {
        console.warn(`[magic-link] ${magicUrl} (expires ${expiresAt.toISOString()})`);
      }

      writeAuditLog({
        tenantId: tenant.id,
        action: "auth.magic_link.requested",
        resource: "User",
        metadata: { email },
        ipAddress: request.headers.get("x-forwarded-for") ?? request.ip ?? undefined,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "RATE_LIMITED") {
        return apiError("RATE_LIMITED", "Too many requests, please try again later", 429);
      }
    }

    // Always return success to prevent email enumeration
    return apiSuccess({ sent: true });
  } catch (err) {
    return handleError(err);
  }
}
