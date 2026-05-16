"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@famm/ui";

interface FlowErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function OnboardingFlowError({ error, reset }: FlowErrorProps) {
  useEffect(() => {
    console.error("[onboarding] render error", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-inset-md">
      <ErrorState
        title="We couldn't load your setup"
        description="Your progress is safe. Try again, or jump back to your dashboard."
        onRetry={reset}
        secondaryAction={
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-control border border-border bg-surface px-inset-md text-sm font-medium text-text-primary transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Back to dashboard
          </Link>
        }
      />
    </div>
  );
}
