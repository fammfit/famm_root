"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, CheckCircle2 } from "lucide-react";
import { Button, FormField, Input } from "@famm/ui";
import { cn } from "@/lib/cn";
import { AuthApiError, requestMagicLink, requestSmsOtp } from "@/lib/api/auth";

type Method = "email" | "phone";

interface LoginFormProps {
  /** Pre-resolved tenant slug (from query / env). null asks the user. */
  tenantSlug: string | null;
  /** Path to send the user to after they sign in (preserved through OTP). */
  next?: string;
}

export function LoginForm({ tenantSlug: initialSlug, next }: LoginFormProps) {
  const router = useRouter();
  const [method, setMethod] = React.useState<Method>("email");
  const [tenantSlug, setTenantSlug] = React.useState(initialSlug ?? "");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = React.useState<string | null>(null);

  const slugLocked = Boolean(initialSlug);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!tenantSlug) {
      setError("Please enter your studio.");
      return;
    }
    setStatus("sending");
    try {
      if (method === "email") {
        await requestMagicLink({ email: email.trim(), tenantSlug });
        setStatus("sent");
      } else {
        await requestSmsOtp({ phone: phone.trim(), tenantSlug });
        const params = new URLSearchParams({ phone: phone.trim(), tenant: tenantSlug });
        if (next) params.set("next", next);
        router.push(`/verify/sms?${params.toString()}`);
      }
    } catch (err) {
      setStatus("idle");
      if (err instanceof AuthApiError) {
        if (err.code === "RATE_LIMITED") {
          setError("Too many attempts. Please wait a minute and try again.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Something went wrong. Check your connection and try again.");
      }
    }
  }

  if (method === "email" && status === "sent") {
    return (
      <div className="flex flex-col items-center gap-stack-md text-center">
        <div
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-card bg-signal-success/10 text-signal-success"
        >
          <CheckCircle2 aria-hidden className="h-6 w-6" />
        </div>
        <div className="flex flex-col gap-stack-xs">
          <h2 className="text-base font-semibold text-text-primary">Check your inbox</h2>
          <p className="text-sm text-text-secondary">
            We sent a sign-in link to <strong>{email}</strong>. Open it on this device to continue.
          </p>
          <p className="text-xs text-text-muted">
            Link expires in 15 minutes. Tip: also check spam.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setError(null);
          }}
          className="text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-stack-md" noValidate>
      <MethodTabs
        method={method}
        onChange={(m) => {
          setMethod(m);
          setError(null);
        }}
      />

      {!slugLocked ? (
        <FormField label="Studio" hint="Your trainer's FAMM workspace.">
          <Input
            name="tenantSlug"
            autoComplete="organization"
            placeholder="acme-fitness"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            required
          />
        </FormField>
      ) : null}

      {method === "email" ? (
        <FormField label="Email" hint="We'll email you a one-tap sign-in link.">
          <Input
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </FormField>
      ) : (
        <FormField label="Phone" hint="We'll text you a 6-digit code.">
          <Input
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="+15551234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </FormField>
      )}

      {error ? (
        <p role="alert" className="text-sm text-signal-danger">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        loading={status === "sending"}
        disabled={status === "sending"}
        className="w-full"
      >
        {method === "email" ? "Email me a link" : "Text me a code"}
      </Button>
    </form>
  );
}

function MethodTabs({ method, onChange }: { method: Method; onChange: (m: Method) => void }) {
  const tabs: Array<{ key: Method; label: string; icon: React.ReactNode }> = [
    { key: "email", label: "Email", icon: <Mail aria-hidden className="h-4 w-4" /> },
    { key: "phone", label: "Phone", icon: <Phone aria-hidden className="h-4 w-4" /> },
  ];
  return (
    <div
      role="tablist"
      aria-label="Sign-in method"
      className="inline-flex w-full items-center rounded-pill border border-border bg-surface p-1"
    >
      {tabs.map((t) => {
        const active = t.key === method;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={cn(
              "inline-flex h-9 flex-1 items-center justify-center gap-inline-xs rounded-pill px-inset-sm text-sm font-medium",
              "transition-colors duration-fast ease-standard",
              active ? "bg-accent text-onAccent" : "text-text-secondary hover:text-text-primary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            )}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
