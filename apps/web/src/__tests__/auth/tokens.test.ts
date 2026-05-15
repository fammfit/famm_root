import { describe, it, expect } from "vitest";
import {
  generateSecureToken,
  generateOtp,
  hashToken,
  signAccessToken,
  verifyAccessToken,
  issueTokenBundle,
} from "@/lib/auth/tokens";

describe("generateSecureToken", () => {
  it("generates a hex string of correct length", () => {
    const token = generateSecureToken(32);
    expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
  });

  it("generates unique tokens", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateSecureToken()));
    expect(tokens.size).toBe(100);
  });
});

describe("generateOtp", () => {
  it("generates numeric string of specified length", () => {
    const otp = generateOtp(6);
    expect(otp).toMatch(/^\d{6}$/);
  });

  it("zero-pads short values", () => {
    // Test that OTP is always the right length
    for (let i = 0; i < 50; i++) {
      const otp = generateOtp(6);
      expect(otp).toHaveLength(6);
    }
  });
});

describe("hashToken", () => {
  it("produces deterministic SHA-256 hex hash", () => {
    const token = "test-token-value";
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it("different tokens produce different hashes", () => {
    expect(hashToken("token-a")).not.toBe(hashToken("token-b"));
  });
});

describe("signAccessToken / verifyAccessToken", () => {
  const payload = {
    sub: "user_123",
    email: "test@example.com",
    tenantId: "tenant_abc",
    role: "CLIENT" as const,
    sid: "sess_xyz",
  };

  it("signs and verifies a token", async () => {
    const token = await signAccessToken(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // JWT structure

    const verified = await verifyAccessToken(token);
    expect(verified.sub).toBe(payload.sub);
    expect(verified.email).toBe(payload.email);
    expect(verified.tenantId).toBe(payload.tenantId);
    expect(verified.role).toBe(payload.role);
    expect(verified.sid).toBe(payload.sid);
  });

  it("rejects a tampered token", async () => {
    const token = await signAccessToken(payload);
    const parts = token.split(".");
    parts[1] = Buffer.from(JSON.stringify({ sub: "attacker" })).toString("base64url");
    const tampered = parts.join(".");
    await expect(verifyAccessToken(tampered)).rejects.toThrow();
  });
});

describe("issueTokenBundle", () => {
  it("returns accessToken, refreshToken, and refreshTokenHash", async () => {
    const bundle = await issueTokenBundle({
      sub: "user_1",
      email: "x@example.com",
      tenantId: null,
      role: "CLIENT",
      sid: "sess_1",
    });
    expect(typeof bundle.accessToken).toBe("string");
    expect(typeof bundle.refreshToken).toBe("string");
    expect(bundle.refreshTokenHash).toBe(hashToken(bundle.refreshToken));
  });
});
