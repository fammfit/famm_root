import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB before any module that transitively imports it
vi.mock("@/lib/db", () => ({ prisma: {} }));

import { computeSlotStatus } from "@/lib/scheduling/slot-generator";
import {
  iterateLocalDates,
  parseLocalDateTime,
  DAY_OF_WEEK_TO_JS,
} from "@/lib/scheduling/tz-helpers";
import { overlapsAny } from "@/lib/scheduling/rrule-helpers";

// Unit tests for the pure functions used by the slot generator.
// The full generateSlotCandidates function is covered in the integration test.

describe("computeSlotStatus", () => {
  it("returns AVAILABLE when bookedCount=0", () => {
    expect(computeSlotStatus(5, 0)).toBe("AVAILABLE");
  });

  it("returns PARTIALLY_BOOKED when some capacity used", () => {
    expect(computeSlotStatus(5, 3)).toBe("PARTIALLY_BOOKED");
  });

  it("returns FULLY_BOOKED when at capacity", () => {
    expect(computeSlotStatus(5, 5)).toBe("FULLY_BOOKED");
  });

  it("returns FULLY_BOOKED when over-capacity (safety)", () => {
    expect(computeSlotStatus(5, 6)).toBe("FULLY_BOOKED");
  });

  it("returns AVAILABLE for capacity=1 bookedCount=0 (individual session)", () => {
    expect(computeSlotStatus(1, 0)).toBe("AVAILABLE");
  });

  it("returns FULLY_BOOKED for capacity=1 bookedCount=1 (individual session)", () => {
    expect(computeSlotStatus(1, 1)).toBe("FULLY_BOOKED");
  });
});

describe("Slot carving logic (pure simulation)", () => {
  // Simulate the inner loop of generateSlotCandidates without DB calls
  function carveSlots(
    windowStartUtc: Date,
    windowEndUtc: Date,
    durationMinutes: number,
    bufferMinutes: number,
    blockedIntervals: Array<{ startsAt: Date; endsAt: Date }>,
    earliest: Date
  ): Array<{ startsAt: Date; endsAt: Date }> {
    const stepMs = (durationMinutes + bufferMinutes) * 60_000;
    const slotDurationMs = durationMinutes * 60_000;
    const slots: Array<{ startsAt: Date; endsAt: Date }> = [];
    let cursor = new Date(windowStartUtc);

    while (cursor.getTime() + slotDurationMs <= windowEndUtc.getTime()) {
      const slotEnd = new Date(cursor.getTime() + slotDurationMs);
      if (
        cursor >= earliest &&
        !overlapsAny(cursor, slotEnd, blockedIntervals)
      ) {
        slots.push({ startsAt: new Date(cursor), endsAt: slotEnd });
      }
      cursor = new Date(cursor.getTime() + stepMs);
    }
    return slots;
  }

  it("carves a 3-hour window into 60-min slots (no buffer)", () => {
    const start = new Date("2024-06-01T09:00:00Z");
    const end = new Date("2024-06-01T12:00:00Z");
    const slots = carveSlots(start, end, 60, 0, [], new Date(0));
    expect(slots).toHaveLength(3);
    expect(slots[0]!.startsAt.toISOString()).toBe("2024-06-01T09:00:00.000Z");
    expect(slots[2]!.startsAt.toISOString()).toBe("2024-06-01T11:00:00.000Z");
  });

  it("respects 15-minute buffer between slots", () => {
    const start = new Date("2024-06-01T09:00:00Z");
    const end = new Date("2024-06-01T12:00:00Z");
    const slots = carveSlots(start, end, 60, 15, [], new Date(0));
    // 09:00-10:00, then 10:15-11:15 — 3rd would start at 11:30 but end 12:30 > 12:00
    expect(slots).toHaveLength(2);
    expect(slots[1]!.startsAt.toISOString()).toBe("2024-06-01T10:15:00.000Z");
  });

  it("excludes slots blocked by a blocked period", () => {
    const start = new Date("2024-06-01T09:00:00Z");
    const end = new Date("2024-06-01T12:00:00Z");
    const blocked = [
      {
        startsAt: new Date("2024-06-01T10:00:00Z"),
        endsAt: new Date("2024-06-01T10:30:00Z"),
      },
    ];
    const slots = carveSlots(start, end, 60, 0, blocked, new Date(0));
    // 09:00 is fine; 10:00 conflicts; 11:00 is fine
    expect(slots).toHaveLength(2);
    expect(slots.map((s) => s.startsAt.toISOString())).toContain("2024-06-01T09:00:00.000Z");
    expect(slots.map((s) => s.startsAt.toISOString())).toContain("2024-06-01T11:00:00.000Z");
  });

  it("excludes slots before the lead-time horizon", () => {
    const start = new Date("2024-06-01T09:00:00Z");
    const end = new Date("2024-06-01T12:00:00Z");
    // earliest = 10:30 AM — first two slots skipped
    const earliest = new Date("2024-06-01T10:30:00Z");
    const slots = carveSlots(start, end, 60, 0, [], earliest);
    expect(slots).toHaveLength(1);
    expect(slots[0]!.startsAt.toISOString()).toBe("2024-06-01T11:00:00.000Z");
  });
});

describe("DST-safe day-of-week detection", () => {
  // The day-of-week is detected by parsing the local date string as noon UTC,
  // which is timezone-agnostic.
  it("detects Monday correctly", () => {
    // 2024-01-01 is a Monday
    const jsDay = new Date("2024-01-01T12:00:00").getDay();
    expect(jsDay).toBe(DAY_OF_WEEK_TO_JS["MONDAY"]);
  });

  it("detects Sunday correctly", () => {
    // 2024-01-07 is a Sunday
    const jsDay = new Date("2024-01-07T12:00:00").getDay();
    expect(jsDay).toBe(DAY_OF_WEEK_TO_JS["SUNDAY"]);
  });
});

describe("Local date iteration with timezone offsets", () => {
  it("yields calendar days in UTC", () => {
    const from = new Date("2024-06-01T00:00:00Z");
    const to = new Date("2024-06-03T00:00:00Z");
    const dates = [...iterateLocalDates(from, to, "UTC")];
    expect(dates).toEqual(["2024-06-01", "2024-06-02", "2024-06-03"]);
  });

  it("correctly parses availability window in UTC-5", () => {
    const utc = parseLocalDateTime("2024-06-01", "09:00", "America/New_York");
    // 9 AM EDT (UTC-4 in summer) = 13:00 UTC
    expect(utc.getUTCHours()).toBe(13);
  });
});
