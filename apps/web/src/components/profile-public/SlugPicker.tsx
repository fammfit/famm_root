"use client";

import * as React from "react";
import { Check, AlertCircle, Copy, RotateCcw, Loader2 } from "lucide-react";
import { Input } from "@famm/ui";
import { cn } from "@/lib/cn";
import { checkSlugAvailability } from "@/lib/api/business";

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "available" }
  | { kind: "taken" }
  | { kind: "reserved" }
  | { kind: "invalid"; message: string }
  | { kind: "error" };

export interface SlugPickerProps {
  /** Current slug value (without the URL prefix). */
  value: string;
  /** Auto-suggested slug — re-applied when the user taps "Regenerate". */
  suggestion: string;
  /** Update the slug. */
  onChange: (next: string) => void;
  /** The trainer's existing saved slug — always reported available to themselves. */
  ownCurrentSlug: string;
  /** Public base URL displayed in front of the slug. */
  basePrefix: string;
  /** Bubble availability state to the parent for Continue gating. */
  onAvailabilityChange?: (available: boolean) => void;
}

const DEBOUNCE_MS = 250;
const SLUG_RE = /^[a-z][a-z0-9-]{2,29}$/;

function sanitize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "")
    .slice(0, 30);
}

export function SlugPicker({
  value,
  suggestion,
  onChange,
  ownCurrentSlug,
  basePrefix,
  onAvailabilityChange,
}: SlugPickerProps) {
  const [touched, setTouched] = React.useState<boolean>(value !== suggestion);
  const [status, setStatus] = React.useState<Status>({ kind: "idle" });
  const [copyOk, setCopyOk] = React.useState(false);

  // Auto-derive while untouched.
  React.useEffect(() => {
    if (!touched && suggestion && suggestion !== value) {
      onChange(suggestion);
    }
  }, [touched, suggestion, value, onChange]);

  // Debounced availability check.
  React.useEffect(() => {
    if (value.length === 0) {
      setStatus({ kind: "idle" });
      onAvailabilityChange?.(false);
      return;
    }
    if (value === ownCurrentSlug) {
      setStatus({ kind: "available" });
      onAvailabilityChange?.(true);
      return;
    }
    if (!SLUG_RE.test(value) || /--/.test(value) || value.endsWith("-")) {
      setStatus({
        kind: "invalid",
        message:
          "Use 3–30 lowercase letters, digits, or dashes. Start with a letter; no double or trailing dashes.",
      });
      onAvailabilityChange?.(false);
      return;
    }
    setStatus({ kind: "checking" });
    onAvailabilityChange?.(false);
    let cancelled = false;
    const t = window.setTimeout(() => {
      void checkSlugAvailability(value)
        .then((res) => {
          if (cancelled) return;
          if (res.available) {
            setStatus({ kind: "available" });
            onAvailabilityChange?.(true);
            return;
          }
          const reason = res.reason ?? "taken";
          if (reason === "taken") setStatus({ kind: "taken" });
          else if (reason === "reserved") setStatus({ kind: "reserved" });
          else setStatus({ kind: "invalid", message: "That link won't work" });
          onAvailabilityChange?.(false);
        })
        .catch(() => {
          if (cancelled) return;
          setStatus({ kind: "error" });
          onAvailabilityChange?.(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [value, ownCurrentSlug, onAvailabilityChange]);

  async function copyLink() {
    const fullUrl = `${basePrefix}${value}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopyOk(true);
      window.setTimeout(() => setCopyOk(false), 1500);
    } catch {
      // Fallback: select the preview text so the user can copy by hand.
      setCopyOk(false);
    }
  }

  function handleInputChange(next: string) {
    setTouched(true);
    onChange(sanitize(next));
  }

  function regenerate() {
    setTouched(false);
    onChange(suggestion);
  }

  return (
    <div className="flex flex-col gap-stack-xs">
      <label htmlFor="slug-input" className="text-sm font-medium text-text-secondary">
        Your booking link
      </label>
      <div className="flex flex-col gap-stack-xs sm:flex-row sm:items-stretch">
        <span
          aria-hidden="true"
          className="inline-flex h-10 items-center rounded-control border border-border bg-surface-sunken px-inset-sm text-sm text-text-secondary"
        >
          {basePrefix}
        </span>
        <Input
          id="slug-input"
          name="slug"
          aria-describedby="slug-status slug-preview"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="your-business"
          required
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-inline-sm">
        <p
          id="slug-status"
          role="status"
          aria-live="polite"
          className={cn(
            "inline-flex items-center gap-inline-xs text-xs font-medium",
            status.kind === "available" && "text-signal-success",
            status.kind === "checking" && "text-text-secondary",
            (status.kind === "taken" ||
              status.kind === "reserved" ||
              status.kind === "invalid" ||
              status.kind === "error") &&
              "text-signal-danger",
            status.kind === "idle" && "text-text-muted"
          )}
        >
          {status.kind === "checking" ? (
            <>
              <Loader2 aria-hidden className="h-3 w-3 animate-spin" />
              Checking…
            </>
          ) : status.kind === "available" ? (
            <>
              <Check aria-hidden className="h-3 w-3" />
              Available
            </>
          ) : status.kind === "taken" ? (
            <>
              <AlertCircle aria-hidden className="h-3 w-3" />
              Taken — try another
            </>
          ) : status.kind === "reserved" ? (
            <>
              <AlertCircle aria-hidden className="h-3 w-3" />
              That word is reserved
            </>
          ) : status.kind === "invalid" ? (
            <>
              <AlertCircle aria-hidden className="h-3 w-3" />
              {status.message}
            </>
          ) : status.kind === "error" ? (
            <>
              <AlertCircle aria-hidden className="h-3 w-3" />
              Couldn&rsquo;t check — try again
            </>
          ) : (
            "Pick something memorable."
          )}
        </p>
        {!touched ? null : (
          <button
            type="button"
            onClick={regenerate}
            className="inline-flex items-center gap-inline-xs text-xs font-medium text-text-secondary underline-offset-4 hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:underline"
          >
            <RotateCcw aria-hidden className="h-3 w-3" />
            Regenerate suggestion
          </button>
        )}
      </div>
      {value.length > 0 ? (
        <div
          id="slug-preview"
          className="flex flex-wrap items-center justify-between gap-inline-sm rounded-card border border-border bg-surface-sunken px-inset-sm py-1 text-xs"
        >
          <span className="truncate font-mono text-text-secondary">
            {basePrefix}
            <strong className="text-text-primary">{value}</strong>
          </span>
          <button
            type="button"
            onClick={copyLink}
            aria-label="Copy booking link"
            className="inline-flex items-center gap-inline-xs rounded-control px-inset-xs text-xs font-medium text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:underline"
          >
            <Copy aria-hidden className="h-3 w-3" />
            {copyOk ? "Copied" : "Copy"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
