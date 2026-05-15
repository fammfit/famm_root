// Money helpers. All amounts are kept in MINOR units (integer cents) at rest.
// Conversion to major units happens only at API boundaries.

export type Cents = number;

const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

export function isZeroDecimal(currency: string): boolean {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase());
}

export function toMinor(major: number, currency = "USD"): Cents {
  if (!Number.isFinite(major)) throw new Error(`Invalid amount: ${major}`);
  return isZeroDecimal(currency) ? Math.round(major) : Math.round(major * 100);
}

export function toMajor(minor: Cents, currency = "USD"): number {
  return isZeroDecimal(currency) ? minor : minor / 100;
}

export function formatMoney(minor: Cents, currency = "USD", locale = "en-US"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    toMajor(minor, currency)
  );
}

/**
 * Largest-remainder allocation. Distributes `total` minor-units across `weights`
 * such that the sum exactly equals `total` (handles rounding without leakage).
 */
export function allocate(total: Cents, weights: number[]): Cents[] {
  if (weights.length === 0) return [];
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 0);

  const raw = weights.map((w) => (total * w) / sum);
  const floors = raw.map((r) => Math.floor(r));
  let remainder = total - floors.reduce((a, b) => a + b, 0);

  // Distribute remainder by fractional part, descending.
  const order = raw.map((r, i) => ({ frac: r - Math.floor(r), i })).sort((a, b) => b.frac - a.frac);

  for (let k = 0; k < order.length && remainder > 0; k++) {
    floors[order[k]!.i]! += 1;
    remainder -= 1;
  }
  return floors;
}
