/**
 * DST-safe timezone helpers using date-fns-tz.
 *
 * Key principle: all datetimes are stored and passed as UTC Date objects.
 * Timezone conversions happen only at the boundaries (input parsing / display formatting).
 */
import {
  fromZonedTime,
  toZonedTime,
  formatInTimeZone,
  getTimezoneOffset,
} from "date-fns-tz";
import {
  addMinutes,
  format,
  startOfDay,
  addDays,
  parseISO,
  isValid,
} from "date-fns";

/**
 * Parse a local date string "YYYY-MM-DD" and a wall-clock time "HH:MM"
 * in the given IANA timezone and return the equivalent UTC Date.
 *
 * DST-safe: if the local time doesn't exist (clock-forward gap), date-fns-tz
 * normalises it to the next valid instant.
 */
export function parseLocalDateTime(
  localDateStr: string, // "YYYY-MM-DD"
  localTimeStr: string, // "HH:MM"
  timezone: string
): Date {
  return fromZonedTime(`${localDateStr}T${localTimeStr}:00`, timezone);
}

/**
 * Given a UTC Date, return the "YYYY-MM-DD" local date string in timezone.
 */
export function toLocalDateString(utcDate: Date, timezone: string): string {
  return formatInTimeZone(utcDate, timezone, "yyyy-MM-dd");
}

/**
 * Given a UTC Date, return the local JavaScript Date object representing the
 * same wall-clock instant in the given timezone.
 * NOTE: the returned Date's getHours()/getMinutes() reflect the local time.
 */
export function toLocalDate(utcDate: Date, timezone: string): Date {
  return toZonedTime(utcDate, timezone);
}

/**
 * Iterate every local calendar date (as "YYYY-MM-DD" strings) between
 * fromUtc and toUtc (inclusive), in the given IANA timezone.
 *
 * Uses wall-clock calendar arithmetic so DST transitions never cause
 * a day to be skipped or doubled.
 */
export function* iterateLocalDates(
  fromUtc: Date,
  toUtc: Date,
  timezone: string
): Generator<string> {
  const startStr = toLocalDateString(fromUtc, timezone);
  const endStr = toLocalDateString(toUtc, timezone);

  // Iterate using plain date strings to avoid any timezone ambiguity
  let cursor = parseISO(startStr); // Local midnight in UTC terms (irrelevant — just string cursor)
  const end = parseISO(endStr);

  while (cursor <= end) {
    yield format(cursor, "yyyy-MM-dd");
    cursor = addDays(cursor, 1);
  }
}

/**
 * Return the 0-based day-of-week (0=Sun … 6=Sat) for a UTC date expressed
 * in the given timezone.  This is DST-safe because we first project the date
 * into local time before calling getDay().
 */
export function localDayOfWeek(utcDate: Date, timezone: string): number {
  return toZonedTime(utcDate, timezone).getDay();
}

/**
 * Add `minutes` to a UTC date in a DST-aware way.
 *
 * For example, adding 60 minutes across a DST spring-forward boundary
 * correctly yields a time 60 minutes later in UTC (1 hour in wall-clock time
 * might represent only 0 or 2 hours depending on the transition).
 *
 * Since Date objects are always UTC-internally, plain addMinutes is already
 * correct — this wrapper exists for documentation clarity and testing.
 */
export function addMinutesDstSafe(utcDate: Date, minutes: number): Date {
  return addMinutes(utcDate, minutes);
}

/**
 * Return true if the given UTC date falls within a "DST gap"
 * (a clock-forward transition where that wall-clock time doesn't exist).
 * Used to skip impossible slot start times.
 */
export function isInDstGap(utcDate: Date, timezone: string): boolean {
  // Round-trip: local → UTC → local.  If the result differs, we're in a gap.
  const local = toZonedTime(utcDate, timezone);
  const roundTripped = fromZonedTime(local, timezone);
  return Math.abs(roundTripped.getTime() - utcDate.getTime()) > 0;
}

/**
 * Return the UTC offset in minutes for a timezone at a specific instant.
 * Positive = east of UTC.
 */
export function tzOffsetMinutes(timezone: string, at: Date = new Date()): number {
  return getTimezoneOffset(timezone, at) / 60_000;
}

/**
 * Format a UTC date for display in the given timezone.
 */
export function displayInTimezone(
  utcDate: Date,
  timezone: string,
  fmt = "yyyy-MM-dd'T'HH:mm:ssxxx"
): string {
  return formatInTimeZone(utcDate, timezone, fmt);
}

/**
 * Parse an ISO 8601 string to a UTC Date, validating it is parseable.
 */
export function parseUtc(isoString: string): Date {
  const d = parseISO(isoString);
  if (!isValid(d)) throw new Error(`Invalid ISO date string: ${isoString}`);
  return d;
}

/** Map from Prisma DayOfWeek enum strings to JS getDay() values (0=Sun). */
export const DAY_OF_WEEK_TO_JS: Record<string, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

export const JS_TO_DAY_OF_WEEK: Record<number, string> = Object.fromEntries(
  Object.entries(DAY_OF_WEEK_TO_JS).map(([k, v]) => [v, k])
);
