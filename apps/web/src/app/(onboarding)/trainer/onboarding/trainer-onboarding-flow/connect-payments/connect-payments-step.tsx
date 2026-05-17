"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sheet, SheetHeader, SheetFooter, Button, Card } from "@famm/ui";
import { PaymentProcessorCard } from "@/components/payments/PaymentProcessorCard";
import { CapabilityChecklist } from "@/components/payments/CapabilityChecklist";
import { RequirementsList } from "@/components/payments/RequirementsList";
import { PayoutSummary } from "@/components/payments/PayoutSummary";
import { useStripeConnect, type StripeStatusResponse } from "@/lib/integrations/stripe";
import { useOnboardingStep } from "@/lib/onboarding/context";
import { useOnboardingProgress } from "@/lib/onboarding/use-onboarding-progress";
import { trackEvent } from "@/lib/api/events";
import type { ConnectPaymentsStepData } from "@/lib/integrations/types";

interface ConnectPaymentsStepProps {
  initialStatus: StripeStatusResponse;
  initialReason: string | null;
  isOwner: boolean;
}

// NOTE(skip-confirm): The architecture spec asked for an informational
// Skip-confirm Sheet on this step. The shell's Skip button is owned by
// OnboardingFooter and doesn't currently expose a per-step interceptor.
// To avoid a foundational shell change just for this surface, we
// surface the consequence inline (state-A copy) and rely on the
// shell's normal Skip — matching steps 2 and 5. A real interceptor can
// land in a follow-up alongside the per-step `onBeforeSkip` hook.

export function ConnectPaymentsStep({
  initialStatus,
  initialReason,
  isOwner,
}: ConnectPaymentsStepProps) {
  const router = useRouter();
  const params = useSearchParams();
  const { status, connect, refresh, disconnect, isConnecting, isDisconnecting, isRefreshing } =
    useStripeConnect(initialStatus);

  const integration = status.data?.integration ?? null;
  const account = status.data?.account ?? null;
  const connected = Boolean(integration);

  const [confirmingDisconnect, setConfirmingDisconnect] = React.useState(false);
  const [returnError, setReturnError] = React.useState<string | null>(initialReason);
  const [isOffline, setIsOffline] = React.useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  React.useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Clear the OAuth-style return params after first read.
  React.useEffect(() => {
    if (!params.get("stripe")) return;
    const next = new URLSearchParams(params.toString());
    next.delete("stripe");
    next.delete("reason");
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [params, router]);

  // After return from Stripe, refresh once so the page reflects the
  // updated capabilities. Also re-check on visibilitychange to catch
  // the "trainer finished in a new tab" case.
  const refreshedOnce = React.useRef(false);
  React.useEffect(() => {
    if (!connected) return;
    if (initialReason === null && !refreshedOnce.current) {
      refreshedOnce.current = true;
      void refresh().catch(() => null);
    }
    const onVis = () => {
      if (document.visibilityState === "visible") {
        void refresh().catch(() => null);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [connected, initialReason, refresh]);

  // Continue is enabled only once Stripe is connected; both B and C are
  // acceptable progress states.
  const continueDisabled = !connected || !account;

  const onContinue = React.useCallback(async () => {
    if (!integration || !account) return false;
    const snapshot: ConnectPaymentsStepData = {
      provider: "stripe",
      accountId: account.accountId,
      chargesEnabled: account.chargesEnabled,
      payoutsEnabled: account.payoutsEnabled,
      connectedAt: integration.createdAt,
    };
    try {
      await patch("connect-payments", snapshot as unknown as Record<string, unknown>);
      return true;
    } catch {
      setReturnError("api_error");
      return false;
    }
  }, [integration, account]);

  const { patch } = useOnboardingProgress();

  useOnboardingStep("connect-payments", {
    onContinue,
    continueDisabled,
    dirty: connected,
  });

  async function handleConnect() {
    if (!isOwner) return;
    setReturnError(null);
    trackEvent({ name: "integration.stripe.connect.started" });
    try {
      const { url } = await connect();
      window.location.assign(url);
    } catch {
      trackEvent({
        name: "integration.stripe.connect.failed",
        payload: { reason: "stub_error" },
      });
      setReturnError("api_error");
    }
  }

  async function handleConfirmDisconnect() {
    setConfirmingDisconnect(false);
    await disconnect();
    trackEvent({ name: "integration.stripe.disconnected" });
  }

  async function handleRefresh() {
    try {
      await refresh();
      trackEvent({ name: "integration.stripe.requirements.refreshed" });
    } catch {
      setReturnError("api_error");
    }
  }

  // Emit completed/incomplete telemetry once when we read a return param.
  React.useEffect(() => {
    if (initialReason === null) {
      if (
        params.get("stripe") === "connected" &&
        !window.sessionStorage.getItem("famm:stripe:completed-emit")
      ) {
        trackEvent({ name: "integration.stripe.connect.completed" });
        window.sessionStorage.setItem("famm:stripe:completed-emit", "1");
      }
      return;
    }
    trackEvent({
      name: "integration.stripe.connect.incomplete",
      payload: { reason: initialReason },
    });
  }, [initialReason, params]);

  const showStateA = !connected;
  const showStateB = connected && account && !account.payoutsEnabled;
  const showStateC = connected && account && account.payoutsEnabled;
  const finishUrl = "/api/v1/integrations/stripe/return?ok=0&reason=resume";

  return (
    <div className="flex flex-col gap-stack-md">
      <p className="text-sm text-text-secondary">
        Stripe handles checkout, payouts to your bank, and identity verification. We never touch the
        money.
      </p>

      {returnError ? (
        <ConnectError reason={returnError} onDismiss={() => setReturnError(null)} />
      ) : null}

      <PaymentProcessorCard
        provider="stripe"
        state={connected ? "connected" : "not_connected"}
        connectedAs={integration?.externalAccountEmail}
        onConnect={handleConnect}
        onDisconnect={() => setConfirmingDisconnect(true)}
        connecting={isConnecting}
        disconnecting={isDisconnecting}
        disabled={isOffline || (!isOwner && !connected)}
        disabledReason={
          isOffline
            ? "You're offline. Reconnect to continue."
            : !isOwner && !connected
              ? "Only the owner can complete payment setup."
              : undefined
        }
      />

      <PaymentProcessorCard provider="square" state="coming_soon" />

      {showStateA ? (
        <Card className="border-dashed bg-surface-sunken p-inset-md">
          <p className="text-sm text-text-secondary">
            Skipping means: you can take cash on the day, but the public booking page asks clients
            to <em>request</em> a session instead of booking instantly. You can finish setup later
            from Settings.
          </p>
        </Card>
      ) : null}

      {(showStateB || showStateC) && account ? (
        <>
          <section aria-labelledby="capabilities-heading" className="flex flex-col gap-stack-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-inline-sm">
              <h2 id="capabilities-heading" className="text-sm font-semibold text-text-primary">
                Capabilities
              </h2>
              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={isRefreshing}
                aria-label="Refresh status"
                className="text-xs font-medium text-text-secondary underline-offset-4 hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:underline disabled:cursor-not-allowed"
              >
                {isRefreshing ? "Refreshing…" : "Refresh"}
              </button>
            </div>
            <CapabilityChecklist
              chargesEnabled={account.chargesEnabled}
              payoutsEnabled={account.payoutsEnabled}
            />
          </section>

          {showStateB ? (
            <RequirementsList requirements={account.requirements} finishUrl={finishUrl} />
          ) : null}

          {showStateC ? (
            <>
              <PayoutSummary
                externalAccountLast4={account.externalAccountLast4}
                schedule={account.payoutSchedule}
              />
              <Card className="flex flex-col gap-stack-xs bg-surface-sunken p-inset-md">
                <h3 className="text-sm font-semibold text-text-primary">Fees</h3>
                <p className="text-sm text-text-secondary">
                  Standard: 2.9% + $0.30 per successful card charge.
                </p>
              </Card>
            </>
          ) : null}
        </>
      ) : null}

      <Sheet
        open={confirmingDisconnect}
        onClose={() => setConfirmingDisconnect(false)}
        side="center"
        ariaLabelledBy="disconnect-stripe-title"
      >
        <SheetHeader
          title="Disconnect Stripe?"
          description="Pending payouts continue normally. New bookings can't take cards until you reconnect."
          onClose={() => setConfirmingDisconnect(false)}
          titleId="disconnect-stripe-title"
        />
        <SheetFooter>
          <Button variant="ghost" onClick={() => setConfirmingDisconnect(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirmDisconnect}>
            Disconnect
          </Button>
        </SheetFooter>
      </Sheet>
    </div>
  );
}

function ConnectError({ reason, onDismiss }: { reason: string; onDismiss: () => void }) {
  const copy =
    reason === "cancelled"
      ? "You cancelled the Stripe setup. No problem — pick up where you left off, or skip for now."
      : reason === "country_not_supported"
        ? "Stripe doesn't support payouts in your country yet. Skip for now and handle payments off-platform."
        : reason === "auth_lost"
          ? "We lost your session during onboarding. Sign in again and we'll resume."
          : "Something went wrong while connecting Stripe. Try again, or skip for now.";
  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-inline-sm rounded-card border border-signal-warning/30 bg-signal-warning/10 p-inset-sm text-sm text-text-primary"
    >
      <p>{copy}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
      >
        Dismiss
      </button>
    </div>
  );
}
