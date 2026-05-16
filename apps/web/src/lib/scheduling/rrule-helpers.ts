/**
 * RRULE expansion utilities for recurring blocked periods.
 *
 * Strategy: rrule operates in UTC.  We supply dtstart as the raw UTC value of
 * the first occurrence, expand between UTC boundaries, and then apply the
 * original duration offset.  DST is handled externally by the slot-generator
 * when it maps UTC occurrences back to local wall-clock times for display.
 */
import { RRule } from "rrule";
import type { BlockedPeriod } from "@famm/db";

export interface ExpandedInterval {
  startsAt: Date;
  endsAt: Date;
  reason?: string | null;
}

/**
 * Expand a BlockedPeriod (potentially recurring) into concrete UTC intervals
 * that overlap the [from, to) window.
 */
export function expandBlockedPeriod(
  bp: Pick<
    BlockedPeriod,
    "startAt" | "endAt" | "isRecurring" | "recurrenceRule" | "reason"
  >,
  from: Date,
  to: Date
): ExpandedInterval[] {
  if (!bp.isRecurring || !bp.recurrenceRule) {
    if (bp.startAt < to && bp.endAt > from) {
      return [{ startsAt: bp.startAt, endsAt: bp.endAt, reason: bp.reason }];
    }
    return [];
  }

  const durationMs = bp.endAt.getTime() - bp.startAt.getTime();

  try {
    const rruleStr = bp.recurrenceRule.replace(/^RRULE:/i, "");
    const options = RRule.parseString(rruleStr);

    const rule = new RRule({
      ...options,
      dtstart: bp.startAt,
    });

    // Expand a bit earlier to catch occurrences whose end falls inside [from, to)
    const expandFrom = new Date(from.getTime() - durationMs);
    const occurrences = rule.between(expandFrom, to, true);

    return occurrences
      .map((occ) => ({
        startsAt: occ,
        endsAt: new Date(occ.getTime() + durationMs),
        reason: bp.reason,
      }))
      .filter((i) => i.startsAt < to && i.endsAt > from);
  } catch {
    // Malformed RRULE — fall back to treating as single occurrence
    if (bp.startAt < to && bp.endAt > from) {
      return [{ startsAt: bp.startAt, endsAt: bp.endAt, reason: bp.reason }];
    }
    return [];
  }
}

/**
 * Expand all blocked periods from the list into concrete UTC intervals.
 */
export function expandAllBlockedPeriods(
  blockedPeriods: Array<
    Pick<BlockedPeriod, "startAt" | "endAt" | "isRecurring" | "recurrenceRule" | "reason">
  >,
  from: Date,
  to: Date
): ExpandedInterval[] {
  return blockedPeriods.flatMap((bp) => expandBlockedPeriod(bp, from, to));
}

/**
 * Check if a given UTC interval overlaps any of the expanded blocked intervals.
 */
export function overlapsAny(
  startsAt: Date,
  endsAt: Date,
  blocked: ExpandedInterval[]
): boolean {
  return blocked.some((b) => startsAt < b.endsAt && endsAt > b.startsAt);
}

/**
 * Build a valid RRULE string from common scheduling patterns.
 * Returns an RRULE string suitable for BlockedPeriod.recurrenceRule.
 */
export function buildWeeklyRrule(
  days: ("MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU")[],
  until?: Date
): string {
  const parts = [`FREQ=WEEKLY`, `BYDAY=${days.join(",")}`];
  if (until) {
    parts.push(`UNTIL=${until.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`);
  }
  return `RRULE:${parts.join(";")}`;
}
