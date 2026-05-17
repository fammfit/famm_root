import * as React from "react";
import { MapPin, Phone, Globe, Clock } from "lucide-react";
import { Card } from "@famm/ui";
import type { GoogleBusinessHours, GoogleBusinessListing } from "@/lib/integrations/types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function formatDays(days: ReadonlyArray<number>): string {
  if (days.length === 7) return "Every day";
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) {
    return "Mon–Fri";
  }
  return days
    .map((d) => DAY_LABELS[d] ?? "")
    .filter(Boolean)
    .join(", ");
}

function formatHours(h: GoogleBusinessHours): string {
  return `${formatDays(h.daysOfWeek)} · ${h.open}–${h.close}`;
}

export interface BusinessListingPreviewProps {
  listing: GoogleBusinessListing;
  onChange: () => void;
}

export function BusinessListingPreview({ listing, onChange }: BusinessListingPreviewProps) {
  return (
    <Card className="flex flex-col gap-stack-sm p-inset-md">
      <header className="flex items-start justify-between gap-inline-sm">
        <div className="flex flex-col gap-stack-xs">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Importing</p>
          <h3 className="text-lg font-semibold text-text-primary">{listing.name}</h3>
        </div>
        <button
          type="button"
          onClick={onChange}
          className="inline-flex h-9 items-center justify-center rounded-control border border-border bg-surface px-inset-sm text-sm font-medium text-text-primary transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          Change
        </button>
      </header>
      <dl className="flex flex-col gap-stack-xs text-sm">
        <DetailRow icon={MapPin} label="Address">
          {listing.address.line1}
          {listing.address.line2 ? `, ${listing.address.line2}` : ""}, {listing.address.city},{" "}
          {listing.address.region} {listing.address.postalCode}
        </DetailRow>
        {listing.phone ? (
          <DetailRow icon={Phone} label="Phone">
            {listing.phone}
          </DetailRow>
        ) : null}
        {listing.website ? (
          <DetailRow icon={Globe} label="Website">
            {listing.website}
          </DetailRow>
        ) : null}
        {listing.hours.length > 0 ? (
          <DetailRow icon={Clock} label="Hours">
            <span className="flex flex-col">
              {listing.hours.map((h, i) => (
                <span key={i}>{formatHours(h)}</span>
              ))}
            </span>
          </DetailRow>
        ) : null}
      </dl>
      <p className="text-xs text-text-muted">You can edit any of this on the next step.</p>
    </Card>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  /** Accepts any component that takes `className` — lucide-react icons fit. */
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-inline-sm">
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-text-secondary"
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="sr-only">{label}</dt>
        <dd className="text-text-primary">{children}</dd>
      </div>
    </div>
  );
}
