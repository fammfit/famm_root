"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

export type SheetSide = "bottom" | "center";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Accessible label for the dialog. */
  ariaLabel?: string;
  /** Accessible labelled-by id (use either `ariaLabel` or this). */
  ariaLabelledBy?: string;
  /** `bottom` slides up from the safe-area floor (mobile); `center` is a regular modal. */
  side?: SheetSide;
  /** Click-outside / Esc close behavior. Default: true. */
  dismissible?: boolean;
  /** Optional class for the panel. */
  className?: string;
  children: React.ReactNode;
}

const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * L2 — minimal accessible sheet/modal.
 *   - Portal to <body> so it escapes parent overflow.
 *   - Focus trapped while open; ESC and overlay click close (unless dismissible=false).
 *   - `side="bottom"` slides from the safe-area floor on mobile; `side="center"` is a centered modal.
 *
 * Caller renders SheetHeader/SheetBody/SheetFooter (or any content). The sheet
 * is opinionated about chrome only — backdrop, focus, dismissal.
 */
export function Sheet({
  open,
  onClose,
  ariaLabel,
  ariaLabelledBy,
  side = "bottom",
  dismissible = true,
  className,
  children,
}: SheetProps) {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  // Focus management.
  React.useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    if (!panel) return;
    const first = panel.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel).focus();
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  // Lock body scroll while open.
  React.useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape" && dismissible) {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div role="presentation" className="fixed inset-0 z-50 flex" onKeyDown={handleKeyDown}>
      <button
        type="button"
        aria-label={dismissible ? "Close" : undefined}
        tabIndex={-1}
        onClick={() => {
          if (dismissible) onClose();
        }}
        className={cn(
          "absolute inset-0 bg-text-primary/30 transition-opacity duration-fast ease-standard",
          dismissible ? "cursor-pointer" : "cursor-default"
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabelledBy ? undefined : ariaLabel}
        aria-labelledby={ariaLabelledBy}
        tabIndex={-1}
        className={cn(
          "relative flex w-full flex-col bg-surface text-text-primary shadow-lg",
          "focus-visible:outline-none",
          side === "bottom"
            ? "mt-auto rounded-t-card max-h-[90vh] pb-[env(safe-area-inset-bottom)]"
            : "m-auto max-w-md rounded-card max-h-[90vh]",
          className
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

// ── Composable sub-parts ─────────────────────────────────────────────────

export function SheetHeader({
  title,
  description,
  onClose,
  titleId,
  showClose = true,
}: {
  title: string;
  description?: string;
  onClose?: () => void;
  titleId?: string;
  showClose?: boolean;
}) {
  return (
    <header className="flex items-start gap-inline-sm border-b border-border p-inset-md">
      <div className="flex flex-1 flex-col gap-stack-xs">
        <h2 id={titleId} className="text-base font-semibold text-text-primary">
          {title}
        </h2>
        {description ? <p className="text-sm text-text-secondary">{description}</p> : null}
      </div>
      {showClose && onClose ? (
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-control text-text-secondary transition-colors duration-fast ease-standard hover:bg-surface-sunken hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      ) : null}
    </header>
  );
}

export function SheetBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex-1 overflow-y-auto p-inset-md", className)}>{children}</div>;
}

export function SheetFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <footer
      className={cn(
        "flex flex-col-reverse gap-inline-sm border-t border-border p-inset-md sm:flex-row sm:justify-end",
        className
      )}
    >
      {children}
    </footer>
  );
}
