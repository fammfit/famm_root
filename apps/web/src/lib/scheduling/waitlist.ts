/**
 * Waitlist management for fully-booked slots.
 *
 * Positions are 1-based and assigned sequentially.  When a cancellation
 * creates capacity, `promoteFromWaitlist` marks the next N entries as notified
 * and returns them — the caller (or a background job) sends the outreach.
 *
 * A notified entry has HOLD_TTL_SEC to confirm before the next person is
 * promoted; this is enforced by checking expiresAt on the WaitlistEntry.
 */
import { prisma } from "@/lib/db";
import { HOLD_TTL_SEC } from "./booking-hold";

export interface WaitlistPosition {
  entryId: string;
  slotId: string;
  userId: string;
  position: number;
  notifiedAt: Date | null;
  expiresAt: Date | null;
}

/**
 * Add a user to the waitlist for a slot.
 * Idempotent — returns existing entry if user is already on the list.
 */
export async function joinWaitlist(
  slotId: string,
  userId: string,
  tenantId: string
): Promise<WaitlistPosition> {
  // Check for existing entry first
  const existing = await prisma.waitlistEntry.findUnique({
    where: { slotId_userId: { slotId, userId } },
  });

  if (existing) {
    return toPosition(existing);
  }

  // Assign next available position
  const lastEntry = await prisma.waitlistEntry.findFirst({
    where: { slotId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const position = (lastEntry?.position ?? 0) + 1;

  const entry = await prisma.waitlistEntry.create({
    data: { slotId, userId, tenantId, position },
  });

  return toPosition(entry);
}

/**
 * Remove a user from the waitlist.  Re-sequences remaining entries.
 */
export async function leaveWaitlist(slotId: string, userId: string): Promise<void> {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { slotId_userId: { slotId, userId } },
  });
  if (!entry) return;

  await prisma.$transaction([
    prisma.waitlistEntry.delete({ where: { id: entry.id } }),
    // Decrement positions for all entries after the removed one
    prisma.$executeRaw`
      UPDATE "WaitlistEntry"
      SET position = position - 1
      WHERE "slotId" = ${slotId} AND position > ${entry.position}
    `,
  ]);
}

/**
 * Get a user's current position on the waitlist (1-based), or null.
 */
export async function getWaitlistPosition(
  slotId: string,
  userId: string
): Promise<number | null> {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { slotId_userId: { slotId, userId } },
    select: { position: true },
  });
  return entry?.position ?? null;
}

/**
 * Return all active (non-expired) waitlist entries for a slot, ordered by position.
 */
export async function getWaitlist(slotId: string): Promise<WaitlistPosition[]> {
  const now = new Date();
  const entries = await prisma.waitlistEntry.findMany({
    where: {
      slotId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { position: "asc" },
  });
  return entries.map(toPosition);
}

/**
 * Promote the next `n` waitlist entries by:
 *  1. Setting notifiedAt = now
 *  2. Setting expiresAt = now + HOLD_TTL_SEC (time to confirm before next is promoted)
 *
 * Returns the promoted entries so the caller can send notifications.
 */
export async function promoteFromWaitlist(
  slotId: string,
  n = 1
): Promise<WaitlistPosition[]> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + HOLD_TTL_SEC * 1000);

  // Find unnotified entries (or expired notified entries — second chance)
  const candidates = await prisma.waitlistEntry.findMany({
    where: {
      slotId,
      OR: [
        { notifiedAt: null },
        { expiresAt: { lt: now } },
      ],
    },
    orderBy: { position: "asc" },
    take: n,
  });

  if (candidates.length === 0) return [];

  const ids = candidates.map((e) => e.id);
  await prisma.waitlistEntry.updateMany({
    where: { id: { in: ids } },
    data: { notifiedAt: now, expiresAt },
  });

  const updated = await prisma.waitlistEntry.findMany({
    where: { id: { in: ids } },
    orderBy: { position: "asc" },
  });

  return updated.map(toPosition);
}

/**
 * Purge expired waitlist entries (called periodically or after promotion).
 */
export async function pruneExpiredWaitlistEntries(slotId: string): Promise<number> {
  const result = await prisma.waitlistEntry.deleteMany({
    where: { slotId, expiresAt: { lt: new Date() }, notifiedAt: { not: null } },
  });
  return result.count;
}

// ── Internal ─────────────────────────────────────────────────────────────────

function toPosition(entry: {
  id: string;
  slotId: string;
  userId: string;
  position: number;
  notifiedAt: Date | null;
  expiresAt: Date | null;
}): WaitlistPosition {
  return {
    entryId: entry.id,
    slotId: entry.slotId,
    userId: entry.userId,
    position: entry.position,
    notifiedAt: entry.notifiedAt,
    expiresAt: entry.expiresAt,
  };
}
