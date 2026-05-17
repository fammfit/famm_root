"use client";

import * as React from "react";
import { Button, Card } from "@famm/ui";
import { VerificationBadge } from "@/components/profile/VerificationBadge";

export interface GoogleConnectCardProps {
  /** Display label e.g. "Connect Google Business". */
  title: string;
  /** One-line explainer. */
  description: string;
  /** Either: not connected yet. */
  connected?: false;
  /** Or: connected — show the account email and a disconnect link. */
  connectedAs?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  connecting?: boolean;
  disconnecting?: boolean;
  disabled?: boolean;
  /** When disabled because we're offline. */
  offlineHint?: string;
}

/**
 * Reusable connect/disconnect card for any Google-flavoured OAuth surface
 * (Business Profile here; Calendar in step 5 will reuse it). Anchors the
 * "G" brand mark and keeps a single tap target for the primary action.
 */
export function GoogleConnectCard({
  title,
  description,
  connectedAs,
  onConnect,
  onDisconnect,
  connecting = false,
  disconnecting = false,
  disabled = false,
  offlineHint,
}: GoogleConnectCardProps) {
  const isConnected = Boolean(connectedAs);
  return (
    <Card className="flex flex-col gap-stack-sm p-inset-md">
      <header className="flex items-start gap-inline-sm">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card border border-border bg-surface text-base font-semibold text-text-primary"
        >
          G
        </span>
        <div className="flex flex-1 flex-col gap-stack-xs">
          <h3 className="text-base font-semibold text-text-primary">{title}</h3>
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
      ) : (
        <div className="flex flex-col gap-stack-xs">
          <Button
            type="button"
            size="lg"
            onClick={onConnect}
            loading={connecting}
            disabled={disabled || connecting}
          >
            Connect Google
          </Button>
          {disabled && offlineHint ? (
            <p className="text-xs text-text-muted">{offlineHint}</p>
          ) : null}
        </div>
      )}
    </Card>
  );
}
