"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sheet, SheetHeader, SheetFooter, Button, ErrorState } from "@famm/ui";
import { GoogleConnectCard } from "@/components/integrations/GoogleConnectCard";
import { BusinessListingPicker } from "@/components/onboarding/BusinessListingPicker";
import { BusinessListingPreview } from "@/components/onboarding/BusinessListingPreview";
import { useGoogleBusiness } from "@/lib/integrations/google-business";
import { useOnboardingStep } from "@/lib/onboarding/context";
import { useOnboardingProgress } from "@/lib/onboarding/use-onboarding-progress";
import { trackEvent } from "@/lib/api/events";
import type {
  GoogleBusinessListing,
  ImportBusinessStepData,
  Integration,
} from "@/lib/integrations/types";

interface ImportBusinessStepProps {
  initialIntegration: Integration | null;
  /** Echoed back from the OAuth-style return path. Used to surface inline errors. */
  googleReturnReason: string | null;
}

export function ImportBusinessStep({
  initialIntegration,
  googleReturnReason,
}: ImportBusinessStepProps) {
  const router = useRouter();
  const params = useSearchParams();
  const { status, listings, connect, disconnect, isConnecting, isDisconnecting } =
    useGoogleBusiness(initialIntegration);

  const integration = status.data?.integration ?? null;
  const connected = Boolean(integration);

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [confirmingDisconnect, setConfirmingDisconnect] = React.useState(false);
  const [returnError, setReturnError] = React.useState<string | null>(googleReturnReason);
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

  // Clear the ?google= param after we've read it once.
  React.useEffect(() => {
    if (!params.get("google")) return;
    const next = new URLSearchParams(params.toString());
    next.delete("google");
    next.delete("reason");
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [params, router]);

  const { patch } = useOnboardingProgress();

  // Pre-select if only one listing came back.
  React.useEffect(() => {
    if (!connected) return;
    const all = listings.data?.listings ?? [];
    if (all.length === 1 && all[0] && !selectedId) {
      setSelectedId(all[0].id);
    }
  }, [connected, listings.data, selectedId]);

  const selectedListing: GoogleBusinessListing | null = React.useMemo(() => {
    if (!selectedId) return null;
    return listings.data?.listings.find((l) => l.id === selectedId) ?? null;
  }, [listings.data, selectedId]);

  const showPreview = Boolean(selectedListing);

  const continueDisabled = !connected || !selectedListing;

  const onContinue = React.useCallback(async () => {
    if (!integration || !selectedListing) return false;
    const stepData: ImportBusinessStepData = {
      provider: "google",
      account: {
        id: integration.externalAccountId,
        email: integration.externalAccountEmail,
      },
      listing: selectedListing,
      importedAt: new Date().toISOString(),
    };
    try {
      await patch("import-business", stepData);
      trackEvent({
        name: "integration.google_business.listing.selected",
        payload: { listingId: selectedListing.id },
      });
      return true;
    } catch {
      return false;
    }
  }, [integration, selectedListing, patch]);

  useOnboardingStep("import-business", {
    onContinue,
    continueLabel: showPreview ? "Use this" : "Continue",
    continueDisabled,
    dirty: Boolean(selectedId),
  });

  async function handleConnect() {
    setReturnError(null);
    trackEvent({ name: "integration.google_business.connect.started" });
    try {
      await connect();
      trackEvent({ name: "integration.google_business.connect.succeeded" });
    } catch {
      trackEvent({
        name: "integration.google_business.connect.failed",
        payload: { reason: "stub_error" },
      });
      setReturnError("api_error");
    }
  }

  async function handleConfirmDisconnect() {
    setConfirmingDisconnect(false);
    setSelectedId(null);
    await disconnect();
    trackEvent({ name: "integration.google_business.disconnected" });
  }

  return (
    <div className="flex flex-col gap-stack-md">
      <p className="text-sm text-text-secondary">
        We can pull your business details from Google — name, hours, address — so you can skip the
        typing on the next step.
      </p>

      {returnError ? (
        <ConnectError reason={returnError} onDismiss={() => setReturnError(null)} />
      ) : null}

      <GoogleConnectCard
        title="Google Business Profile"
        description="Read-only access to the businesses you manage."
        connectedAs={integration?.externalAccountEmail}
        onConnect={handleConnect}
        onDisconnect={() => setConfirmingDisconnect(true)}
        connecting={isConnecting}
        disconnecting={isDisconnecting}
        disabled={isOffline}
        offlineHint="You're offline. Reconnect to continue."
      />

      {connected ? (
        listings.isLoading ? (
          <ListingsSkeleton />
        ) : listings.isError ? (
          <ErrorState
            title="Couldn't load your businesses"
            description="The Google connection looked fine, but the listing fetch failed."
            onRetry={() => void listings.refetch()}
          />
        ) : (
          <BusinessListingPicker
            listings={listings.data?.listings ?? []}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        )
      ) : (
        <p className="text-sm text-text-secondary">
          Don&rsquo;t have a Google listing? No problem — tap{" "}
          <strong className="text-text-primary">Skip</strong> and you can enter your business
          details by hand on the next step.
        </p>
      )}

      {selectedListing ? (
        <BusinessListingPreview listing={selectedListing} onChange={() => setSelectedId(null)} />
      ) : null}

      <Sheet
        open={confirmingDisconnect}
        onClose={() => setConfirmingDisconnect(false)}
        side="center"
        ariaLabelledBy="disconnect-title"
      >
        <SheetHeader
          title="Disconnect Google?"
          description="We'll forget the connection. Nothing already imported is lost."
          onClose={() => setConfirmingDisconnect(false)}
          titleId="disconnect-title"
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
    reason === "consent_denied"
      ? "No problem — pick a different account or tap Skip."
      : reason === "state_mismatch"
        ? "We couldn't verify that — please reconnect."
        : "Something went wrong on Google's side. Try again, or skip for now.";
  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-inline-sm rounded-card border border-signal-danger/30 bg-signal-danger/10 p-inset-sm text-sm text-signal-danger"
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

function ListingsSkeleton() {
  return (
    <div className="flex flex-col gap-stack-xs">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-card bg-surface-sunken" />
      ))}
    </div>
  );
}
