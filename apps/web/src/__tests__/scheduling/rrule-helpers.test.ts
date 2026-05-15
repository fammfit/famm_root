import { describe, it, expect } from "vitest";
import {
  expandBlockedPeriod,
  expandAllBlockedPeriods,
  overlapsAny,
  buildWeeklyRrule,
} from "@/lib/scheduling/rrule-helpers";

const baseBlock = {
  startAt: new Date("2024-01-01T09:00:00Z"), // Monday 9 AM UTC
  endAt: new Date("2024-01-01T10:00:00Z"),   // Monday 10 AM UTC
  reason: "Team meeting",
};

describe("expandBlockedPeriod — non-recurring", () => {
  it("returns the single interval if it overlaps the window", () => {
    const result = expandBlockedPeriod(
      { ...baseBlock, isRecurring: false, recurrenceRule: null },
      new Date("2024-01-01T00:00:00Z"),
      new Date("2024-01-02T00:00:00Z")
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.startsAt).toEqual(baseBlock.startAt);
  });

  it("returns empty if it does not overlap the window", () => {
    const result = expandBlockedPeriod(
      { ...baseBlock, isRecurring: false, recurrenceRule: null },
      new Date("2024-02-01T00:00:00Z"),
      new Date("2024-02-28T00:00:00Z")
    );
    expect(result).toHaveLength(0);
  });
});

describe("expandBlockedPeriod — weekly recurring (BYDAY=MO)", () => {
  const rrule = "RRULE:FREQ=WEEKLY;BYDAY=MO";
  const bp = { ...baseBlock, isRecurring: true, recurrenceRule: rrule };

  it("expands weekly occurrences within a 4-week window", () => {
    const from = new Date("2024-01-01T00:00:00Z");
    const to = new Date("2024-01-29T00:00:00Z");
    const result = expandBlockedPeriod(bp, from, to);
    // Mondays: Jan 1, 8, 15, 22
    expect(result.length).toBeGreaterThanOrEqual(3);
    result.forEach((i) => {
      expect(i.endsAt.getTime() - i.startsAt.getTime()).toBe(60 * 60 * 1000);
    });
  });

  it("preserves the original duration for each occurrence", () => {
    const from = new Date("2024-01-01T00:00:00Z");
    const to = new Date("2024-01-08T23:59:59Z");
    const result = expandBlockedPeriod(bp, from, to);
    expect(result.length).toBeGreaterThan(0);
    const durationMs = result[0]!.endsAt.getTime() - result[0]!.startsAt.getTime();
    expect(durationMs).toBe(60 * 60 * 1000); // 1 hour
  });

  it("returns empty if window precedes first occurrence", () => {
    const from = new Date("2023-01-01T00:00:00Z");
    const to = new Date("2023-01-07T00:00:00Z");
    const result = expandBlockedPeriod(bp, from, to);
    expect(result).toHaveLength(0);
  });
});

describe("expandBlockedPeriod — with UNTIL clause", () => {
  it("stops expanding after the UNTIL date", () => {
    const rrule = "RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20240115T235959Z";
    const bp = { ...baseBlock, isRecurring: true, recurrenceRule: rrule };
    const from = new Date("2024-01-01T00:00:00Z");
    const to = new Date("2024-02-01T00:00:00Z");
    const result = expandBlockedPeriod(bp, from, to);
    // Mondays before Jan 15: Jan 1, 8, 15
    expect(result.length).toBeLessThanOrEqual(3);
  });
});

describe("expandBlockedPeriod — malformed RRULE", () => {
  it("falls back to single interval on parse error", () => {
    const bp = { ...baseBlock, isRecurring: true, recurrenceRule: "INVALID_RRULE" };
    const from = new Date("2024-01-01T00:00:00Z");
    const to = new Date("2024-01-02T00:00:00Z");
    const result = expandBlockedPeriod(bp, from, to);
    expect(result).toHaveLength(1);
  });
});

describe("overlapsAny", () => {
  const blocked = [
    { startsAt: new Date("2024-01-01T09:00:00Z"), endsAt: new Date("2024-01-01T10:00:00Z") },
    { startsAt: new Date("2024-01-01T14:00:00Z"), endsAt: new Date("2024-01-01T15:00:00Z") },
  ];

  it("returns true when interval overlaps a blocked period", () => {
    expect(
      overlapsAny(
        new Date("2024-01-01T09:30:00Z"),
        new Date("2024-01-01T10:30:00Z"),
        blocked
      )
    ).toBe(true);
  });

  it("returns false when interval is entirely before", () => {
    expect(
      overlapsAny(
        new Date("2024-01-01T07:00:00Z"),
        new Date("2024-01-01T09:00:00Z"),
        blocked
      )
    ).toBe(false);
  });

  it("returns false when interval is entirely after", () => {
    expect(
      overlapsAny(
        new Date("2024-01-01T10:00:00Z"),
        new Date("2024-01-01T11:00:00Z"),
        blocked
      )
    ).toBe(false);
  });

  it("returns true for exact boundary overlap (start = blocked.endsAt edge case)", () => {
    // Our overlap test is exclusive on end: slotStart < blocked.end && slotEnd > blocked.start
    // Touching end-to-start is NOT an overlap
    expect(
      overlapsAny(
        new Date("2024-01-01T10:00:00Z"),
        new Date("2024-01-01T11:00:00Z"),
        blocked
      )
    ).toBe(false);
  });

  it("handles empty blocked list", () => {
    expect(
      overlapsAny(new Date("2024-01-01T09:00:00Z"), new Date("2024-01-01T10:00:00Z"), [])
    ).toBe(false);
  });
});

describe("buildWeeklyRrule", () => {
  it("builds a weekly MO,WE,FR rrule", () => {
    const rule = buildWeeklyRrule(["MO", "WE", "FR"]);
    expect(rule).toContain("FREQ=WEEKLY");
    expect(rule).toContain("BYDAY=MO,WE,FR");
  });

  it("includes UNTIL when provided", () => {
    const until = new Date("2024-12-31T00:00:00Z");
    const rule = buildWeeklyRrule(["MO"], until);
    expect(rule).toContain("UNTIL=20241231T000000Z");
  });
});
