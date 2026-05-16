"use client";

import * as React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Badge, Card, CountdownPill, Money } from "@famm/ui";
import { cn } from "@/lib/cn";
import type { PromoOffer } from "@/lib/marketing/types";
import { trackEvent } from "@/lib/api/public-marketing";

export interface OfferCardProps {
  promo: PromoOffer;
  ctaHref: string;
  /** Called after the countdown crosses zero so the page can hide the band. */
  onExpire?: () => void;
}

const COUNTDOWN_WINDOW_MS = 24 * 60 * 60 * 1000;

export function OfferCard({ promo, ctaHref, onExpire }: OfferCardProps) {
  const expiresAtMs = promo.expiresAt ? new Date(promo.expiresAt).getTime() : null;
  const withinCountdown = expiresAtMs !== null && expiresAtMs - Date.now() <= COUNTDOWN_WINDOW_MS;

  return (
    <section id="offer" aria-labelledby="offer-heading" className="bg-surface-sunken">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-stack-lg px-inset-md py-stack-xl md:px-inset-lg md:py-stack-2xl">
        <Card className="flex flex-col gap-stack-md p-inset-lg md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-stack-sm">
            <div className="flex flex-wrap items-center gap-inline-xs">
              <Badge variant={promo.urgency === "high" ? "warning" : "default"}>
                {promo.headline}
              </Badge>
              {withinCountdown && promo.expiresAt ? (
                <CountdownPill
                  targetIso={promo.expiresAt}
                  urgency={promo.urgency}
                  onExpire={onExpire}
                />
              ) : null}
            </div>
            <h2 id="offer-heading" className="text-2xl font-semibold text-text-primary md:text-3xl">
              {promo.body}
            </h2>
            <PriceLine
              priceCents={promo.priceCents}
              normalPriceCents={promo.normalPriceCents}
              currency={promo.currency}
            />
            <ul className="grid grid-cols-1 gap-stack-xs sm:grid-cols-2">
              {promo.featuredBenefits.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-start gap-inline-xs text-sm text-text-secondary"
                >
                  <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-signal-success" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
          <Link
            href={ctaHref}
            onClick={() =>
              trackEvent({
                name: "cta.click",
                payload: { surface: "offer-card", promoSlug: promo.slug },
              })
            }
            className={cn(
              "inline-flex h-12 shrink-0 items-center justify-center rounded-control",
              "bg-accent px-inset-lg text-base font-medium text-onAccent",
              "transition-colors duration-fast ease-standard hover:bg-accent-hover",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
              "md:self-center"
            )}
          >
            {promo.ctaLabel}
          </Link>
        </Card>
      </div>
    </section>
  );
}

function PriceLine({
  priceCents,
  normalPriceCents,
  currency,
}: {
  priceCents: number | null;
  normalPriceCents: number;
  currency: string;
}) {
  if (priceCents === 0) {
    return (
      <p className="flex items-baseline gap-inline-xs text-text-primary">
        <span className="text-3xl font-semibold">Free</span>
        <span className="text-sm text-text-secondary">
          for 30 days · then <Money amountCents={normalPriceCents} currency={currency} />
          /mo
        </span>
      </p>
    );
  }
  if (priceCents == null) {
    return (
      <p className="text-3xl font-semibold text-text-primary">
        <Money amountCents={normalPriceCents} currency={currency} />
        <span className="text-sm font-normal text-text-secondary">/mo</span>
      </p>
    );
  }
  return (
    <p className="flex items-baseline gap-inline-sm">
      <span className="text-3xl font-semibold text-text-primary">
        <Money amountCents={priceCents} currency={currency} />
      </span>
      <Money amountCents={normalPriceCents} currency={currency} strike className="text-base" />
      <span className="text-sm text-text-secondary">/mo</span>
    </p>
  );
}
