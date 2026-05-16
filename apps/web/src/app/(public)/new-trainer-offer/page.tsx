/**
 * @page New Trainer Offer / Intro (/new-trainer-offer)
 *
 * Purpose: high-conversion acquisition landing for guest trainers.
 *   Communicates the promise, surfaces the live promotional offer, and
 *   collects either a full signup or — as a fallback — a lightweight
 *   lead. Optimised for the 60-second between-sessions phone visit.
 * Primary user: guest / unauthenticated visitor (trainer-shaped).
 *   Authenticated CLIENT and trainer-role viewers see auth-aware variants
 *   (CTA -> /my or /dashboard; promo + lead form hidden for trainers).
 * Core actions:
 *   - Start free (-> /register?role=trainer&promo=<slug>&ref=<ref>)
 *   - Sign in (header)
 *   - Capture lead via email (POST /api/v1/public/leads)
 *   - Scroll to How it works / FAQ
 * UI sections (top -> bottom):
 *   PublicAppBar, Hero, TrustStrip, FeatureGrid, HowItWorks, OfferCard,
 *   TestimonialsCarousel, FaqAccordion, FinalCtaBand (+ inline lead),
 *   MarketingFooter, StickyCtaBar (mobile only).
 * Empty state: when no ACTIVE promo, hide OfferCard + promo badge; final
 *   band copy stays.
 * Loading state: loading.tsx renders a hero skeleton; below-fold blocks
 *   stream in via Suspense (live stats hydrate after first paint).
 * Error state: error.tsx — friendly retry; never blocks the page.
 * Mobile layout: single column; sticky bottom CTA bar hides when the
 *   hero CTA is in view. Tablet/desktop: hero becomes two-column, feature
 *   grid widens to 2/3 columns.
 * Required data: PromoOffer (mocked via /api/v1/public/promotions/active
 *   stub), PublicStats (mocked), Lead (POST stub). Static content for
 *   features / testimonials / FAQ.
 * Related components: PublicShell, PublicAppBar, Hero, TrustStrip,
 *   FeatureGrid, HowItWorks, OfferCard, CountdownPill, Money,
 *   TestimonialsCarousel, TestimonialCard, FaqAccordion,
 *   LeadCaptureForm, FinalCtaBand, StickyCtaBar, MarketingFooter.
 * Route: /new-trainer-offer (public — listed in middleware PUBLIC_PATHS).
 *   /trainer 308-redirects here via next.config.ts.
 */

import { PublicShell } from "@/components/layouts/PublicShell";
import { Hero } from "@/components/marketing/Hero";
import { TrustStrip } from "@/components/marketing/TrustStrip";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { TestimonialsCarousel } from "@/components/marketing/TestimonialsCarousel";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";
import { MarketingFooter } from "@/components/marketing/Footer";
import { PromoSection } from "@/components/marketing/PromoSection";
import { fetchActivePromo } from "@/lib/api/public-marketing";
import { getRequestContext } from "@/lib/request-context";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "FAMM for trainers — run your business from your phone",
  description: "Bookings, payments, reminders, forms, and workouts. 30 days free, no card.",
};

interface PageProps {
  searchParams?: Record<string, string | undefined>;
}

type ViewerKind = "guest" | "client" | "trainer";

function resolveViewer(): ViewerKind {
  try {
    const ctx = getRequestContext();
    return ctx.userRole === "CLIENT" ? "client" : "trainer";
  } catch {
    return "guest";
  }
}

export default async function NewTrainerOfferPage({ searchParams }: PageProps) {
  const viewer = resolveViewer();
  const promoSlugQuery = searchParams?.promo;
  const refCode = searchParams?.ref;

  const promo = await fetchActivePromo({
    slug: promoSlugQuery,
    audience: "TRAINER",
  });

  const ctaHref = buildCtaHref(viewer, promo?.slug ?? promoSlugQuery, refCode);
  const primaryCtaLabel =
    viewer === "trainer"
      ? "Open your dashboard"
      : viewer === "client"
        ? "Open your portal"
        : (promo?.ctaLabel ?? "Start free");

  // Trainers never see the trial pitch (avoids the "downgrade" confusion).
  const showPromoSurfaces = viewer !== "trainer";
  const showStickyCta = viewer === "guest";

  return (
    <PublicShell
      signedInRole={viewer === "client" ? "CLIENT" : viewer === "trainer" ? "TRAINER_LIKE" : null}
    >
      <Hero
        headline={
          viewer === "trainer" ? "Welcome back." : "Run your training business from your phone."
        }
        subhead={
          viewer === "trainer"
            ? "Your dashboard is one tap away."
            : "Bookings, payments, reminders, forms, workouts — one app, on the gym floor."
        }
        badgeText={showPromoSurfaces && promo?.headline ? promo.headline : undefined}
        badgeTone={promo?.urgency === "high" ? "warning" : "default"}
        primaryCta={{ label: primaryCtaLabel, href: ctaHref }}
        secondaryCta={viewer === "guest" ? { label: "See how it works", href: "#how" } : undefined}
      />
      <TrustStrip />
      <FeatureGrid />
      <HowItWorks />
      {showPromoSurfaces ? (
        <PromoSection
          promo={promo}
          ctaHref={ctaHref}
          promoSlug={promoSlugQuery}
          refCode={refCode}
          hideLeadCapture={viewer !== "guest"}
          showStickyCta={showStickyCta}
        />
      ) : null}
      <TestimonialsCarousel />
      <FaqAccordion />
      <MarketingFooter />
    </PublicShell>
  );
}

function buildCtaHref(
  viewer: ViewerKind,
  promoSlug: string | undefined,
  refCode: string | undefined
): string {
  if (viewer === "trainer") return "/dashboard";
  if (viewer === "client") return "/my";
  const params = new URLSearchParams({ role: "trainer" });
  if (promoSlug) params.set("promo", promoSlug);
  if (refCode) params.set("ref", refCode);
  return `/register?${params.toString()}`;
}
