import * as React from "react";
import { TestimonialCard } from "./TestimonialCard";
import { TESTIMONIALS } from "@/lib/marketing/testimonials";
import { cn } from "@/lib/cn";

/**
 * Testimonials row.
 *   - Mobile: horizontal snap-scroll (native, no animation requiring
 *     prefers-reduced-motion gating).
 *   - md+: 3-column grid.
 *
 * Server component — no interaction beyond native scroll.
 */
export function TestimonialsCarousel() {
  return (
    <section aria-labelledby="testimonials-heading" className="border-t border-border bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-stack-lg px-inset-md py-stack-xl md:px-inset-lg md:py-stack-2xl">
        <header className="flex flex-col gap-stack-xs">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Word of mouth
          </p>
          <h2
            id="testimonials-heading"
            className="text-2xl font-semibold text-text-primary md:text-3xl"
          >
            From trainers running real businesses.
          </h2>
        </header>
        <div
          aria-roledescription="carousel"
          aria-label="Trainer testimonials"
          className={cn(
            "-mx-inset-md overflow-x-auto md:mx-0 md:overflow-visible",
            "snap-x snap-mandatory scroll-px-inset-md [&::-webkit-scrollbar]:hidden"
          )}
        >
          <ul
            className={cn(
              "flex gap-stack-sm px-inset-md md:grid md:grid-cols-3 md:gap-stack-md md:px-0"
            )}
          >
            {TESTIMONIALS.map((t) => (
              <li key={t.id} className="w-[85%] shrink-0 snap-center md:w-auto">
                <TestimonialCard testimonial={t} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
