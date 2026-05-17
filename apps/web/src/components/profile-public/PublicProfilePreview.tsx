import * as React from "react";
import { Instagram, Music2, Youtube, Globe, MapPin } from "lucide-react";
import { Badge, Card, EmptyState } from "@famm/ui";

export interface PublicProfilePreviewData {
  name: string;
  slug: string;
  baseUrl: string;
  city: string | null;
  region: string | null;
  logoUrl: string | null;
  headline: string;
  bioMd: string;
  gallery: ReadonlyArray<string>;
  specialties: ReadonlyArray<string>;
  socialLinks: {
    instagram: string | null;
    tiktok: string | null;
    youtube: string | null;
    website: string | null;
  };
}

export interface PublicProfilePreviewProps {
  data: PublicProfilePreviewData;
}

/**
 * Mini render of the public booking page. Single source of truth for the
 * v1 storefront layout — the real `/t/{slug}` page will compose this
 * same component at full width.
 */
export function PublicProfilePreview({ data }: PublicProfilePreviewProps) {
  const initials = data.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("");
  const location = [data.city, data.region].filter(Boolean).join(", ");
  return (
    <Card className="flex flex-col gap-stack-md overflow-hidden">
      <header className="flex items-start gap-inline-sm p-inset-md pb-0">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-card border border-border bg-surface-sunken"
        >
          {data.logoUrl ? (
            <img src={data.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-base font-semibold text-text-secondary">{initials || "?"}</span>
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-stack-xs">
          <h3 className="truncate text-base font-semibold text-text-primary">
            {data.name || "Your business"}
          </h3>
          {location ? (
            <p className="inline-flex items-center gap-inline-xs text-xs text-text-secondary">
              <MapPin aria-hidden className="h-3 w-3" />
              {location}
            </p>
          ) : null}
          <p className="truncate text-xs font-mono text-text-muted">
            {data.baseUrl}
            {data.slug || "your-slug"}
          </p>
        </div>
      </header>

      {data.headline ? (
        <p className="px-inset-md text-sm font-semibold text-text-primary">{data.headline}</p>
      ) : null}

      {data.bioMd ? (
        <p className="px-inset-md text-sm leading-relaxed text-text-secondary">{data.bioMd}</p>
      ) : null}

      {data.specialties.length > 0 ? (
        <div className="flex flex-wrap gap-inline-xs px-inset-md">
          {data.specialties.map((s) => (
            <Badge key={s} variant="secondary">
              {s}
            </Badge>
          ))}
        </div>
      ) : null}

      {data.gallery.length > 0 ? (
        <div className="-mx-px overflow-x-auto px-inset-md">
          <div className="flex gap-stack-xs">
            {data.gallery.map((url, i) => (
              <span
                key={`${i}-${url.slice(-8)}`}
                className="block aspect-square w-24 shrink-0 overflow-hidden rounded-card border border-border bg-surface-sunken"
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-inline-sm px-inset-md">
        {data.socialLinks.instagram ? <SocialPill icon={Instagram} label="Instagram" /> : null}
        {data.socialLinks.tiktok ? <SocialPill icon={Music2} label="TikTok" /> : null}
        {data.socialLinks.youtube ? <SocialPill icon={Youtube} label="YouTube" /> : null}
        {data.socialLinks.website ? <SocialPill icon={Globe} label="Website" /> : null}
      </div>

      <div className="grid grid-cols-1 gap-stack-xs px-inset-md pb-inset-md">
        <Card className="border-dashed bg-surface-sunken p-inset-sm">
          <EmptyState
            title="Services"
            description="Created in a later step. They'll show here automatically."
            className="p-0"
          />
        </Card>
        <Card className="border-dashed bg-surface-sunken p-inset-sm">
          <EmptyState
            title="Reviews"
            description="Appear after your first 3 sessions."
            className="p-0"
          />
        </Card>
      </div>
    </Card>
  );
}

function SocialPill({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-inline-xs rounded-pill border border-border bg-surface px-inset-sm py-1 text-xs font-medium text-text-secondary">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
