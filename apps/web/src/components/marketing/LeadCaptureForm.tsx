"use client";

import * as React from "react";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { Button, FormField, Input } from "@famm/ui";
import { PublicApiError, submitLead, trackEvent } from "@/lib/api/public-marketing";
import { cn } from "@/lib/cn";

const EmailSchema = z.string().email();

interface LeadCaptureFormProps {
  promoSlug?: string;
  refCode?: string;
  className?: string;
  /** Override the success-state lockout window (seconds). Default 60. */
  lockoutSeconds?: number;
}

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "queued"; reason: "offline" | "rate_limited" | "thanks" };

const OFFLINE_QUEUE_KEY = "famm:lead-queue";

interface QueuedLead {
  email: string;
  promoSlug?: string;
  refCode?: string;
  queuedAt: number;
}

export function LeadCaptureForm({
  promoSlug,
  refCode,
  className,
  lockoutSeconds = 60,
}: LeadCaptureFormProps) {
  const [email, setEmail] = React.useState("");
  const [honeypot, setHoneypot] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<Status>({ kind: "idle" });
  const [lockoutLeft, setLockoutLeft] = React.useState(0);

  // Lockout countdown after a successful submit.
  React.useEffect(() => {
    if (lockoutLeft <= 0) return;
    const t = window.setTimeout(() => setLockoutLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [lockoutLeft]);

  // Flush queued leads when the browser comes back online.
  React.useEffect(() => {
    function flush() {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!raw) return;
      let queue: QueuedLead[] = [];
      try {
        queue = JSON.parse(raw) as QueuedLead[];
      } catch {
        window.localStorage.removeItem(OFFLINE_QUEUE_KEY);
        return;
      }
      if (queue.length === 0) return;
      void (async () => {
        const remaining: QueuedLead[] = [];
        for (const item of queue) {
          try {
            await submitLead({
              email: item.email,
              source: "new-trainer-offer",
              promoSlug: item.promoSlug,
              refCode: item.refCode,
              metadata: { offlineQueuedAt: item.queuedAt },
            });
          } catch {
            remaining.push(item);
          }
        }
        if (remaining.length === 0) {
          window.localStorage.removeItem(OFFLINE_QUEUE_KEY);
        } else {
          window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
        }
      })();
    }
    flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (honeypot.length > 0) {
      // Silently accept — don't tip the bot off.
      setStatus({ kind: "queued", reason: "thanks" });
      setLockoutLeft(lockoutSeconds);
      return;
    }

    const parsed = EmailSchema.safeParse(email.trim().toLowerCase());
    if (!parsed.success) {
      setError("Please enter a valid email.");
      return;
    }

    setStatus({ kind: "submitting" });

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      queueOffline({
        email: parsed.data,
        promoSlug,
        refCode,
        queuedAt: Date.now(),
      });
      trackEvent({
        name: "lead.submitted",
        payload: { ok: false, reason: "offline" },
      });
      setStatus({ kind: "queued", reason: "offline" });
      setLockoutLeft(lockoutSeconds);
      return;
    }

    try {
      const result = await submitLead({
        email: parsed.data,
        source: "new-trainer-offer",
        promoSlug,
        refCode,
      });
      trackEvent({
        name: "lead.submitted",
        payload: { ok: true, deduped: result.deduped },
      });
      setStatus({
        kind: "queued",
        reason: result.deduped ? "rate_limited" : "thanks",
      });
      setLockoutLeft(lockoutSeconds);
    } catch (err) {
      const apiErr = err instanceof PublicApiError ? err : null;
      // 429 path doesn't leak the window — we present it as "we already
      // have you down".
      if (apiErr?.status === 429) {
        trackEvent({
          name: "lead.submitted",
          payload: { ok: false, reason: "rate_limited" },
        });
        setStatus({ kind: "queued", reason: "rate_limited" });
        setLockoutLeft(lockoutSeconds);
        return;
      }
      setStatus({ kind: "idle" });
      setError("We couldn't save that. Try again in a moment.");
    }
  }

  if (status.kind === "queued") {
    return (
      <SuccessState
        reason={status.reason}
        lockoutLeft={lockoutLeft}
        onReset={() => {
          setEmail("");
          setStatus({ kind: "idle" });
        }}
        className={className}
      />
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-stack-sm", className)}
      noValidate
    >
      <FormField
        label="Email me when I'm ready"
        hint="No card, no spam. One reminder when the offer is about to end."
      >
        <Input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </FormField>

      {/* Honeypot — visually hidden, tab-skipped. Bots fill it; humans don't. */}
      <label className="sr-only" aria-hidden="true">
        Company
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </label>

      {error ? (
        <p role="alert" className="text-sm text-signal-danger">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        loading={status.kind === "submitting"}
        disabled={status.kind === "submitting"}
        className="w-full"
      >
        Save my spot
      </Button>
    </form>
  );
}

function SuccessState({
  reason,
  lockoutLeft,
  onReset,
  className,
}: {
  reason: "offline" | "rate_limited" | "thanks";
  lockoutLeft: number;
  onReset: () => void;
  className?: string;
}) {
  const message =
    reason === "offline"
      ? "Saved — we'll send when you're back online."
      : reason === "rate_limited"
        ? "Looks like you already signed up — we'll be in touch."
        : "Got it — check your inbox in a minute.";
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center gap-stack-sm rounded-card border border-border bg-surface p-inset-md text-center",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="flex h-10 w-10 items-center justify-center rounded-card bg-signal-success/10 text-signal-success"
      >
        <CheckCircle2 aria-hidden className="h-5 w-5" />
      </span>
      <p className="text-sm font-medium text-text-primary">{message}</p>
      {lockoutLeft <= 0 ? (
        <button
          type="button"
          onClick={onReset}
          className="text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
        >
          Use a different email
        </button>
      ) : (
        <span className="text-xs text-text-muted">Try again in {lockoutLeft}s</span>
      )}
    </div>
  );
}

function queueOffline(item: QueuedLead) {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
  let queue: QueuedLead[] = [];
  if (raw) {
    try {
      queue = JSON.parse(raw) as QueuedLead[];
    } catch {
      queue = [];
    }
  }
  queue.push(item);
  window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}
