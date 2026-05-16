"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { EmptyState, Input } from "@famm/ui";
import { BusinessListingCard } from "./BusinessListingCard";
import type { GoogleBusinessListing } from "@/lib/integrations/types";
import { cn } from "@/lib/cn";

export interface BusinessListingPickerProps {
  listings: ReadonlyArray<GoogleBusinessListing>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Show the search affordance regardless of count. */
  forceSearch?: boolean;
}

const SEARCH_AUTO_THRESHOLD = 5;

function hasMinimumDetail(l: GoogleBusinessListing): boolean {
  return Boolean(l.phone || l.website || l.hours.length > 0);
}

export function BusinessListingPicker({
  listings,
  selectedId,
  onSelect,
  forceSearch = false,
}: BusinessListingPickerProps) {
  const [showSearch, setShowSearch] = React.useState(
    forceSearch || listings.length > SEARCH_AUTO_THRESHOLD
  );
  const [query, setQuery] = React.useState("");

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return listings;
    return listings.filter((l) =>
      [l.name, l.address.city, l.address.region].join(" ").toLowerCase().includes(q)
    );
  }, [listings, query]);

  if (listings.length === 0) {
    return (
      <EmptyState
        title="No businesses on this Google account"
        description="Your Google account doesn't manage any businesses yet. Try a different account, or skip and enter your details by hand on the next step."
      />
    );
  }

  return (
    <fieldset className="flex flex-col gap-stack-sm">
      <legend className="text-sm font-semibold text-text-primary">Choose your business</legend>
      {showSearch ? (
        <div className={cn("relative")}>
          <Search
            aria-hidden
            className="pointer-events-none absolute left-inset-sm top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
          />
          <Input
            aria-label="Search businesses by name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or city"
            className="pl-9"
          />
        </div>
      ) : null}

      <ul className="flex flex-col gap-stack-xs">
        {visible.map((listing) => {
          const enabled = hasMinimumDetail(listing);
          return (
            <li key={listing.id}>
              <BusinessListingCard
                name="business-listing"
                listing={listing}
                selected={listing.id === selectedId}
                onSelect={() => onSelect(listing.id)}
                disabled={!enabled}
                disabledHint={!enabled ? "Not enough info on this listing" : undefined}
              />
            </li>
          );
        })}
      </ul>

      <p aria-live="polite" className="text-xs text-text-muted">
        {query
          ? `${visible.length} match${visible.length === 1 ? "" : "es"}`
          : `${listings.length} listing${listings.length === 1 ? "" : "s"}`}
      </p>

      {!showSearch ? (
        <button
          type="button"
          onClick={() => setShowSearch(true)}
          className="self-start text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
        >
          Don&rsquo;t see it? Search by name
        </button>
      ) : null}
    </fieldset>
  );
}
