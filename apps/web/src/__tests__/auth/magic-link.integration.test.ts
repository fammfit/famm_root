import { describe, it, expect, beforeEach } from "vitest";
import { createMagicLink, verifyMagicLink } from "@/lib/auth/magic-link";
import { prisma } from "@/lib/db";
import { createTestTenant } from "../setup/factories";

describe("Magic link auth", () => {
  let tenantId: string;
  const email = "magic@test.example";

  beforeEach(async () => {
    const tenant = await createTestTenant();
    tenantId = tenant.id;
  });

  it("creates a magic link token and returns a raw token", async () => {
    const { token } = await createMagicLink({ email, tenantId });
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(32);
  });

  it("stores only the hash in the DB (not the raw token)", async () => {
    const { token } = await createMagicLink({ email, tenantId });
    const records = await prisma.magicLinkToken.findMany({ where: { email, tenantId } });
    expect(records.length).toBe(1);
    expect(records[0]!.tokenHash).not.toBe(token);
    expect(records[0]!.tokenHash).toHaveLength(64); // SHA-256 hex
  });

  it("verifies a valid token successfully", async () => {
    const { token } = await createMagicLink({ email, tenantId });
    await expect(verifyMagicLink({ token, email, tenantId })).resolves.toBe(true);
  });

  it("marks the token as used after verification", async () => {
    const { token } = await createMagicLink({ email, tenantId });
    await verifyMagicLink({ token, email, tenantId });

    const record = await prisma.magicLinkToken.findFirst({ where: { email, tenantId } });
    expect(record?.usedAt).not.toBeNull();
  });

  it("rejects a token used a second time", async () => {
    const { token } = await createMagicLink({ email, tenantId });
    await verifyMagicLink({ token, email, tenantId });
    await expect(verifyMagicLink({ token, email, tenantId })).rejects.toThrow("TOKEN_ALREADY_USED");
  });

  it("rejects an expired token", async () => {
    const { token } = await createMagicLink({ email, tenantId });
    await prisma.magicLinkToken.updateMany({
      where: { email, tenantId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(verifyMagicLink({ token, email, tenantId })).rejects.toThrow("TOKEN_EXPIRED");
  });

  it("invalidates previous tokens when a new one is created", async () => {
    const { token: first } = await createMagicLink({ email, tenantId });
    await createMagicLink({ email, tenantId }); // creates second, invalidates first

    await expect(verifyMagicLink({ token: first, email, tenantId })).rejects.toThrow("TOKEN_ALREADY_USED");
  });

  it("rejects a token with mismatched email", async () => {
    const { token } = await createMagicLink({ email, tenantId });
    await expect(
      verifyMagicLink({ token, email: "other@test.example", tenantId })
    ).rejects.toThrow("INVALID_TOKEN");
  });
});
