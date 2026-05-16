/**
 * Booking holds — a 15-minute TTL reservation that gates the checkout flow.
 *
 * Redis keys:
 *   slot:hold:{slotId}:{userId}   → holdId (EX HOLD_TTL_SEC)
 *   slot:holds:{slotId}           → Sorted Set { holdId → expiresAtMs }
 *
 * The sorted set lets us atomically prune expired holds and count active ones
 * before deciding whether capacity is available, all inside a Lua script.
 */
import { redis } from "@/lib/redis";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";

export const HOLD_TTL_SEC = 15 * 60; // 15 minutes

export interface BookingHold {
  holdId: string;
  slotId: string;
  userId: string;
  expiresAt: Date;
}

// ── Lua: atomic acquire ───────────────────────────────────────────────────────
// KEYS[1] = slot:hold:{slotId}:{userId}
// KEYS[2] = slot:holds:{slotId}
// ARGV[1] = capacity (integer — remaining capacity after confirmed bookings)
// ARGV[2] = holdId
// ARGV[3] = nowMs
// ARGV[4] = expiresAtMs
// ARGV[5] = ttlSec
// Returns: holdId on success | false if at capacity | existing holdId if re-acquire
const ACQUIRE_SCRIPT = `
local userKey    = KEYS[1]
local holdsKey   = KEYS[2]
local capacity   = tonumber(ARGV[1])
local holdId     = ARGV[2]
local nowMs      = tonumber(ARGV[3])
local expiresMs  = tonumber(ARGV[4])
local ttlSec     = tonumber(ARGV[5])

-- Return existing hold for idempotency
local existing = redis.call("GET", userKey)
if existing then
  return existing
end

-- Prune expired entries then count remaining
redis.call("ZREMRANGEBYSCORE", holdsKey, "-inf", nowMs - 1)
local activeHolds = tonumber(redis.call("ZCARD", holdsKey))

if activeHolds >= capacity then
  return false
end

-- Acquire
redis.call("SET",  userKey,  holdId, "EX", ttlSec)
redis.call("ZADD", holdsKey, expiresMs, holdId)
redis.call("EXPIRE", holdsKey, ttlSec * 2)

return holdId
`;

// ── Lua: atomic release ───────────────────────────────────────────────────────
const RELEASE_SCRIPT = `
local userKey  = KEYS[1]
local holdsKey = KEYS[2]
local holdId   = ARGV[1]

local existing = redis.call("GET", userKey)
if existing == holdId then
  redis.call("DEL",  userKey)
  redis.call("ZREM", holdsKey, holdId)
  return 1
end
return 0
`;

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Acquire a hold for a user on a slot.
 *
 * @returns BookingHold on success, null if slot is at capacity or already fully held.
 */
export async function acquireHold(
  slotId: string,
  userId: string
): Promise<BookingHold | null> {
  const slot = await prisma.generatedSlot.findUnique({
    where: { id: slotId },
    select: { capacity: true, bookedCount: true, status: true },
  });

  if (!slot || slot.status === "CANCELLED" || slot.status === "BLACKOUT") {
    return null;
  }

  const availableCapacity = slot.capacity - slot.bookedCount;
  if (availableCapacity <= 0) return null;

  const holdId = randomUUID();
  const nowMs = Date.now();
  const expiresAt = new Date(nowMs + HOLD_TTL_SEC * 1000);

  const result = await redis.eval(
    ACQUIRE_SCRIPT,
    2,
    userHoldKey(slotId, userId),
    holdsSetKey(slotId),
    availableCapacity,
    holdId,
    nowMs,
    expiresAt.getTime(),
    HOLD_TTL_SEC
  );

  if (result === false || result === null) return null;

  const finalHoldId = result as string;

  // Keep hold count on the DB record in sync (best-effort)
  const activeHolds = await getActiveHoldCount(slotId);
  await prisma.generatedSlot
    .update({ where: { id: slotId }, data: { holdCount: activeHolds } })
    .catch(() => null);

  return { holdId: finalHoldId, slotId, userId, expiresAt };
}

/**
 * Release a hold.  Idempotent — safe to call even if the hold already expired.
 */
export async function releaseHold(slotId: string, userId: string): Promise<void> {
  const holdId = await redis.get(userHoldKey(slotId, userId));
  if (!holdId) return;

  await redis.eval(
    RELEASE_SCRIPT,
    2,
    userHoldKey(slotId, userId),
    holdsSetKey(slotId),
    holdId
  );

  const activeHolds = await getActiveHoldCount(slotId);
  await prisma.generatedSlot
    .update({ where: { id: slotId }, data: { holdCount: activeHolds } })
    .catch(() => null);
}

/**
 * Get the current holdId for a user on a slot, if one exists and hasn't expired.
 */
export async function getHold(
  slotId: string,
  userId: string
): Promise<string | null> {
  return redis.get(userHoldKey(slotId, userId));
}

/**
 * Return the count of currently active (non-expired) holds on a slot.
 */
export async function getActiveHoldCount(slotId: string): Promise<number> {
  const key = holdsSetKey(slotId);
  await redis.zremrangebyscore(key, "-inf", Date.now() - 1);
  return redis.zcard(key);
}

/**
 * Extend an existing hold TTL.
 * @returns true if extended, false if hold no longer exists.
 */
export async function extendHold(slotId: string, userId: string): Promise<boolean> {
  const key = userHoldKey(slotId, userId);
  const holdId = await redis.get(key);
  if (!holdId) return false;

  const newExpiry = Date.now() + HOLD_TTL_SEC * 1000;
  await Promise.all([
    redis.expire(key, HOLD_TTL_SEC),
    redis.zadd(holdsSetKey(slotId), newExpiry, holdId),
  ]);
  return true;
}

// ── Key helpers ───────────────────────────────────────────────────────────────

function userHoldKey(slotId: string, userId: string): string {
  return `slot:hold:${slotId}:${userId}`;
}

function holdsSetKey(slotId: string): string {
  return `slot:holds:${slotId}`;
}
