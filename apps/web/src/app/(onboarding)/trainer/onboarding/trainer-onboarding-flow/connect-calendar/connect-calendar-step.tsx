"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { Sheet, SheetHeader, SheetFooter, Button, Card, ErrorState } from "@famm/ui";
import { GoogleConnectCard } from "@/components/integrations/GoogleConnectCard";
import {
  CalendarsSelector,
  CREATE_NEW_CALENDAR_ID,
} from "@/components/integrations/CalendarsSelector";
import { useGoogleCalendar, type CalendarStatusResponse } from "@/lib/integrations/google-calendar";
import { useOnboardingStep } from "@/lib/onboarding/context";
import { useOnboardingProgress } from "@/lib/onboarding/use-onboarding-progress";
import { trackEvent } from "@/lib/api/events";
import type { ConnectCalendarStepData } from "@/lib/integrations/types";

interface ConnectCalendarStepProps {
  initialStatus: CalendarStatusResponse;
  initialReason: string | null;
}

export function ConnectCalendarStep({ initialStatus, initialReason }: ConnectCalendarStepProps) {
  const router = useRouter();
  const params = useSearchParams();
  const { status, calendars, connect, disconnect, saveSettings, isConnecting, isDisconnecting } =
    useGoogleCalendar(initialStatus);

  const integration = status.data?.integration ?? null;
  const persistedSettings = status.data?.settings ?? null;
  const connected = Boolean(integration);

  const [readIds, setReadIds] = React.useState<string[]>(() =>
    persistedSettings?.readCalendarIds ? [...persistedSettings.readCalendarIds] : []
  );
  const [writeId, setWriteId] = React.useState<string | null>(
    persistedSettings?.writeCalendarId ?? null
  );
  const [confirmingDisconnect, setConfirmingDisconnect] = React.useState(false);
  const [returnError, setReturnError] = React.useState<string | null>(initialReason);
  const [isOffline, setIsOffline] = React.useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
  const pickedDefaultsRef = React.useRef(false);
  const { patch } = useOnboardingProgress();

  // Online/offline tracking.
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
    if (!params.get("google")) return;
    const next = new URLSearchParams(params.toString());
    next.delete("google");
    next.delete("reason");
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [params, router]);

  // Pre-select the primary calendar once when we first see the list.
  React.useEffect(() => {
    if (pickedDefaultsRef.current) return;
    if (!connected) return;
    const list = calendars.data?.calendars ?? [];
    if (list.length === 0) return;
    // Honor saved settings if they exist (re-edit).
    if (persistedSettings?.writeCalendarId) {
      pickedDefaultsRef.current = true;
      return;
    }
    const primary = list.find((c) => c.isPrimary);
    const firstWritable = list.find(
      (c) => (c.accessRole === "OWNER" || c.accessRole === "WRITER") && !c.isSubscribed
    );
    const writeTarget = primary && !primary.isSubscribed ? primary : firstWritable;
    if (writeTarget) setWriteId(writeTarget.id);
    if (primary) setReadIds([primary.id]);
    pickedDefaultsRef.current = true;
  }, [connected, calendars.data, persistedSettings]);

  const allCalendars = calendars.data?.calendars ?? [];

  const continueDisabled =
    !connected ||
    calendars.isLoading ||
    Boolean(calendars.error) ||
    !writeId ||
    allCalendars.length === 0;

  const onContinue = React.useCallback(async () => {
    if (!integration || !writeId) return false;
    try {
      const saved = await saveSettings({
        readCalendarIds: readIds,
        writeCalendarId: writeId,
      });
      const finalWriteId = saved.settings?.writeCalendarId ?? writeId;
      const isNewCalendar =
        writeId === CREATE_NEW_CALENDAR_ID && finalWriteId !== CREATE_NEW_CALENDAR_ID;
      if (isNewCalendar) {
        trackEvent({
          name: "integration.google_calendar.calendar.created",
          payload: { id: finalWriteId },
        });
      }
      const snapshot: ConnectCalendarStepData = {
        provider: "google",
        account: {
          id: integration.externalAccountId,
          email: integration.externalAccountEmail,
        },
        readCalendarIds: saved.settings?.readCalendarIds ?? readIds,
        writeCalendarId: finalWriteId ?? writeId,
        connectedAt: integration.createdAt,
      };
      await patch("connect-calendar", snapshot as unknown as Record<string, unknown>);
      trackEvent({ name: "integration.google_calendar.settings.saved" });
      return true;
    } catch {
      setReturnError("api_error");
      return false;
    }
  }, [integration, readIds, writeId, saveSettings, patch]);

  // Step page sits below `useOnboardingStep` — register handlers.
  useOnboardingStep("connect-calendar", {
    onContinue,
    continueDisabled,
    dirty: connected,
  });

  async function handleConnect() {
    setReturnError(null);
    trackEvent({ name: "integration.google_calendar.connect.started" });
    try {
      await connect();
      trackEvent({ name: "integration.google_calendar.connect.succeeded" });
    } catch {
      trackEvent({
        name: "integration.google_calendar.connect.failed",
        payload: { reason: "stub_error" },
      });
      setReturnError("api_error");
    }
  }

  async function handleConfirmDisconnect() {
    setConfirmingDisconnect(false);
    pickedDefaultsRef.current = false;
    setReadIds([]);
    setWriteId(null);
    await disconnect();
    trackEvent({ name: "integration.google_calendar.disconnected" });
  }

  return (
    <div className="flex flex-col gap-stack-md">
      <p className="text-sm text-text-secondary">
        We&rsquo;ll read busy time from your calendar and add new sessions to it. Two-way, no
        surprises.
      </p>

      {returnError ? (
        <ConnectError reason={returnError} onDismiss={() => setReturnError(null)} />
      ) : null}

      <GoogleConnectCard
        title="Google Calendar"
        description="Read busy time + write new bookings. Other event details stay private."
        connectedAs={integration?.externalAccountEmail}
        onConnect={handleConnect}
        onDisconnect={() => setConfirmingDisconnect(true)}
        connecting={isConnecting}
        disconnecting={isDisconnecting}
        disabled={isOffline}
        offlineHint="You're offline. Reconnect to continue."
      />

      {connected ? (
        calendars.isLoading ? (
          <CalendarsSkeleton />
        ) : calendars.isError ? (
          <ErrorState
            title="Couldn't load your calendars"
            description="The connection looked fine, but the listing fetch failed."
            onRetry={() => void calendars.refetch()}
          />
        ) : (
          <>
            <CalendarsSelector
              calendars={allCalendars}
              readCalendarIds={readIds}
              writeCalendarId={writeId}
              onChangeRead={setReadIds}
              onChangeWrite={setWriteId}
            />
            <Card className="flex items-start gap-inline-sm border border-signal-success/30 bg-signal-success/5 p-inset-sm">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-signal-success"
              >
                <Check aria-hidden className="h-4 w-4" />
              </span>
              <p className="text-sm text-text-secondary">
                We&rsquo;ll never let a client book a time that&rsquo;s already on one of your read
                calendars.
              </p>
            </Card>
          </>
        )
      ) : (
        <p className="text-sm text-text-secondary">
          Skip and your FAMM calendar will be the source of truth. You can connect from Settings
          anytime.
        </p>
      )}

      <Sheet
        open={confirmingDisconnect}
        onClose={() => setConfirmingDisconnect(false)}
        side="center"
        ariaLabelledBy="disconnect-cal-title"
      >
        <SheetHeader
          title="Disconnect Google Calendar?"
          description="We'll stop reading busy time. Past bookings stay on your calendar."
          onClose={() => setConfirmingDisconnect(false)}
          titleId="disconnect-cal-title"
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
      : reason === "insufficient_scope"
        ? "We need both read and write access. Reconnect and approve all permissions."
        : reason === "state_mismatch"
          ? "We couldn't verify that — please reconnect."
          : "Something went wrong. Try again, or skip for now.";
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

function CalendarsSkeleton() {
  return (
    <div className="flex flex-col gap-stack-xs">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-card bg-surface-sunken" />
      ))}
    </div>
  );
}
