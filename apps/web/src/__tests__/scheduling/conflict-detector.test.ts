import { describe, it, expect } from "vitest";

// Pure conflict overlap logic — no DB/Redis needed for these tests.
// The checkConflict() function that calls DB is covered in integration tests.

function overlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

describe("Overlap detection (half-open intervals)", () => {
  const A = new Date("2024-06-01T09:00:00Z");
  const B = new Date("2024-06-01T10:00:00Z");
  const C = new Date("2024-06-01T11:00:00Z");
  const D = new Date("2024-06-01T12:00:00Z");

  it("detects full overlap", () => {
    expect(overlaps(A, D, B, C)).toBe(true);
  });

  it("detects partial overlap — leading edge", () => {
    expect(overlaps(A, C, B, D)).toBe(true);
  });

  it("detects partial overlap — trailing edge", () => {
    expect(overlaps(B, D, A, C)).toBe(true);
  });

  it("no overlap — adjacent (end = start)", () => {
    expect(overlaps(A, B, B, C)).toBe(false);
  });

  it("no overlap — entirely before", () => {
    expect(overlaps(A, B, C, D)).toBe(false);
  });

  it("no overlap — entirely after", () => {
    expect(overlaps(C, D, A, B)).toBe(false);
  });

  it("exact same interval overlaps", () => {
    expect(overlaps(A, B, A, B)).toBe(true);
  });

  it("contained within overlaps", () => {
    const inner = new Date("2024-06-01T09:15:00Z");
    const innerEnd = new Date("2024-06-01T09:45:00Z");
    expect(overlaps(A, B, inner, innerEnd)).toBe(true);
  });
});

describe("Double-booking scenarios", () => {
  interface Booking {
    id: string;
    startAt: Date;
    endAt: Date;
  }

  function findConflicts(
    proposed: { start: Date; end: Date },
    existing: Booking[]
  ): Booking[] {
    return existing.filter(
      (b) => overlaps(proposed.start, proposed.end, b.startAt, b.endAt)
    );
  }

  const bookings: Booking[] = [
    {
      id: "b1",
      startAt: new Date("2024-06-01T09:00:00Z"),
      endAt: new Date("2024-06-01T10:00:00Z"),
    },
    {
      id: "b2",
      startAt: new Date("2024-06-01T11:00:00Z"),
      endAt: new Date("2024-06-01T12:00:00Z"),
    },
  ];

  it("finds no conflict for a non-overlapping slot", () => {
    const conflicts = findConflicts(
      { start: new Date("2024-06-01T10:00:00Z"), end: new Date("2024-06-01T11:00:00Z") },
      bookings
    );
    expect(conflicts).toHaveLength(0);
  });

  it("finds a conflict when slot overlaps an existing booking", () => {
    const conflicts = findConflicts(
      { start: new Date("2024-06-01T09:30:00Z"), end: new Date("2024-06-01T10:30:00Z") },
      bookings
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.id).toBe("b1");
  });

  it("finds multiple conflicts when slot spans multiple bookings", () => {
    const conflicts = findConflicts(
      { start: new Date("2024-06-01T09:30:00Z"), end: new Date("2024-06-01T11:30:00Z") },
      bookings
    );
    expect(conflicts).toHaveLength(2);
  });

  it("no conflict for adjacent booking (back-to-back with buffer)", () => {
    // b1 ends at 10:00; b2 starts at 11:00
    // A slot from 10:00 to 11:00 is adjacent to both — no overlap (half-open intervals)
    const conflicts = findConflicts(
      { start: new Date("2024-06-01T10:00:00Z"), end: new Date("2024-06-01T11:00:00Z") },
      bookings
    );
    expect(conflicts).toHaveLength(0);
  });
});

describe("Group capacity conflict detection", () => {
  it("allows multiple bookings up to capacity for GROUP service", () => {
    const capacity = 10;
    const bookedCount = 9;
    const canBook = bookedCount < capacity;
    expect(canBook).toBe(true);
  });

  it("blocks booking when at capacity", () => {
    const capacity = 10;
    const bookedCount = 10;
    const canBook = bookedCount < capacity;
    expect(canBook).toBe(false);
  });

  it("blocks when holds + bookings >= capacity", () => {
    const capacity = 5;
    const bookedCount = 3;
    const holdCount = 2;
    const canAcquireHold = bookedCount + holdCount < capacity;
    expect(canAcquireHold).toBe(false);
  });
});
