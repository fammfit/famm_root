/**
 * Conflict detection for double-booking prevention.
 *
 * Two-layer approach:
 *  1. DB layer  — query PENDING/CONFIRMED bookings overlapping the proposed interval
 *  2. Redis layer — check live booking holds (TTL-based, sub-second granularity)
 *
 * The DB check is the authoritative source; Redis is the fast-path guard during
 * the booking flow before the DB write is committed.
 */
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";

export interface ConflictCheckParams {
  trainerId: string;
  tenantId: string;
  proposedStart: Date;
  proposedEnd: Date;
  /** Booking to exclude from the check (e.g. when rescheduling) */
  excludeBookingId?: string;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflictingBookingIds: string[];
  activeHoldCount: number;
}

/**
 * Full conflict check combining DB bookings and Redis holds.
 */
export async function checkConflict(params: ConflictCheckParams): Promise<ConflictResult> {
  const [dbConflicts, holdCount] = await Promise.all([
    getConflictingBookings(params),
    getActiveHoldCountForRange(params.trainerId, params.proposedStart, params.proposedEnd),
  ]);

  return {
    hasConflict: dbConflicts.length > 0 || holdCount > 0,
    conflictingBookingIds: dbConflicts.map((b) => b.id),
    activeHoldCount: holdCount,
  };
}

/**
 * Query confirmed/pending bookings that overlap the proposed interval.
 */
export async function getConflictingBookings(
  params: ConflictCheckParams
): Promise<Array<{ id: string; startAt: Date; endAt: Date }>> {
  return prisma.booking.findMany({
    where: {
      tenantId: params.tenantId,
      trainerId: params.trainerId,
      status: { in: ["PENDING", "CONFIRMED"] },
      startAt: { lt: params.proposedEnd },
      endAt: { gt: params.proposedStart },
      ...(params.excludeBookingId ? { id: { not: params.excludeBookingId } } : {}),
    },
    select: { id: true, startAt: true, endAt: true },
  });
}

/**
 * Count active (non-expired) Redis holds for a trainer in the given time window.
 */
export async function getActiveHoldCountForRange(
  trainerId: string,
  proposedStart: Date,
  proposedEnd: Date
): Promise<number> {
  const pattern = `slot:hold:${trainerId}:*`;
  const keys = await redis.keys(pattern);
  if (keys.length === 0) return 0;

  const values = await redis.mget(...keys);
  const now = Date.now();
  let count = 0;

  for (const val of values) {
    if (!val) continue;
    try {
      const hold = JSON.parse(val) as {
        startsAt: string;
        endsAt: string;
        expiresAt: number;
      };
      if (hold.expiresAt < now) continue;
      const holdStart = new Date(hold.startsAt);
      const holdEnd = new Date(hold.endsAt);
      if (holdStart < proposedEnd && holdEnd > proposedStart) count++;
    } catch {
      // Ignore malformed hold data
    }
  }

  return count;
}

/**
 * Check trainer concurrency: how many bookings does this trainer currently
 * have within a given window (for maxConcurrentBookings enforcement)?
 */
export async function getConcurrentBookingCount(
  tenantId: string,
  trainerId: string,
  at: Date,
  windowMinutes = 0
): Promise<number> {
  const windowEnd = new Date(at.getTime() + windowMinutes * 60_000);
  return prisma.booking.count({
    where: {
      tenantId,
      trainerId,
      status: { in: ["PENDING", "CONFIRMED"] },
      startAt: { lt: windowEnd },
      endAt: { gt: at },
    },
  });
}

/**
 * Verify a slot has available capacity (DB bookedCount + live hold count < capacity).
 */
export async function hasAvailableCapacity(slotId: string, additionalHolds = 0): Promise<boolean> {
  const slot = await prisma.generatedSlot.findUnique({
    where: { id: slotId },
    select: { capacity: true, bookedCount: true },
  });
  if (!slot) return false;

  const holdSetKey = `slot:holds:${slotId}`;
  const now = Date.now();
  await redis.zremrangebyscore(holdSetKey, "-inf", now - 1);
  const activeHolds = await redis.zcard(holdSetKey);

  return slot.bookedCount + activeHolds + additionalHolds < slot.capacity;
}
