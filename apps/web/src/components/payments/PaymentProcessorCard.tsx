"use client";

import * as React from "react";
import { Button, Card, Badge } from "@famm/ui";
import { VerificationBadge } from "@/components/profile/VerificationBadge";

export type PaymentProcessor = "stripe" | "square";

export type PaymentProcessorState = "not_connected" | "connected" | "coming_soon";

export interface PaymentProcessorCardProps {
  provider: PaymentProcessor;
  state: PaymentProcessorState;
  /** Connected account email (state === "connected"). */
  connectedAs?: string;
  /** Disabled connect (offline / non-owner). */
  disabled?: boolean;
  /** Reason copy when disabled. */
  disabledReason?: string;
  /** "Set up payments" → POST /connect → redirect. */
  onConnect?: () => void;
  onDisconnect?: () => void;
  connecting?: boolean;
  disconnecting?: boolean;
}

const PROVIDER_NAME: Record<PaymentProcessor, string> = {
  stripe: "Stripe",
  square: "Square",
};

const PROVIDER_DESCRIPTION: Record<PaymentProcessor, string> = {
  stripe: "Hosted onboarding handles ID + bank account. About 5 minutes.",
  square: "Coming in a later release. Stripe is the v1 payment processor.",
};

const PROVIDER_INITIAL: Record<PaymentProcessor, string> = {
  stripe: "S",
  square: "□",
};

export function PaymentProcessorCard({
  provider,
  state,
  connectedAs,
  disabled = false,
  disabledReason,
  onConnect,
  onDisconnect,
  connecting = false,
  disconnecting = false,
}: PaymentProcessorCardProps) {
  const name = PROVIDER_NAME[provider];
  const description = PROVIDER_DESCRIPTION[provider];
  const initial = PROVIDER_INITIAL[provider];

  const isComingSoon = state === "coming_soon";
  const isConnected = state === "connected";

  return (
    <Card
      aria-disabled={isComingSoon || undefined}
      className="flex flex-col gap-stack-sm p-inset-md"
    >
      <header className="flex items-start gap-inline-sm">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card border border-border bg-surface text-base font-semibold text-text-primary"
        >
          {initial}
        </span>
        <div className="flex flex-1 flex-col gap-stack-xs">
          <div className="flex flex-wrap items-center gap-inline-xs">
            <h3 className="text-base font-semibold text-text-primary">{name}</h3>
            {isComingSoon ? <Badge variant="secondary">Coming soon</Badge> : null}
          </div>
          <p className="text-sm text-text-secondary">{description}</p>
        </div>
      </header>

      {isConnected ? (
        <div className="flex flex-col gap-stack-xs">
          <div className="flex flex-wrap items-center gap-inline-sm">
            <span className="text-sm text-text-secondary">Connected as</span>
            <span className="text-sm font-medium text-text-primary">{connectedAs}</span>
            <VerificationBadge verified />
          </div>
          {onDisconnect ? (
            <button
              type="button"
              onClick={onDisconnect}
              disabled={disconnecting || disabled}
              className="self-start text-sm font-medium text-text-secondary underline-offset-4 hover:text-signal-danger hover:underline focus-visible:outline-none focus-visible:underline disabled:cursor-not-allowed"
            >
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </button>
          ) : null}
        </div>
      ) : isComingSoon ? null : (
        <div className="flex flex-col gap-stack-xs">
          <Button
            type="button"
            size="lg"
            onClick={onConnect}
            loading={connecting}
            disabled={disabled || connecting}
          >
            Set up payments
          </Button>
          {disabled && disabledReason ? (
            <p className="text-xs text-text-muted">{disabledReason}</p>
          ) : null}
        </div>
      )}
    </Card>
  );
}
