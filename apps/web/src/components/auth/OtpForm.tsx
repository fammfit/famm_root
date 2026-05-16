"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, FormField, Input } from "@famm/ui";
import { AuthApiError, requestSmsOtp, verifySmsOtp } from "@/lib/api/auth";

interface OtpFormProps {
  /** Phone number the OTP was sent to. Required. */
  phone: string;
  /** Tenant slug. Required for verify. */
  tenantSlug: string;
  /** Where to navigate after a successful verify. Defaults to `/`. Ignored when `onSuccess` is supplied. */
  next?: string;
  /**
   * Called after the OTP verifies successfully. When supplied, the form
   * does not navigate — the parent decides what to do (e.g. close a
   * verify Sheet without leaving the page).
   */
  onSuccess?: () => void;
}

const RESEND_COOLDOWN_SEC = 30;

export function OtpForm({ phone, tenantSlug, next = "/", onSuccess }: OtpFormProps) {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "submitting">("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [resendStatus, setResendStatus] = React.useState<"idle" | "sending" | "sent">("idle");
  const [resendCooldown, setResendCooldown] = React.useState(0);

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (code.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setStatus("submitting");
    try {
      await verifySmsOtp({ phone, code, tenantSlug });
      // Cookies set server-side; Next router will see them on next nav.
      if (onSuccess) {
        onSuccess();
        return;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setStatus("idle");
      if (err instanceof AuthApiError) {
        if (err.code === "MAX_ATTEMPTS_EXCEEDED") {
          setError("Too many tries on this code. Request a new one to continue.");
        } else if (err.code === "RATE_LIMITED") {
          setError("Too many attempts. Please wait and try again.");
        } else {
          setError("That code didn't match. Double-check and try again.");
        }
      } else {
        setError("Something went wrong. Check your connection and try again.");
      }
    }
  }

  async function handleResend() {
    if (resendStatus === "sending" || resendCooldown > 0) return;
    setResendStatus("sending");
    setError(null);
    try {
      await requestSmsOtp({ phone, tenantSlug });
      setResendStatus("sent");
      setResendCooldown(RESEND_COOLDOWN_SEC);
    } catch (err) {
      setResendStatus("idle");
      setError(
        err instanceof AuthApiError
          ? err.message
          : "Couldn't send another code. Try again in a moment."
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-stack-md" noValidate>
      <FormField label="Verification code" hint={`Sent to ${maskPhone(phone)}.`}>
        <Input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          required
        />
      </FormField>

      {error ? (
        <p role="alert" className="text-sm text-signal-danger">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        loading={status === "submitting"}
        disabled={status === "submitting" || code.length !== 6}
        className="w-full"
      >
        Verify and sign in
      </Button>

      <div className="flex items-center justify-center gap-inline-xs text-sm">
        <span className="text-text-secondary">Didn&rsquo;t get it?</span>
        <button
          type="button"
          onClick={handleResend}
          disabled={resendStatus === "sending" || resendCooldown > 0}
          className="font-medium text-accent underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-text-muted disabled:no-underline focus-visible:outline-none focus-visible:underline"
        >
          {resendCooldown > 0
            ? `Resend in ${resendCooldown}s`
            : resendStatus === "sending"
              ? "Sending…"
              : resendStatus === "sent"
                ? "Sent — check your phone"
                : "Send a new code"}
        </button>
      </div>
    </form>
  );
}

function maskPhone(phone: string): string {
  // Show only the last 4 digits in the UI.
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return `••• ••• ${digits.slice(-4)}`;
}
