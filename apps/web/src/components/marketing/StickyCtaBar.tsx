"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { SafeAreaInset } from "@/components/nav/SafeAreaInset";
import { trackEvent } from "@/lib/api/public-marketing";

interface StickyCtaBarProps {
  primary: { label: string; href: string };
  /** A selector for the in-flow hero CTA. The bar hides while the hero CTA is visible. */
  heroCtaSelector?: string;
}

/**
 * Mobile-only sticky bottom CTA. Hides when the hero CTA is in the
 * viewport (avoids stacked CTAs), reappears on scroll.
 *
 * Desktop: hidden via Tailwind `md:hidden`.
 */
export function StickyCtaBar({
  primary,
  heroCtaSelector = '[data-cta="hero-primary"]',
}: StickyCtaBarProps) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const target = document.querySelector(heroCtaSelector);
    if (!target) {
      // No hero CTA on the page — show the sticky immediately.
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        setVisible(!entry.isIntersecting);
      },
      // Trigger "not intersecting" 25% before the hero CTA hits the
      // bottom of the viewport so the sticky bar appears with breathing
      // room rather than at the very last pixel.
      { rootMargin: "0% 0% -25% 0%" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [heroCtaSelector]);

  return (
    <SafeAreaInset
      as="div"
      edges={["bottom", "left", "right"]}
      aria-hidden={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 md:hidden",
        "border-t border-border bg-surface",
        "transition-transform duration-fast ease-standard",
        visible ? "translate-y-0" : "translate-y-full"
      )}
    >
      <div className="flex items-center gap-inline-sm px-inset-md py-inset-sm">
        <Link
          href={primary.href}
          onClick={() =>
            trackEvent({
              name: "cta.click",
              payload: { surface: "sticky-cta" },
            })
          }
          tabIndex={visible ? 0 : -1}
          className={cn(
            "inline-flex h-12 flex-1 items-center justify-center rounded-control",
            "bg-accent px-inset-md text-base font-medium text-onAccent",
            "transition-colors duration-fast ease-standard hover:bg-accent-hover",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          )}
        >
          {primary.label}
        </Link>
      </div>
    </SafeAreaInset>
  );
}
