"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@famm/ui";
import { PublicShell } from "@/components/layouts/PublicShell";

interface PageErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function NewTrainerOfferError({ error, reset }: PageErrorProps) {
  useEffect(() => {
    console.error("[new-trainer-offer] render error", error);
  }, [error]);

  return (
    <PublicShell signedInRole={null}>
      <div className="flex min-h-[60vh] items-center justify-center px-inset-md py-stack-xl">
        <ErrorState
          title="We couldn't load this page"
          description="Refresh in a moment. If it keeps happening, you can still sign in."
          onRetry={reset}
          secondaryAction={
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-control border border-border bg-surface px-inset-md text-sm font-medium text-text-primary transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              Sign in
            </Link>
          }
        />
      </div>
    </PublicShell>
  );
}
