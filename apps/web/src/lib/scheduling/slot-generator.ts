/**
 * Core slot generation algorithm.
 *
 * For each AvailabilityRule, iterate calendar days (in the rule's local
 * timezone), check day-of-week match, parse the availability window using
 * DST-safe helpers, then carve it into service-duration slots with buffers.
 *
 * Slots are filtered against:
 *  1. Booking lead-time / window constraints
 *  2. BlockedPeriods (including RRULE recurring expansions)
 *  3. Existing PENDING/CONFIRMED bookings (double-booking prevention)
 *  4. ValidFrom / ValidUntil date range on the rule itself
 */
import { prisma } from "@/lib/db";
import type { AvailabilityRule, BlockedPeriod, Service, TenantSettings } from "@famm/db";
import { iterateLocalDates, parseLocalDateTime, DAY_OF_WEEK_TO_JS, addMinutesDstSafe } from "./tz-helpers";
import { expandAllBlockedPeriods, overlapsAny } from "./rrule-helpers";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SlotCandidate {
  trainerId: string | null;
  tenantId: string;
  serviceId: string;
  locationId: string | null;
  startsAt: Date; // UTC
  endsAt: Date;   // UTC
  timezone: string;
  capacity: number;
  sourceRuleId: string;
}

export interface GenerateSlotsOptions {
  tenantId: string;
  serviceId: string;
  trainerId?: string;
  locationId?: string;
  /** UTC start of the generation window */
  from: Date;
  /** UTC end of the generation window (exclusive) */
  to: Date;
  /** Override for "now" — useful in tests */
  now?: Date;
}

// ── Main generation function ─────────────────────────────────────────────────

export async function generateSlotCandidates(
  opts: GenerateSlotsOptions
): Promise<SlotCandidate[]> {
  const now = opts.now ?? new Date();

  const [service, settings, rules, blockedPeriods, existingBookings] = await Promise.all([
    prisma.service.findFirst({
      where: { id: opts.serviceId, tenantId: opts.tenantId, isActive: true },
    }),
    prisma.tenantSettings.findUnique({ where: { tenantId: opts.tenantId } }),
    prisma.availabilityRule.findMany({
      where: {
        tenantId: opts.tenantId,
        isActive: true,
        ...(opts.trainerId ? { trainerId: opts.trainerId } : {}),
        ...(opts.locationId ? { locationId: opts.locationId } : {}),
        ...(opts.serviceId
          ? { OR: [{ serviceId: opts.serviceId }, { serviceId: null }] }
          : {}),
      },
    }),
    prisma.blockedPeriod.findMany({
      where: {
        tenantId: opts.tenantId,
        OR: [
          { startAt: { lt: opts.to }, endAt: { gt: opts.from } },
          { isRecurring: true },
        ],
        ...(opts.trainerId
          ? { OR: [{ trainerId: opts.trainerId }, { trainerId: null }] }
          : {}),
      },
    }),
    prisma.booking.findMany({
      where: {
        tenantId: opts.tenantId,
        serviceId: opts.serviceId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { lt: opts.to },
        endAt: { gt: opts.from },
        ...(opts.trainerId ? { trainerId: opts.trainerId } : {}),
      },
      select: { startAt: true, endAt: true },
    }),
  ]);

  if (!service) return [];

  const leadTimeMs = (settings?.bookingLeadTimeMinutes ?? 60) * 60_000;
  const windowMs = (settings?.bookingWindowDays ?? 60) * 24 * 60 * 60_000;
  const earliest = new Date(now.getTime() + leadTimeMs);
  const latest = new Date(now.getTime() + windowMs);
  const effectiveTo = opts.to < latest ? opts.to : latest;

  const expandedBlocks = expandAllBlockedPeriods(blockedPeriods, opts.from, effectiveTo);

  const slotDurationMs = service.durationMinutes * 60_000;
  const bufferMs = (service.bufferBeforeMinutes + service.bufferAfterMinutes) * 60_000;
  const stepMs = slotDurationMs + bufferMs;

  const candidates: SlotCandidate[] = [];
  const seen = new Set<string>(); // dedup key: trainerId|serviceId|startsAt

  for (const rule of rules) {
    const ruleStart = rule.validFrom ?? opts.from;
    const ruleEnd = rule.validUntil ?? effectiveTo;
    const windowFrom = ruleStart > opts.from ? ruleStart : opts.from;
    const windowTo = ruleEnd < effectiveTo ? ruleEnd : effectiveTo;

    if (windowFrom >= windowTo) continue;

    const targetJsDay = DAY_OF_WEEK_TO_JS[rule.dayOfWeek];
    if (targetJsDay === undefined) continue;

    for (const localDateStr of iterateLocalDates(windowFrom, windowTo, rule.timezone)) {
      // Check local day-of-week matches
      // Determine local day-of-week from the date string directly.
      // Using noon UTC avoids any system-TZ interference; day strings are YYYY-MM-DD.
      const jsDay = new Date(`${localDateStr}T12:00:00Z`).getUTCDay();
      if (jsDay !== targetJsDay) continue;

      const windowStartUtc = parseLocalDateTime(localDateStr, rule.startTime, rule.timezone);
      const windowEndUtc = parseLocalDateTime(localDateStr, rule.endTime, rule.timezone);

      if (windowEndUtc <= windowStartUtc) continue;

      // Carve window into slots
      let cursor = new Date(windowStartUtc);

      while (cursor.getTime() + slotDurationMs <= windowEndUtc.getTime()) {
        const slotEnd = addMinutesDstSafe(cursor, service.durationMinutes);

        // Apply lead-time and window constraints
        if (cursor < earliest || cursor >= effectiveTo) {
          cursor = new Date(cursor.getTime() + stepMs);
          continue;
        }

        // Check blocked periods (including recurring)
        if (overlapsAny(cursor, slotEnd, expandedBlocks)) {
          cursor = new Date(cursor.getTime() + stepMs);
          continue;
        }

        // Check existing bookings
        const hasBookingConflict = existingBookings.some(
          (b) => cursor < b.endAt && slotEnd > b.startAt
        );
        if (hasBookingConflict) {
          cursor = new Date(cursor.getTime() + stepMs);
          continue;
        }

        const dedupKey = `${rule.trainerId ?? "any"}|${opts.serviceId}|${cursor.getTime()}`;
        if (!seen.has(dedupKey)) {
          seen.add(dedupKey);
          candidates.push({
            trainerId: rule.trainerId ?? opts.trainerId ?? null,
            tenantId: opts.tenantId,
            serviceId: opts.serviceId,
            locationId: rule.locationId ?? opts.locationId ?? null,
            startsAt: new Date(cursor),
            endsAt: slotEnd,
            timezone: rule.timezone,
            capacity: service.maxParticipants,
            sourceRuleId: rule.id,
          });
        }

        cursor = new Date(cursor.getTime() + stepMs);
      }
    }
  }

  return candidates.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/**
 * Upsert slot candidates into the GeneratedSlot table.
 * Existing slots are updated (not overwritten) to preserve bookedCount/holdCount.
 */
export async function materializeSlots(
  candidates: SlotCandidate[]
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  // Process in batches to avoid overwhelming the DB
  const BATCH = 50;
  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH);

    await Promise.all(
      batch.map(async (c) => {
        const existing = await prisma.generatedSlot.findFirst({
          where: {
            trainerId: c.trainerId,
            serviceId: c.serviceId,
            startsAt: c.startsAt,
          },
        });

        if (existing) {
          await prisma.generatedSlot.update({
            where: { id: existing.id },
            data: {
              endsAt: c.endsAt,
              timezone: c.timezone,
              capacity: c.capacity,
              sourceRuleId: c.sourceRuleId,
            },
          });
          updated++;
        } else {
          await prisma.generatedSlot.create({
            data: {
              tenantId: c.tenantId,
              trainerId: c.trainerId,
              serviceId: c.serviceId,
              locationId: c.locationId,
              startsAt: c.startsAt,
              endsAt: c.endsAt,
              timezone: c.timezone,
              capacity: c.capacity,
              sourceRuleId: c.sourceRuleId,
              status: "AVAILABLE",
            },
          });
          created++;
        }
      })
    );
  }

  return { created, updated };
}

/**
 * Mark all AVAILABLE GeneratedSlots for a trainer in a date range as BLACKOUT.
 * Used when a BlockedPeriod is added retroactively.
 */
export async function blackoutSlots(
  tenantId: string,
  trainerId: string | null,
  from: Date,
  to: Date
): Promise<number> {
  const result = await prisma.generatedSlot.updateMany({
    where: {
      tenantId,
      ...(trainerId ? { trainerId } : {}),
      startsAt: { gte: from, lt: to },
      status: "AVAILABLE",
      bookedCount: 0,
    },
    data: { status: "BLACKOUT" },
  });
  return result.count;
}

/**
 * Recompute slot status from the current bookedCount and capacity.
 */
export function computeSlotStatus(
  capacity: number,
  bookedCount: number
): "AVAILABLE" | "PARTIALLY_BOOKED" | "FULLY_BOOKED" {
  if (bookedCount >= capacity) return "FULLY_BOOKED";
  if (bookedCount > 0) return "PARTIALLY_BOOKED";
  return "AVAILABLE";
}
