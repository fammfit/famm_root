"use client";

import * as React from "react";
import { OfferCard } from "./OfferCard";
import { FinalCtaBand } from "./FinalCtaBand";
import { StickyCtaBar } from "./StickyCtaBar";
import { trackEvent } from "@/lib/api/public-marketing";
import type { PromoOffer } from "@/lib/marketing/types";

interface PromoSectionProps {
  promo: PromoOffer | null;
  ctaHref: string;
  promoSlug?: string;
  refCode?: string;
  /** Hide the lead-capture form in the final band (signed-in trainer / client). */
  hideLeadCapture: boolean;
  /** Show the mobile sticky CTA bar. */
  showStickyCta: boolean;
  /** Fallback band copy when no promo is active. */
  fallbackHeadline?: string;
}

/**
 * Holds the live state for the promo lifecycle:
 *   - mounts the OfferCard while the promo is active,
 *   - swaps to a "just ended" variant when CountdownPill fires onExpire,
 *   - emits a `promo.miss` analytics event if we arrived with an EXPIRED
 *     or unknown promo.
 *
 * Mounted from the server-rendered page; pure client island.
 */
export function PromoSection({
  promo,
  ctaHref,
  promoSlug,
  refCode,
  hideLeadCapture,
  showStickyCta,
}: PromoSectionProps) {
  const [expired, setExpired] = React.useState(false);

  // Fire once on mount: page view + (if applicable) promo miss.
  React.useEffect(() => {
    trackEvent({ name: "page.view", payload: { surface: "new-trainer-offer" } });
    if (!promo && promoSlug) {
      trackEvent({ name: "promo.miss", payload: { slug: promoSlug } });
    }
  }, [promo, promoSlug]);

  const showPromo = Boolean(promo && !expired);

  return (
    <>
      {showPromo && promo ? (
        <OfferCard promo={promo} ctaHref={ctaHref} onExpire={() => setExpired(true)} />
      ) : null}
      <FinalCtaBand
        primaryCta={{
          label: promo?.ctaLabel ?? "Start free",
          href: ctaHref,
        }}
        promoSlug={promo?.slug ?? promoSlug}
        refCode={refCode}
        hideLeadCapture={hideLeadCapture}
      />
      {showStickyCta ? (
        <StickyCtaBar
          primary={{
            label: promo?.ctaLabel ?? "Start free",
            href: ctaHref,
          }}
        />
      ) : null}
    </>
  );
}
