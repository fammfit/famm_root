import { describe, it, expect } from "vitest";
import {
  parseLocalDateTime,
  toLocalDateString,
  iterateLocalDates,
  localDayOfWeek,
  addMinutesDstSafe,
  tzOffsetMinutes,
  displayInTimezone,
  DAY_OF_WEEK_TO_JS,
  JS_TO_DAY_OF_WEEK,
} from "@/lib/scheduling/tz-helpers";

describe("parseLocalDateTime", () => {
  it("converts a local date+time to UTC correctly", () => {
    // New York is UTC-5 in winter
    const utc = parseLocalDateTime("2024-01-15", "09:00", "America/New_York");
    expect(utc.toISOString()).toBe("2024-01-15T14:00:00.000Z");
  });

  it("handles DST spring-forward (US Eastern 2024-03-10)", () => {
    // Clocks spring forward at 2:00 AM → 3:00 AM  (UTC-5 → UTC-4)
    // 10:00 AM local = 14:00 UTC (EDT = UTC-4)
    const utc = parseLocalDateTime("2024-03-10", "10:00", "America/New_York");
    expect(utc.toISOString()).toBe("2024-03-10T14:00:00.000Z");
  });

  it("handles DST fall-back (US Eastern 2024-11-03)", () => {
    // Clocks fall back at 2:00 AM → 1:00 AM (UTC-4 → UTC-5)
    // 10:00 AM local = 15:00 UTC (EST = UTC-5)
    const utc = parseLocalDateTime("2024-11-03", "10:00", "America/New_York");
    expect(utc.toISOString()).toBe("2024-11-03T15:00:00.000Z");
  });

  it("works with UTC timezone", () => {
    const utc = parseLocalDateTime("2024-06-01", "08:30", "UTC");
    expect(utc.toISOString()).toBe("2024-06-01T08:30:00.000Z");
  });

  it("works with positive offset timezones (Tokyo UTC+9)", () => {
    const utc = parseLocalDateTime("2024-07-04", "09:00", "Asia/Tokyo");
    expect(utc.toISOString()).toBe("2024-07-04T00:00:00.000Z");
  });
});

describe("toLocalDateString", () => {
  it("returns the local date string for a UTC instant", () => {
    // 2024-01-01 23:00 UTC = 2024-01-01 in UTC but 2024-01-02 in Tokyo
    const utc = new Date("2024-01-01T23:00:00.000Z");
    expect(toLocalDateString(utc, "UTC")).toBe("2024-01-01");
    expect(toLocalDateString(utc, "Asia/Tokyo")).toBe("2024-01-02");
  });
});

describe("iterateLocalDates", () => {
  it("yields every calendar day in range", () => {
    const from = new Date("2024-03-01T00:00:00Z");
    const to = new Date("2024-03-05T00:00:00Z");
    const dates = [...iterateLocalDates(from, to, "UTC")];
    expect(dates).toEqual(["2024-03-01", "2024-03-02", "2024-03-03", "2024-03-04", "2024-03-05"]);
  });

  it("correctly handles timezone offset when computing local start date", () => {
    // 2024-01-01T01:00:00Z = 2023-12-31 in New York (UTC-5)
    const from = new Date("2024-01-01T01:00:00Z");
    const to = new Date("2024-01-02T01:00:00Z");
    const nyDates = [...iterateLocalDates(from, to, "America/New_York")];
    // Local date at 2024-01-01T01:00Z in NY = 2023-12-31
    expect(nyDates[0]).toBe("2023-12-31");
  });

  it("does not duplicate days across DST spring-forward", () => {
    // March 10 2024: clocks spring forward (US/Eastern)
    const from = new Date("2024-03-09T06:00:00Z"); // 2024-03-09 01:00 ET
    const to = new Date("2024-03-11T06:00:00Z");
    const dates = [...iterateLocalDates(from, to, "America/New_York")];
    // Should have exactly 3 days with no duplicates or gaps
    expect(dates).toHaveLength(3);
    expect(new Set(dates).size).toBe(3);
  });
});

describe("localDayOfWeek", () => {
  it("returns 1 (Monday) for 2024-01-01 UTC", () => {
    // 2024-01-01 was a Monday
    const utc = new Date("2024-01-01T12:00:00Z");
    expect(localDayOfWeek(utc, "UTC")).toBe(1);
  });

  it("shifts day across timezone boundary", () => {
    // 2024-01-01T00:30:00Z = 2023-12-31 (Sunday) in UTC-5
    const utc = new Date("2024-01-01T00:30:00Z");
    expect(localDayOfWeek(utc, "UTC")).toBe(1); // Monday in UTC
    expect(localDayOfWeek(utc, "America/New_York")).toBe(0); // Still Sunday in NY
  });
});

describe("addMinutesDstSafe", () => {
  it("adds minutes correctly across DST boundary", () => {
    // Spring forward: 2024-03-10T01:00:00Z (New York changes at 7:00 UTC)
    const before = new Date("2024-03-10T06:00:00Z"); // 1:00 AM ET (UTC-5)
    const after = addMinutesDstSafe(before, 120);
    expect(after.getTime() - before.getTime()).toBe(120 * 60 * 1000);
    expect(after.toISOString()).toBe("2024-03-10T08:00:00.000Z");
  });
});

describe("tzOffsetMinutes", () => {
  it("returns correct offset for UTC", () => {
    expect(tzOffsetMinutes("UTC")).toBe(0);
  });

  it("returns negative offset for US/Eastern in winter", () => {
    const jan = new Date("2024-01-15T12:00:00Z");
    expect(tzOffsetMinutes("America/New_York", jan)).toBe(-300); // UTC-5
  });

  it("returns offset for US/Eastern in summer (EDT)", () => {
    const jul = new Date("2024-07-15T12:00:00Z");
    expect(tzOffsetMinutes("America/New_York", jul)).toBe(-240); // UTC-4
  });
});

describe("displayInTimezone", () => {
  it("formats a UTC date in the given timezone", () => {
    const utc = new Date("2024-01-15T14:00:00Z");
    const display = displayInTimezone(utc, "America/New_York", "HH:mm");
    expect(display).toBe("09:00");
  });
});

describe("DAY_OF_WEEK_TO_JS / JS_TO_DAY_OF_WEEK", () => {
  it("round-trips correctly for all days", () => {
    for (const [name, idx] of Object.entries(DAY_OF_WEEK_TO_JS)) {
      expect(JS_TO_DAY_OF_WEEK[idx]).toBe(name);
    }
  });

  it("SUNDAY maps to 0", () => {
    expect(DAY_OF_WEEK_TO_JS["SUNDAY"]).toBe(0);
  });

  it("SATURDAY maps to 6", () => {
    expect(DAY_OF_WEEK_TO_JS["SATURDAY"]).toBe(6);
  });
});
