export function toUTC(dateString: string, timezone: string): Date {
  // Returns a UTC Date from a local time string + timezone
  const { zonedTimeToUtc } = await import("date-fns-tz");
  return zonedTimeToUtc(dateString, timezone);
}

export function formatToTimezone(date: Date, timezone: string): string {
  const { formatInTimeZone } = await import("date-fns-tz");
  return formatInTimeZone(date, timezone, "yyyy-MM-dd'T'HH:mm:ssxxx");
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function diffMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
}
