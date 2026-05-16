import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { sendSmsOtp, verifySmsOtp } from "@/lib/auth/sms-otp";
import { prisma } from "@/lib/db";
import { createTestTenant } from "../setup/factories";

describe("SMS OTP auth", () => {
  let tenantId: string;
  const phone = "+15550001234";

  beforeEach(async () => {
    const tenant = await createTestTenant();
    tenantId = tenant.id;
    // Ensure non-production mode so Twilio isn't called and code is returned
    vi.stubEnv("NODE_ENV", "test");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("creates an OTP record and returns the code in non-production mode", async () => {
    const result = await sendSmsOtp({ phone, tenantId });
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(result.code).toMatch(/^\d{6}$/);
  });

  it("stores only the bcrypt hash, not the raw OTP", async () => {
    const result = await sendSmsOtp({ phone, tenantId });
    const record = await prisma.smsOtp.findFirst({ where: { phone, tenantId } });
    expect(record).not.toBeNull();
    expect(record!.codeHash).not.toBe(result.code);
    expect(record!.codeHash.startsWith("$2")).toBe(true); // bcrypt prefix
  });

  it("verifies correct OTP", async () => {
    const { code } = await sendSmsOtp({ phone, tenantId });
    await expect(verifySmsOtp({ phone, tenantId, code: code! })).resolves.toBe(true);
  });

  it("rejects wrong OTP and increments attempt count", async () => {
    await sendSmsOtp({ phone, tenantId });
    await expect(verifySmsOtp({ phone, tenantId, code: "000000" })).rejects.toThrow("INVALID_CODE");

    const record = await prisma.smsOtp.findFirst({ where: { phone, tenantId } });
    expect(record!.attempts).toBeGreaterThan(0);
  });

  it("locks out after max attempts", async () => {
    await sendSmsOtp({ phone, tenantId });

    // Exhaust all attempts with wrong codes
    for (let i = 0; i < 5; i++) {
      await verifySmsOtp({ phone, tenantId, code: "000000" }).catch(() => null);
    }

    // 6th attempt should hit MAX_ATTEMPTS_EXCEEDED (attempts already at 5)
    await expect(verifySmsOtp({ phone, tenantId, code: "000000" })).rejects.toThrow(
      "MAX_ATTEMPTS_EXCEEDED"
    );
  });

  it("rejects an expired OTP", async () => {
    const { code } = await sendSmsOtp({ phone, tenantId });
    await prisma.smsOtp.updateMany({
      where: { phone, tenantId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(verifySmsOtp({ phone, tenantId, code: code! })).rejects.toThrow(
      "INVALID_OR_EXPIRED_OTP"
    );
  });

  it("marks OTP as verified after successful check", async () => {
    const { code } = await sendSmsOtp({ phone, tenantId });
    await verifySmsOtp({ phone, tenantId, code: code! });
    const record = await prisma.smsOtp.findFirst({ where: { phone, tenantId } });
    expect(record!.verifiedAt).not.toBeNull();
  });

  it("invalidates previous OTPs when new one is sent", async () => {
    const { code: firstCode } = await sendSmsOtp({ phone, tenantId });
    await sendSmsOtp({ phone, tenantId }); // send second — invalidates first

    // First OTP should now be "verified" (used as invalidation marker)
    const firstRecord = await prisma.smsOtp.findFirst({
      where: { phone, tenantId },
      orderBy: { createdAt: "asc" },
    });
    expect(firstRecord!.verifiedAt).not.toBeNull();

    // First code should fail (record no longer active)
    await expect(verifySmsOtp({ phone, tenantId, code: firstCode! })).rejects.toThrow();
  });
});
