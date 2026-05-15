import { describe, it, expect, beforeEach } from "vitest";
import {
  createSession,
  getSession,
  isSessionRevoked,
  revokeSession,
  revokeAllUserSessions,
  rotateRefreshToken,
  listUserSessions,
} from "@/lib/auth/session";
import { issueTokenBundle, hashToken, generateSecureToken } from "@/lib/auth/tokens";
import { prisma } from "@/lib/db";
import { createTestTenant, createTestUser } from "../setup/factories";

function makeSessionParams(userId: string, tenantId: string, email = "u@test.example") {
  return {
    userId,
    tenantId,
    email,
    role: "CLIENT" as const,
    authMethod: "MAGIC_LINK" as const,
    refreshTokenHash: hashToken(generateSecureToken()),
    extraPermissions: [] as string[],
  };
}

describe("Session management", () => {
  let tenantId: string;
  let userId: string;
  const email = "session-test@test.example";

  beforeEach(async () => {
    const tenant = await createTestTenant();
    tenantId = tenant.id;
    const user = await createTestUser(tenantId, { email });
    userId = user.id;
  });

  it("creates a session in DB and Redis", async () => {
    const session = await createSession(makeSessionParams(userId, tenantId, email));

    expect(session.sessionId).toBeTruthy();
    expect(session.userId).toBe(userId);
    expect(session.tenantId).toBe(tenantId);

    // Should be in Redis
    const fromRedis = await getSession(session.sessionId);
    expect(fromRedis?.userId).toBe(userId);

    // Should be in DB
    const fromDb = await prisma.session.findUnique({ where: { id: session.sessionId } });
    expect(fromDb).toBeTruthy();
  });

  it("retrieves session from Redis cache first", async () => {
    const session = await createSession(makeSessionParams(userId, tenantId, email));
    const retrieved = await getSession(session.sessionId);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.sessionId).toBe(session.sessionId);
  });

  it("revokes a session and sets revocation marker", async () => {
    const session = await createSession(makeSessionParams(userId, tenantId, email));

    await revokeSession(session.sessionId, "logout");

    expect(await isSessionRevoked(session.sessionId)).toBe(true);

    const fromDb = await prisma.session.findUnique({ where: { id: session.sessionId } });
    expect(fromDb?.isRevoked).toBe(true);
    expect(fromDb?.revokedReason).toBe("logout");
  });

  it("revokes all user sessions except current", async () => {
    const s1 = await createSession(makeSessionParams(userId, tenantId, email));
    const s2 = await createSession({ ...makeSessionParams(userId, tenantId, email), authMethod: "SMS_OTP" });
    const s3 = await createSession(makeSessionParams(userId, tenantId, email));

    await revokeAllUserSessions(userId, s1.sessionId);

    expect(await isSessionRevoked(s1.sessionId)).toBe(false); // kept
    expect(await isSessionRevoked(s2.sessionId)).toBe(true);
    expect(await isSessionRevoked(s3.sessionId)).toBe(true);
  });

  it("rotates refresh token atomically", async () => {
    const { refreshToken: oldToken, refreshTokenHash: oldHash } = await issueTokenBundle({
      sub: userId,
      email,
      tenantId,
      role: "CLIENT",
      sid: "placeholder",
    });

    const session = await createSession({
      ...makeSessionParams(userId, tenantId, email),
      refreshTokenHash: oldHash,
    });

    const { refreshTokenHash: newHash } = await issueTokenBundle({
      sub: userId,
      email,
      tenantId,
      role: "CLIENT",
      sid: session.sessionId,
    });

    const updated = await rotateRefreshToken(oldToken, newHash);
    expect(updated).not.toBeNull();

    const fromDb = await prisma.session.findUnique({ where: { id: session.sessionId } });
    expect(fromDb?.refreshTokenHash).toBe(newHash);

    // Old token should no longer work
    await expect(rotateRefreshToken(oldToken, "another-hash")).resolves.toBeNull();
  });

  it("lists only active sessions for user", async () => {
    const s1 = await createSession(makeSessionParams(userId, tenantId, email));
    const s2 = await createSession(makeSessionParams(userId, tenantId, email));
    await revokeSession(s2.sessionId, "logout");

    const sessions = await listUserSessions(userId, tenantId);
    const ids = sessions.map((s) => s.sessionId);
    expect(ids).toContain(s1.sessionId);
    expect(ids).not.toContain(s2.sessionId);
  });
});
