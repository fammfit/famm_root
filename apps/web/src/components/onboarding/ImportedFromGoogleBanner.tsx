"use client";

import * as React from "react";
import { Sparkles, X } from "lucide-react";
import { Sheet, SheetHeader, SheetFooter, Button } from "@famm/ui";
import { cn } from "@/lib/cn";

interface ImportedFromGoogleBannerProps {
  /** When the user has overridden some imported values. */
  editedCount: number;
  onRestore: () => void;
  onDismiss?: () => void;
}

export function ImportedFromGoogleBanner({
  editedCount,
  onRestore,
  onDismiss,
}: ImportedFromGoogleBannerProps) {
  const [open, setOpen] = React.useState(true);
  const [confirming, setConfirming] = React.useState(false);

  if (!open) return null;

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "flex items-start gap-inline-sm rounded-card border border-border bg-accent-subtle px-inset-md py-inset-sm text-sm"
        )}
      >
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-accent"
        >
          <Sparkles aria-hidden className="h-4 w-4" />
        </span>
        <div className="flex flex-1 flex-col gap-stack-xs">
          <p className="font-medium text-text-primary">
            Imported from Google — review and edit before you continue.
          </p>
          {editedCount > 0 ? (
            <p className="text-xs text-text-secondary">
              You&rsquo;ve changed {editedCount} field{editedCount === 1 ? "" : "s"}.{" "}
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
              >
                Restore from Google
              </button>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            setOpen(false);
            onDismiss?.();
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded-control text-text-secondary transition-colors duration-fast ease-standard hover:bg-surface-sunken hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>
      <Sheet
        open={confirming}
        onClose={() => setConfirming(false)}
        side="center"
        ariaLabelledBy="restore-google-title"
      >
        <SheetHeader
          title="Restore from Google?"
          description="This will overwrite the fields you've changed with the imported values."
          onClose={() => setConfirming(false)}
          titleId="restore-google-title"
        />
        <SheetFooter>
          <Button variant="ghost" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setConfirming(false);
              onRestore();
            }}
          >
            Restore
          </Button>
        </SheetFooter>
      </Sheet>
    </>
  );
}
