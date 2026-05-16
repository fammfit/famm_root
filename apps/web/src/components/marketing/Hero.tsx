import * as React from "react";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { Badge } from "@famm/ui";
import { cn } from "@/lib/cn";

export interface HeroProps {
  headline: string;
  subhead: string;
  /** Promo badge text — when supplied. */
  badgeText?: string;
  badgeTone?: "default" | "warning";
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  /** Optional secondary "Watch the tour" button — opens an inline modal video.
   *  Implementation deferred; rendered as a disabled placeholder for now.
   */
  showTourCta?: boolean;
}

export function Hero({
  headline,
  subhead,
  badgeText,
  badgeTone = "default",
  primaryCta,
  secondaryCta,
  showTourCta = false,
}: HeroProps) {
  return (
    <section aria-labelledby="hero-heading" className="border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-stack-lg px-inset-md py-stack-xl md:flex-row md:items-center md:gap-stack-xl md:py-stack-2xl md:px-inset-lg">
        <div className="flex flex-1 flex-col gap-stack-md">
          {badgeText ? (
            <span>
              <Badge variant={badgeTone === "warning" ? "warning" : "default"}>{badgeText}</Badge>
            </span>
          ) : null}
          <h1
            id="hero-heading"
            className="text-3xl font-semibold tracking-tight text-text-primary md:text-5xl md:leading-tight"
          >
            {headline}
          </h1>
          <p className="max-w-prose text-base text-text-secondary md:text-lg">{subhead}</p>
          <div className="flex flex-col gap-stack-xs sm:flex-row sm:items-center sm:gap-inline-sm">
            <Link
              href={primaryCta.href}
              data-cta="hero-primary"
              className={cn(
                "inline-flex h-12 items-center justify-center rounded-control",
                "bg-accent px-inset-lg text-base font-medium text-onAccent",
                "transition-colors duration-fast ease-standard hover:bg-accent-hover",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              )}
            >
              {primaryCta.label}
              <ArrowRight aria-hidden className="ml-inline-xs h-4 w-4" />
            </Link>
            {secondaryCta ? (
              <Link
                href={secondaryCta.href}
                data-cta="hero-secondary"
                className={cn(
                  "inline-flex h-12 items-center justify-center rounded-control",
                  "border border-border bg-surface px-inset-lg text-base font-medium text-text-primary",
                  "transition-colors duration-fast ease-standard hover:bg-surface-sunken",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                )}
              >
                {secondaryCta.label}
              </Link>
            ) : null}
            {showTourCta ? (
              <button
                type="button"
                disabled
                aria-label="Watch the 90-second tour (coming soon)"
                className={cn(
                  "inline-flex h-12 items-center justify-center rounded-control",
                  "px-inset-md text-base font-medium text-text-secondary",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                <Play aria-hidden className="mr-inline-xs h-4 w-4" />
                90-second tour
              </button>
            ) : null}
          </div>
        </div>
        <div className="hidden flex-1 md:block">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

/**
 * Placeholder hero visual. Renders a stylised "phone" surface with
 * tokenised gradient — no raw images, so it ships at zero bytes. Swap
 * for a real product screenshot when one exists.
 */
function HeroVisual() {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative mx-auto aspect-[3/4] w-full max-w-sm",
        "rounded-card border border-border bg-surface-sunken",
        "shadow-sm"
      )}
    >
      <div className="absolute inset-inset-md flex flex-col gap-stack-sm">
        <div className="h-3 w-24 rounded-pill bg-surface" />
        <div className="h-8 w-3/4 rounded-control bg-surface" />
        <div className="mt-stack-md flex flex-col gap-stack-xs">
          <div className="h-16 rounded-card bg-surface" />
          <div className="h-16 rounded-card bg-surface" />
          <div className="h-16 rounded-card bg-surface" />
        </div>
        <div className="mt-auto h-12 rounded-control bg-accent" />
      </div>
    </div>
  );
}
