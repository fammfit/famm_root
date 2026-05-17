"use client";

import * as React from "react";
import { Button } from "@famm/ui";

export interface SaveBarProps {
  /** Show only when there are dirty changes (or a mutation is in flight). */
  visible: boolean;
  onSave: () => void;
  onDiscard: () => void;
  isSaving: boolean;
  /** Saved confirmation copy auto-fades after a beat. */
  savedAt?: number | null;
  /** Optional error message. */
  errorMessage?: string | null;
}

const FADE_MS = 2200;

export function SaveBar({
  visible,
  onSave,
  onDiscard,
  isSaving,
  savedAt,
  errorMessage,
}: SaveBarProps) {
  const [savedVisible, setSavedVisible] = React.useState(false);

  React.useEffect(() => {
    if (!savedAt) return;
    setSavedVisible(true);
    const t = setTimeout(() => setSavedVisible(false), FADE_MS);
    return () => clearTimeout(t);
  }, [savedAt]);

  if (!visible && !savedVisible && !errorMessage) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky bottom-0 z-10 -mx-inset-md mt-stack-sm flex flex-wrap items-center justify-between gap-inline-sm border-t border-border bg-surface/95 px-inset-md py-inset-sm backdrop-blur"
    >
      <p className="text-sm text-text-secondary">
        {isSaving
          ? "Saving…"
          : errorMessage
            ? errorMessage
            : savedVisible
              ? "Saved"
              : "Unsaved changes"}
      </p>
      <div className="flex items-center gap-inline-xs">
        <Button variant="ghost" size="md" onClick={onDiscard} disabled={isSaving}>
          Discard
        </Button>
        <Button onClick={onSave} loading={isSaving} disabled={!visible || isSaving}>
          Save
        </Button>
      </div>
    </div>
  );
}
