"use client";

import * as React from "react";
import { FormField, Input } from "@famm/ui";
import { SaveBar } from "@/components/settings/SaveBar";
import { useTax, useUpdateTax } from "@/lib/account/api";
import { trackEvent } from "@/lib/api/events";
import type { TaxSettings } from "@/lib/account/types";

export interface TaxSectionProps {
  readOnly?: boolean;
}

export function TaxSection({ readOnly }: TaxSectionProps) {
  const { data, isLoading } = useTax();
  const update = useUpdateTax();
  const [draft, setDraft] = React.useState<TaxSettings | null>(null);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (data?.tax && !draft) setDraft(data.tax);
  }, [data, draft]);

  if (isLoading || !data || !draft) {
    return <div className="h-16 animate-pulse rounded-card bg-surface-sunken" />;
  }

  const base = data.tax;
  const dirty = JSON.stringify(base) !== JSON.stringify(draft);
  const ratePct = draft.defaultRateBps / 100;

  async function save() {
    if (!draft) return;
    setErrorMessage(null);
    try {
      await update.mutateAsync(draft);
      setSavedAt(Date.now());
      trackEvent({ name: "settings.saved", payload: { section: "tax" } });
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Couldn't save");
    }
  }

  return (
    <>
      <FormField
        label="Default tax rate (%)"
        hint={`Applied to every taxable service. Example: $100 → ${(100 * (1 + ratePct / 100)).toFixed(2)} with tax.`}
      >
        <Input
          type="number"
          step="0.01"
          min={0}
          max={100}
          value={ratePct}
          onChange={(e) =>
            setDraft((prev) =>
              prev
                ? {
                    ...prev,
                    defaultRateBps: Math.round(
                      Math.min(100, Math.max(0, Number(e.target.value) || 0)) * 100
                    ),
                  }
                : prev
            )
          }
          disabled={readOnly}
        />
      </FormField>
      <div className="flex items-start gap-inline-sm rounded-card border border-border bg-surface p-inset-sm">
        <input
          id="tax-inclusive"
          type="checkbox"
          checked={draft.inclusive}
          onChange={(e) =>
            setDraft((prev) => (prev ? { ...prev, inclusive: e.target.checked } : prev))
          }
          disabled={readOnly}
          className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
        />
        <label htmlFor="tax-inclusive" className="flex flex-col gap-stack-xs">
          <span className="text-sm font-medium text-text-primary">Tax-inclusive prices</span>
          <span className="text-xs text-text-secondary">
            Prices on the public booking page already include tax.
          </span>
        </label>
      </div>
      <FormField label="Invoice from name" hint="Shown on receipts and invoices.">
        <Input
          value={draft.invoiceFromName}
          onChange={(e) =>
            setDraft((prev) => (prev ? { ...prev, invoiceFromName: e.target.value } : prev))
          }
          disabled={readOnly}
        />
      </FormField>
      <FormField label="Invoice from address">
        <Input
          value={draft.invoiceFromAddress}
          onChange={(e) =>
            setDraft((prev) => (prev ? { ...prev, invoiceFromAddress: e.target.value } : prev))
          }
          disabled={readOnly}
        />
      </FormField>
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
