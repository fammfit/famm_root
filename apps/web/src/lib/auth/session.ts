import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import type { SessionData } from "@famm/auth";
import { SESSION_TTL_SECONDS } from "@famm/auth";
import type { AuthMethod, UserRole } from "@famm/types";
import { hashToken } from "./tokens";

function sessionKey(sessionId: string): string {
  return `sess:${sessionId}`;
}

function userSessionsKey(userId: string): string {
  return `user:sessions:${userId}`;
}

function revokedKey(sessionId: string): string {
  return `revoked:sess:${sessionId}`;
}

// ── Write ──────────────────────────────────────────────────────────────────

export interface CreateSessionParams {
  userId: string;
  tenantId: string | null;
  email: string;
  role: UserRole;
  authMethod: AuthMethod;
  refreshTokenHash: string;
  deviceId?: string;
  deviceName?: string;
  ipAddress?: string;
  userAgent?: string;
  extraPermissions?: string[];
}

export async function createSession(params: CreateSessionParams): Promise<SessionData> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  const dbSession = await prisma.session.create({
    data: {
      userId: params.userId,
      tenantId: params.tenantId,
      authMethod: params.authMethod,
      refreshTokenHash: params.refreshTokenHash,
      expiresAt,
      deviceId: params.deviceId,
      deviceName: params.deviceName,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });

  const data: SessionData = {
    sessionId: dbSession.id,
    userId: params.userId,
    tenantId: params.tenantId,
    email: params.email,
    role: params.role,
    authMethod: params.authMethod,
    deviceId: params.deviceId,
    deviceName: params.deviceName,
    ipAddress: params.ipAddress,
    extraPermissions: params.extraPermissions ?? [],
    createdAt: dbSession.createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  // Write to Redis for fast hot-path verification
  await Promise.all([
    redis.set(sessionKey(dbSession.id), JSON.stringify(data), "EX", SESSION_TTL_SECONDS),
    redis.sadd(userSessionsKey(params.userId), dbSession.id),
    redis.expire(userSessionsKey(params.userId), SESSION_TTL_SECONDS),
  ]);

  return data;
}

// ── Read ───────────────────────────────────────────────────────────────────

export async function getSession(sessionId: string): Promise<SessionData | null> {
  // Fast path: Redis
  const cached = await redis.get(sessionKey(sessionId)).catch(() => null);
  if (cached) {
    return JSON.parse(cached) as SessionData;
  }

  // Slow path: DB (e.g., after Redis restart)
  const dbSession = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      user: {
        include: {
          memberships: true,
        },
      },
    },
  });

  if (!dbSession || dbSession.isRevoked || dbSession.expiresAt < new Date()) {
    return null;
  }

  const membership = dbSession.tenantId
    ? dbSession.user.memberships.find((m) => m.tenantId === dbSession.tenantId)
    : null;

  const data: SessionData = {
    sessionId: dbSession.id,
    userId: dbSession.userId,
    tenantId: dbSession.tenantId,
    email: dbSession.user.email,
    role: membership?.role ?? "CLIENT",
    authMethod: dbSession.authMethod,
    deviceId: dbSession.deviceId ?? undefined,
    deviceName: dbSession.deviceName ?? undefined,
    ipAddress: dbSession.ipAddress ?? undefined,
    extraPermissions: membership?.permissions ?? [],
    createdAt: dbSession.createdAt.toISOString(),
    expiresAt: dbSession.expiresAt.toISOString(),
  };

  // Repopulate Redis
  await redis
    .set(sessionKey(sessionId), JSON.stringify(data), "EX", SESSION_TTL_SECONDS)
    .catch(() => null);

  return data;
}

export async function isSessionRevoked(sessionId: string): Promise<boolean> {
  const hit = await redis.exists(revokedKey(sessionId)).catch(() => 0);
  return hit > 0;
}

// ── Update ─────────────────────────────────────────────────────────────────

export async function touchSession(sessionId: string): Promise<void> {
  await Promise.all([
    prisma.session
      .update({
        where: { id: sessionId },
        data: { lastActiveAt: new Date() },
      })
      .catch(() => null),
    redis.expire(sessionKey(sessionId), SESSION_TTL_SECONDS).catch(() => null),
  ]);
}

export async function rotateRefreshToken(
  oldRefreshToken: string,
  newRefreshTokenHash: string
): Promise<SessionData | null> {
  const oldHash = hashToken(oldRefreshToken);

  const session = await prisma.session.findUnique({
    where: { refreshTokenHash: oldHash },
    include: {
      user: { include: { memberships: true } },
    },
  });

  if (!session || session.isRevoked || session.expiresAt < new Date()) {
    return null;
  }

  const membership = session.tenantId
    ? session.user.memberships.find((m) => m.tenantId === session.tenantId)
    : null;

  await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: newRefreshTokenHash,
      lastActiveAt: new Date(),
    },
  });

  const data: SessionData = {
    sessionId: session.id,
    userId: session.userId,
    tenantId: session.tenantId,
    email: session.user.email,
    role: membership?.role ?? "CLIENT",
    authMethod: session.authMethod,
    extraPermissions: membership?.permissions ?? [],
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  };

  await redis
    .set(sessionKey(session.id), JSON.stringify(data), "EX", SESSION_TTL_SECONDS)
    .catch(() => null);

  return data;
}

// ── Revoke ─────────────────────────────────────────────────────────────────

export async function revokeSession(sessionId: string, reason = "explicit_logout"): Promise<void> {
  await Promise.all([
    prisma.session.update({
      where: { id: sessionId },
      data: { isRevoked: true, revokedAt: new Date(), revokedReason: reason },
    }),
    redis.del(sessionKey(sessionId)),
    // Keep revocation marker for the remaining TTL so middleware catches it fast
    redis.set(revokedKey(sessionId), "1", "EX", SESSION_TTL_SECONDS),
  ]);
}

export async function revokeAllUserSessions(
  userId: string,
  exceptSessionId?: string
): Promise<number> {
  const sessionIds = await redis.smembers(userSessionsKey(userId));

  const toRevoke = exceptSessionId ? sessionIds.filter((id) => id !== exceptSessionId) : sessionIds;

  if (toRevoke.length === 0) return 0;

  await Promise.all([
    prisma.session.updateMany({
      where: {
        userId,
        id: { in: toRevoke },
        isRevoked: false,
      },
      data: { isRevoked: true, revokedAt: new Date(), revokedReason: "revoke_all" },
    }),
    ...toRevoke.map((id) =>
      Promise.all([redis.del(sessionKey(id)), redis.set(revokedKey(id), "1", "EX", 3600)])
    ),
    redis.del(userSessionsKey(userId)),
  ]);

  return toRevoke.length;
}

export async function listUserSessions(userId: string, tenantId?: string): Promise<SessionData[]> {
  const dbSessions = await prisma.session.findMany({
    where: {
      userId,
      isRevoked: false,
      expiresAt: { gt: new Date() },
      ...(tenantId ? { tenantId } : {}),
    },
    orderBy: { lastActiveAt: "desc" },
  });

  return dbSessions.map((s) => ({
    sessionId: s.id,
    userId: s.userId,
    tenantId: s.tenantId,
    email: "",
    role: "CLIENT" as UserRole,
    authMethod: s.authMethod,
    deviceId: s.deviceId ?? undefined,
    deviceName: s.deviceName ?? undefined,
    ipAddress: s.ipAddress ?? undefined,
    extraPermissions: [],
    createdAt: s.createdAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
  }));
}
