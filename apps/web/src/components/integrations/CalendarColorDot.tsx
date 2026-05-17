/* eslint-disable no-restricted-syntax --
 * Exception: per-calendar color is *data* returned by the Google
 * Calendar API. It paints a small swatch via inline style; the rest of
 * the calendar surface uses semantic tokens.
 */
import * as React from "react";
import { cn } from "@/lib/cn";

export interface CalendarColorDotProps {
  colorHex: string;
  className?: string;
}

export function CalendarColorDot({ colorHex, className }: CalendarColorDotProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-3 w-3 shrink-0 rounded-pill border border-border", className)}
      style={{ backgroundColor: colorHex }}
    />
  );
}
