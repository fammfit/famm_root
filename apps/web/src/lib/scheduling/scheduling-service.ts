/**
 * SchedulingService — high-level orchestrator.
 *
 * All public methods are the single source of truth for scheduling mutations.
 * They coordinate: slot generation, conflict detection, Redis locking,
 * booking holds, waitlist management, and event publishing.
 */
import { prisma } from "@/lib/db";
import {
  generateSlotCandidates,
  materializeSlots,
  blackoutSlots,
  computeSlotStatus,
  type GenerateSlotsOptions,
} from "./slot-generator";
import { checkConflict, hasAvailableCapacity } from "./conflict-detector";
import { acquireHold, releaseHold, getHold, extendHold, HOLD_TTL_SEC } from "./booking-hold";
import {
  joinWaitlist,
  leaveWaitlist,
  getWaitlist,
  getWaitlistPosition,
  promoteFromWaitlist,
  pruneExpiredWaitlistEntries,
} from "./waitlist";
import { schedulingLock } from "./redis-lock";
import {
  publishSlotGenerated,
  publishSlotCancelled,
  publishSlotUpdated,
  publishHoldAcquired,
  publishWaitlistJoined,
  publishWaitlistPromoted,
} from "./slot-events";

// ── Types ────────────────────────────────────────────────────────────────────

export interface GenerateResult {
  created: number;
  updated: number;
  slotCount: number;
}

export interface HoldResult {
  success: boolean;
  holdId?: string;
  expiresAt?: Date;
  reason?: string;
}

export interface WaitlistResult {
  position: number;
  entryId: string;
}

// ── Slot generation ──────────────────────────────────────────────────────────

/**
 * Generate and materialise slots for a trainer / service within a date window.
 * Idempotent — safe to call repeatedly; existing slots are updated not duplicated.
 */
export async function generateSlots(opts: GenerateSlotsOptions): Promise<GenerateResult> {
  const candidates = await generateSlotCandidates(opts);
  const { created, updated } = await materializeSlots(candidates);

  void publishSlotGenerated(opts.tenantId, `batch-${Date.now()}`, {
    trainerId: opts.trainerId ?? null,
    serviceId: opts.serviceId,
    count: candidates.length,
  });

  return { created, updated, slotCount: candidates.length };
}

// ── Booking holds ────────────────────────────────────────────────────────────

/**
 * Acquire a 15-minute hold on a slot for a user.
 * Uses Redis locking to prevent simultaneous double-hold on the last capacity unit.
 */
export async function acquireSlotHold(
  slotId: string,
  userId: string,
  tenantId: string
): Promise<HoldResult> {
  return schedulingLock.withLock(`hold:${slotId}`, async () => {
    const hold = await acquireHold(slotId, userId);
    if (!hold) {
      return { success: false, reason: "SLOT_FULL_OR_UNAVAILABLE" };
    }

    void publishHoldAcquired(tenantId, slotId, {
      userId,
      holdId: hold.holdId,
      expiresAt: hold.expiresAt.toISOString(),
    });

    return { success: true, holdId: hold.holdId, expiresAt: hold.expiresAt };
  });
}

/**
 * Release an existing hold.
 * If waitlist entries exist, promote the next one.
 */
export async function releaseSlotHold(
  slotId: string,
  userId: string,
  tenantId: string
): Promise<void> {
  await releaseHold(slotId, userId);
  await syncSlotStatus(slotId);
  await maybePromoteWaitlist(slotId, tenantId);
}

/**
 * Extend a hold by another HOLD_TTL_SEC.
 */
export async function extendSlotHold(
  slotId: string,
  userId: string
): Promise<boolean> {
  return extendHold(slotId, userId);
}

/**
 * Get the current hold ID for a user, if still valid.
 */
export async function getSlotHold(
  slotId: string,
  userId: string
): Promise<string | null> {
  return getHold(slotId, userId);
}

// ── Booking confirmation ─────────────────────────────────────────────────────

/**
 * Confirm a booking from an active hold.
 *
 * Flow:
 *  1. Verify hold is still active
 *  2. Acquire distributed lock on the slot
 *  3. Re-check DB conflict (defence-in-depth vs. concurrent confirms)
 *  4. Increment bookedCount, recompute status
 *  5. Release hold, publish event
 */
export async function confirmBookingFromHold(
  slotId: string,
  userId: string,
  tenantId: string,
  bookingId: string
): Promise<{ success: boolean; reason?: string }> {
  const holdId = await getHold(slotId, userId);
  if (!holdId) {
    return { success: false, reason: "HOLD_EXPIRED" };
  }

  return schedulingLock.withLock(`confirm:${slotId}`, async () => {
    const slot = await prisma.generatedSlot.findUnique({
      where: { id: slotId },
      select: { capacity: true, bookedCount: true, status: true, trainerId: true, tenantId: true },
    });

    if (!slot) return { success: false, reason: "SLOT_NOT_FOUND" };
    if (slot.bookedCount >= slot.capacity) return { success: false, reason: "SLOT_FULL" };

    // Defence-in-depth: verify no DB conflict
    if (slot.trainerId) {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { startAt: true, endAt: true },
      });
      if (booking) {
        const conflict = await checkConflict({
          trainerId: slot.trainerId,
          tenantId: slot.tenantId,
          proposedStart: booking.startAt,
          proposedEnd: booking.endAt,
          excludeBookingId: bookingId,
        });
        if (conflict.conflictingBookingIds.length > 0) {
          return { success: false, reason: "BOOKING_CONFLICT" };
        }
      }
    }

    const newBookedCount = slot.bookedCount + 1;
    const newStatus = computeSlotStatus(slot.capacity, newBookedCount);

    await prisma.generatedSlot.update({
      where: { id: slotId },
      data: { bookedCount: newBookedCount, status: newStatus },
    });

    await releaseHold(slotId, userId);

    void publishSlotUpdated(tenantId, slotId, {
      status: newStatus,
      bookedCount: newBookedCount,
      capacity: slot.capacity,
    });

    return { success: true };
  });
}

/**
 * Decrement bookedCount when a booking is cancelled.
 * If waitlist entries exist, promote the next one.
 */
export async function onBookingCancelled(
  slotId: string,
  tenantId: string
): Promise<void> {
  const slot = await prisma.generatedSlot.findUnique({
    where: { id: slotId },
    select: { bookedCount: true, capacity: true, status: true },
  });
  if (!slot || slot.bookedCount <= 0) return;

  const newBookedCount = Math.max(0, slot.bookedCount - 1);
  const newStatus = computeSlotStatus(slot.capacity, newBookedCount);

  await prisma.generatedSlot.update({
    where: { id: slotId },
    data: { bookedCount: newBookedCount, status: newStatus },
  });

  void publishSlotUpdated(tenantId, slotId, {
    status: newStatus,
    bookedCount: newBookedCount,
    capacity: slot.capacity,
  });

  await maybePromoteWaitlist(slotId, tenantId);
}

// ── Slot cancellation ────────────────────────────────────────────────────────

/**
 * Cancel a slot and all its bookings.  Notifies waitlist.
 */
export async function cancelSlot(
  slotId: string,
  tenantId: string,
  reason?: string
): Promise<void> {
  const slot = await prisma.generatedSlot.findUnique({
    where: { id: slotId },
    select: { status: true },
  });
  if (!slot || slot.status === "CANCELLED") return;

  const affectedBookings = await prisma.booking.findMany({
    where: { tenantId, status: { in: ["PENDING", "CONFIRMED"] } },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.generatedSlot.update({
      where: { id: slotId },
      data: { status: "CANCELLED" },
    }),
    prisma.booking.updateMany({
      where: {
        id: { in: affectedBookings.map((b) => b.id) },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: reason ?? "Slot cancelled" },
    }),
  ]);

  void publishSlotCancelled(tenantId, slotId, {
    reason,
    affectedBookingIds: affectedBookings.map((b) => b.id),
  });
}

/**
 * Apply a new blocked period: blackout existing AVAILABLE slots in the range.
 */
export async function applyBlackout(
  tenantId: string,
  trainerId: string | null,
  from: Date,
  to: Date
): Promise<number> {
  return blackoutSlots(tenantId, trainerId, from, to);
}

// ── Waitlist ─────────────────────────────────────────────────────────────────

export async function joinSlotWaitlist(
  slotId: string,
  userId: string,
  tenantId: string
): Promise<WaitlistResult> {
  const entry = await joinWaitlist(slotId, userId, tenantId);
  void publishWaitlistJoined(tenantId, slotId, { userId, position: entry.position });
  return { position: entry.position, entryId: entry.entryId };
}

export async function leaveSlotWaitlist(slotId: string, userId: string): Promise<void> {
  await leaveWaitlist(slotId, userId);
}

export async function getSlotWaitlistPosition(
  slotId: string,
  userId: string
): Promise<number | null> {
  return getWaitlistPosition(slotId, userId);
}

export async function getSlotWaitlist(slotId: string) {
  return getWaitlist(slotId);
}

// ── Internal helpers ─────────────────────────────────────────────────────────

async function syncSlotStatus(slotId: string): Promise<void> {
  const slot = await prisma.generatedSlot.findUnique({
    where: { id: slotId },
    select: { capacity: true, bookedCount: true },
  });
  if (!slot) return;

  const newStatus = computeSlotStatus(slot.capacity, slot.bookedCount);
  await prisma.generatedSlot.update({
    where: { id: slotId },
    data: { status: newStatus },
  });
}

async function maybePromoteWaitlist(slotId: string, tenantId: string): Promise<void> {
  await pruneExpiredWaitlistEntries(slotId);
  const slot = await prisma.generatedSlot.findUnique({
    where: { id: slotId },
    select: { capacity: true, bookedCount: true },
  });
  if (!slot) return;

  const openSlots = slot.capacity - slot.bookedCount;
  if (openSlots <= 0) return;

  const promoted = await promoteFromWaitlist(slotId, openSlots);
  if (promoted.length === 0) return;

  void publishWaitlistPromoted(tenantId, slotId, {
    promotedUserIds: promoted.map((p) => p.userId),
    expiresAt: new Date(Date.now() + HOLD_TTL_SEC * 1000).toISOString(),
  });
}
