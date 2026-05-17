import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { GoogleBusinessListing } from "@/lib/integrations/types";

export interface BusinessListingCardProps {
  listing: GoogleBusinessListing;
  selected: boolean;
  onSelect: () => void;
  /** Disable a row when it lacks enough info to import safely. */
  disabled?: boolean;
  /** Disabled-reason copy. */
  disabledHint?: string;
  /** Name used for the radio group — must match siblings. */
  name: string;
}

/**
 * Selectable, radio-backed row in the BusinessListingPicker. The whole
 * row is a single tap target; the radio is rendered as a small filled
 * dot so the layout stays compact on mobile. Native radio semantics give
 * us keyboard a11y for free (Up/Down to switch, Space to select).
 */
export function BusinessListingCard({
  listing,
  selected,
  onSelect,
  disabled = false,
  disabledHint,
  name,
}: BusinessListingCardProps) {
  const id = `listing-${listing.id}`;
  return (
    <label
      htmlFor={id}
      className={cn(
        "relative flex cursor-pointer items-start gap-inline-sm rounded-card border bg-surface p-inset-sm",
        "transition-colors duration-fast ease-standard",
        selected ? "border-accent bg-accent-subtle" : "border-border hover:bg-surface-sunken",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={listing.id}
        checked={selected}
        onChange={onSelect}
        disabled={disabled}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-pill border",
          selected ? "border-accent bg-accent" : "border-border bg-surface"
        )}
      >
        {selected ? <span className="h-1.5 w-1.5 rounded-pill bg-onAccent" /> : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-stack-xs">
        <span className="flex items-center gap-inline-xs">
          <span className="truncate text-sm font-semibold text-text-primary">{listing.name}</span>
          {listing.verifiedOnGoogle ? (
            <CheckCircle2
              aria-label="Verified on Google"
              className="h-4 w-4 shrink-0 text-signal-success"
            />
          ) : null}
        </span>
        <span className="truncate text-xs text-text-secondary">
          {listing.address.line1} · {listing.address.city}, {listing.address.region}
        </span>
        <span className="text-xs text-text-muted">
          {listing.reviewCount === 0 || listing.reviewCount === undefined
            ? "No reviews"
            : `${listing.reviewCount} review${listing.reviewCount === 1 ? "" : "s"}`}
          {listing.categories[0] ? ` · ${listing.categories[0]}` : ""}
        </span>
        {disabled && disabledHint ? (
          <span className="text-xs text-signal-warning">{disabledHint}</span>
        ) : null}
      </span>
    </label>
  );
}
