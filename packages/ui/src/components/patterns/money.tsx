import * as React from "react";
import { cn } from "../../lib/utils";

export interface MoneyProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Amount in the *smallest* currency unit (e.g. cents). */
  amountCents: number;
  /** ISO-4217 code. Defaults to USD. */
  currency?: string;
  /** BCP-47 locale. Defaults to runtime locale. */
  locale?: string;
  /** Strikethrough — used for a previous price. */
  strike?: boolean;
}

/**
 * L2 — single, locale-aware money formatter. Always prefer this over
 * inlined `Intl.NumberFormat` calls so prices look consistent across the
 * app (pricing card, offer banner, checkout, payouts).
 */
export function Money({
  amountCents,
  currency = "USD",
  locale,
  strike = false,
  className,
  ...rest
}: MoneyProps) {
  const value = amountCents / 100;
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
  return (
    <span
      className={cn("tabular-nums", strike && "text-text-muted line-through", className)}
      {...rest}
    >
      {formatted}
    </span>
  );
}
