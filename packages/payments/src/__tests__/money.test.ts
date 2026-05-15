import { describe, expect, it } from "vitest";
import { allocate, formatMoney, isZeroDecimal, toMajor, toMinor } from "../money";

describe("money", () => {
  it("converts USD to/from minor units", () => {
    expect(toMinor(10, "USD")).toBe(1000);
    expect(toMajor(1234, "USD")).toBe(12.34);
  });

  it("treats zero-decimal currencies correctly", () => {
    expect(isZeroDecimal("JPY")).toBe(true);
    expect(toMinor(1000, "JPY")).toBe(1000);
    expect(toMajor(1000, "JPY")).toBe(1000);
  });

  it("formats currency for display", () => {
    expect(formatMoney(1234, "USD", "en-US")).toBe("$12.34");
  });
});

describe("allocate", () => {
  it("preserves exact totals with rounding remainders", () => {
    const parts = allocate(100, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
    // 100/3 = 33.33 → [34, 33, 33] in some order, sum = 100
    expect(parts.every((p) => p === 33 || p === 34)).toBe(true);
  });

  it("returns zeros for zero weights", () => {
    expect(allocate(100, [0, 0, 0])).toEqual([0, 0, 0]);
  });

  it("returns empty for empty weights", () => {
    expect(allocate(100, [])).toEqual([]);
  });

  it("respects weighted distribution", () => {
    const parts = allocate(1000, [70, 20, 10]);
    expect(parts).toEqual([700, 200, 100]);
  });
});
