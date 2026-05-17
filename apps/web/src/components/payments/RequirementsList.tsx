import * as React from "react";
import { ExternalLink, Dot } from "lucide-react";
import { dedupeRequirementLabels } from "@/lib/payments/requirement-labels";
import type { StripeAccountRequirement } from "@/lib/integrations/types";

export interface RequirementsListProps {
  requirements: ReadonlyArray<StripeAccountRequirement>;
  /** Link target — fresh AccountLink from the server. */
  finishUrl: string;
}

export function RequirementsList({ requirements, finishUrl }: RequirementsListProps) {
  const items = dedupeRequirementLabels(requirements);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="requirements-heading" className="flex flex-col gap-stack-sm">
      <h3 id="requirements-heading" className="text-sm font-semibold text-text-primary">
        Still needed
      </h3>
      <ul className="flex flex-col gap-stack-xs">
        {items.map((req) => (
          <li
            key={req.field}
            className="flex items-start gap-inline-xs text-sm text-text-secondary"
          >
            <Dot aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
            <span>{req.label}</span>
          </li>
        ))}
      </ul>
      <a
        href={finishUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-10 w-fit items-center justify-center gap-inline-xs rounded-control bg-accent px-inset-md text-sm font-medium text-onAccent transition-colors duration-fast ease-standard hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        Finish on Stripe
        <ExternalLink aria-hidden className="h-3 w-3" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </section>
  );
}
