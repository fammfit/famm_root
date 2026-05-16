import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { generateSecureToken, hashToken } from "./tokens";
import { MAGIC_LINK_TTL_MINUTES } from "@famm/auth";

const RATE_LIMIT_KEY = (email: string, tenantId: string) => `magic-link:rl:${tenantId}:${email}`;
const MAX_PER_WINDOW = 3;
const WINDOW_SECONDS = 10 * 60;

export interface MagicLinkRequest {
  email: string;
  tenantId: string;
  requestIp?: string;
}

export interface MagicLinkResult {
  token: string; // Raw token — to be embedded in email link
  expiresAt: Date;
}

export async function createMagicLink({
  email,
  tenantId,
  requestIp,
}: MagicLinkRequest): Promise<MagicLinkResult> {
  // Rate limiting: max 3 requests per 10 minutes per email+tenant
  const rlKey = RATE_LIMIT_KEY(email.toLowerCase(), tenantId);
  const count = await redis.incr(rlKey);
  if (count === 1) await redis.expire(rlKey, WINDOW_SECONDS);
  if (count > MAX_PER_WINDOW) {
    throw new Error("RATE_LIMITED");
  }

  // Invalidate any existing unexpired tokens for this email+tenant
  await prisma.magicLinkToken.updateMany({
    where: { email: email.toLowerCase(), tenantId, usedAt: null },
    data: { usedAt: new Date() }, // mark as "used" = invalidated
  });

  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60 * 1000);

  await prisma.magicLinkToken.create({
    data: {
      email: email.toLowerCase(),
      tenantId,
      tokenHash,
      expiresAt,
      requestIp,
    },
  });

  return { token: rawToken, expiresAt };
}

export interface VerifyMagicLinkParams {
  token: string;
  email: string;
  tenantId: string;
}

export async function verifyMagicLink({
  token,
  email,
  tenantId,
}: VerifyMagicLinkParams): Promise<true> {
  const tokenHash = hashToken(token);

  const record = await prisma.magicLinkToken.findUnique({
    where: { tokenHash },
  });

  if (!record || record.email !== email.toLowerCase() || record.tenantId !== tenantId) {
    throw new Error("INVALID_TOKEN");
  }

  if (record.usedAt) {
    throw new Error("TOKEN_ALREADY_USED");
  }

  if (record.expiresAt < new Date()) {
    throw new Error("TOKEN_EXPIRED");
  }

  // Mark as used atomically
  const updated = await prisma.magicLinkToken.updateMany({
    where: { tokenHash, usedAt: null },
    data: { usedAt: new Date() },
  });

  if (updated.count === 0) {
    // Concurrent use attempt — already consumed
    throw new Error("TOKEN_ALREADY_USED");
  }

  return true;
}

export function buildMagicLinkUrl(
  baseUrl: string,
  token: string,
  email: string,
  tenantSlug: string
): string {
  // Point at the SPA landing page rather than the API directly. The page
  // calls the verify endpoint, handles success + error UX, and falls back
  // to ErrorState on expired / used / invalid tokens.
  const url = new URL("/auth/magic-link", baseUrl);
  url.searchParams.set("token", token);
  url.searchParams.set("email", email);
  url.searchParams.set("tenant", tenantSlug);
  return url.toString();
}
