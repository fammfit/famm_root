import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { LeadCaptureForm } from "./LeadCaptureForm";

interface FinalCtaBandProps {
  primaryCta: { label: string; href: string };
  promoSlug?: string;
  refCode?: string;
  /** When true, hide the lead form (e.g. user is already signed in). */
  hideLeadCapture?: boolean;
}

export function FinalCtaBand({
  primaryCta,
  promoSlug,
  refCode,
  hideLeadCapture = false,
}: FinalCtaBandProps) {
  return (
    <section aria-labelledby="final-cta-heading" className="bg-accent text-onAccent">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-stack-lg px-inset-md py-stack-xl md:flex-row md:items-center md:justify-between md:px-inset-lg md:py-stack-2xl">
        <div className="flex max-w-prose flex-col gap-stack-sm">
          <h2 id="final-cta-heading" className="text-2xl font-semibold md:text-3xl">
            Run your business from the gym floor.
          </h2>
          <p className="text-base opacity-90">30 days free. No card. Set up in under 10 minutes.</p>
          <div>
            <Link
              href={primaryCta.href}
              className={cn(
                "inline-flex h-12 items-center justify-center rounded-control",
                "bg-surface px-inset-lg text-base font-medium text-text-primary",
                "transition-colors duration-fast ease-standard hover:bg-surface-sunken",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-accent"
              )}
            >
              {primaryCta.label}
            </Link>
          </div>
        </div>

        {!hideLeadCapture ? (
          <div className="w-full max-w-sm rounded-card bg-surface p-inset-md text-text-primary">
            <LeadCaptureForm promoSlug={promoSlug} refCode={refCode} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
