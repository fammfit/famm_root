"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

const SESSION_KEY = "famm:onboarding:resume-seen";

export function OnboardingResumeBanner({ message }: { message: string }) {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(SESSION_KEY) === "1") return;
    setShow(true);
  }, []);

  function dismiss() {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "mx-auto mt-stack-sm flex max-w-3xl items-start gap-inline-sm rounded-card border border-border bg-accent-subtle px-inset-md py-inset-sm text-sm text-text-primary"
      )}
    >
      <p className="flex-1">{message}</p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="inline-flex h-7 w-7 items-center justify-center rounded-control text-text-secondary transition-colors duration-fast ease-standard hover:bg-surface-sunken hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        <X aria-hidden className="h-4 w-4" />
      </button>
    </div>
  );
}
