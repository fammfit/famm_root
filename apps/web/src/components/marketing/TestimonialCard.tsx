import * as React from "react";
import { Star } from "lucide-react";
import { Card } from "@famm/ui";
import type { Testimonial } from "@/lib/marketing/testimonials";

export function TestimonialCard({ testimonial: t }: { testimonial: Testimonial }) {
  return (
    <Card className="flex h-full flex-col gap-stack-sm p-inset-md">
      {t.rating ? (
        <div
          aria-label={`Rated ${t.rating} out of 5`}
          className="flex items-center gap-inline-xs text-signal-warning"
        >
          {Array.from({ length: t.rating }).map((_, i) => (
            <Star key={i} aria-hidden className="h-4 w-4 fill-current" />
          ))}
        </div>
      ) : null}
      <blockquote className="text-base leading-relaxed text-text-primary">
        &ldquo;{t.quote}&rdquo;
      </blockquote>
      <footer className="flex flex-col gap-stack-xs">
        <span className="text-sm font-semibold text-text-primary">{t.name}</span>
        <span className="text-xs text-text-secondary">{t.title}</span>
      </footer>
    </Card>
  );
}
