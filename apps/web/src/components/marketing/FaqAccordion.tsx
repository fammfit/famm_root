"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { FAQ } from "@/lib/marketing/faq";
import { trackEvent } from "@/lib/api/public-marketing";
import { cn } from "@/lib/cn";

/**
 * Native <details>/<summary> for zero-JS keyboard + screen-reader
 * compatibility. The "use client" boundary is here only so we can fire a
 * single analytics event on first open per question.
 */
export function FaqAccordion() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="border-t border-border bg-surface">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-stack-lg px-inset-md py-stack-xl md:py-stack-2xl">
        <header className="flex flex-col gap-stack-xs">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Questions</p>
          <h2 id="faq-heading" className="text-2xl font-semibold text-text-primary md:text-3xl">
            Things trainers ask first.
          </h2>
        </header>
        <ul className="flex flex-col gap-stack-xs">
          {FAQ.map((q) => (
            <li key={q.id}>
              <FaqItem id={q.id} question={q.question} answer={q.answer} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FaqItem({ id, question, answer }: { id: string; question: string; answer: string }) {
  const seenRef = React.useRef(false);
  return (
    <details
      className={cn(
        "group rounded-card border border-border bg-surface",
        "transition-colors duration-fast ease-standard hover:bg-surface-sunken/40"
      )}
      onToggle={(e) => {
        if ((e.target as HTMLDetailsElement).open && !seenRef.current) {
          seenRef.current = true;
          trackEvent({ name: "faq.open", payload: { id } });
        }
      }}
    >
      <summary
        className={cn(
          "flex min-h-11 cursor-pointer list-none items-center justify-between gap-inline-sm",
          "px-inset-md py-inset-sm text-left text-base font-medium text-text-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
          "[&::-webkit-details-marker]:hidden"
        )}
      >
        <span>{question}</span>
        <span
          aria-hidden="true"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-surface-sunken text-text-secondary transition-transform duration-fast ease-standard group-open:rotate-45"
        >
          <Plus aria-hidden className="h-4 w-4" />
        </span>
      </summary>
      <div className="px-inset-md pb-inset-md pt-0 text-sm text-text-secondary">{answer}</div>
    </details>
  );
}
