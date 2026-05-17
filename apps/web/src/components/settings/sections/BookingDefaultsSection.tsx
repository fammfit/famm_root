"use client";

import * as React from "react";
import { FormField, Input } from "@famm/ui";
import { SaveBar } from "@/components/settings/SaveBar";
import { useBookingDefaults, useUpdateBookingDefaults } from "@/lib/account/api";
import { trackEvent } from "@/lib/api/events";
import type { BookingDefaults } from "@/lib/account/types";

export interface BookingDefaultsSectionProps {
  readOnly?: boolean;
}

export function BookingDefaultsSection({ readOnly }: BookingDefaultsSectionProps) {
  const { data, isLoading } = useBookingDefaults();
  const update = useUpdateBookingDefaults();
  const [draft, setDraft] = React.useState<BookingDefaults | null>(null);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (data?.bookingDefaults && !draft) setDraft(data.bookingDefaults);
  }, [data, draft]);

  if (isLoading || !data || !draft) {
    return <div className="h-16 animate-pulse rounded-card bg-surface-sunken" />;
  }

  const base = data.bookingDefaults;
  const dirty = JSON.stringify(base) !== JSON.stringify(draft);

  function patch<K extends keyof BookingDefaults>(key: K, value: BookingDefaults[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save() {
    if (!draft) return;
    setErrorMessage(null);
    try {
      await update.mutateAsync(draft);
      setSavedAt(Date.now());
      trackEvent({ name: "settings.saved", payload: { section: "booking-defaults" } });
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Couldn't save");
    }
  }

  return (
    <>
      <FormField
        label="Minimum lead time (minutes)"
        hint="How soon before a session a client can still book."
      >
        <Input
          type="number"
          min={0}
          max={10080}
          value={draft.minLeadTimeMinutes}
          onChange={(e) => patch("minLeadTimeMinutes", Math.max(0, Number(e.target.value) || 0))}
          disabled={readOnly}
        />
      </FormField>
      <FormField
        label="Cancellation window (hours)"
        hint="Past this point, a cancellation may incur a no-show fee."
      >
        <Input
          type="number"
          min={0}
          max={168}
          value={draft.cancellationWindowHours}
          onChange={(e) =>
            patch("cancellationWindowHours", Math.max(0, Number(e.target.value) || 0))
          }
          disabled={readOnly}
        />
      </FormField>
      <div className="flex items-start gap-inline-sm rounded-card border border-border bg-surface p-inset-sm">
        <input
          id="auto-confirm"
          type="checkbox"
          checked={draft.autoConfirm}
          onChange={(e) => patch("autoConfirm", e.target.checked)}
          disabled={readOnly}
          className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
        />
        <label htmlFor="auto-confirm" className="flex flex-col gap-stack-xs">
          <span className="text-sm font-medium text-text-primary">Auto-confirm bookings</span>
          <span className="text-xs text-text-secondary">
            When off, clients book a <em>request</em> that you confirm by hand.
          </span>
        </label>
      </div>
      {!readOnly ? (
        <SaveBar
          visible={dirty}
          onSave={save}
          onDiscard={() => setDraft(base)}
          isSaving={update.isPending}
          savedAt={savedAt}
          errorMessage={errorMessage}
        />
      ) : null}
    </>
  );
}
