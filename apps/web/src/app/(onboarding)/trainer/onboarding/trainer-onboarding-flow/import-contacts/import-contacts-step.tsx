"use client";

import * as React from "react";
import { Card, ErrorState } from "@famm/ui";
import { CsvDropzone } from "@/components/contacts/CsvDropzone";
import { ColumnMappingForm } from "@/components/contacts/ColumnMappingForm";
import { ContactReviewTable } from "@/components/contacts/ContactReviewTable";
import { ManualQuickAdd } from "@/components/contacts/ManualQuickAdd";
import { ImportResultsSummary } from "@/components/contacts/ImportResultsSummary";
import { useOnboardingStep } from "@/lib/onboarding/context";
import { useOnboardingProgress } from "@/lib/onboarding/use-onboarding-progress";
import {
  useDedupeProbe,
  useImportContacts,
  type DedupeProbe,
} from "@/lib/contacts/use-contacts-import";
import { mapRows, parseCsv } from "@/lib/contacts/csv";
import {
  buildReviewRows,
  isImportableRow,
  normalizeEmail,
  normalizePhone,
  revalidateRow,
} from "@/lib/contacts/validate";
import { trackEvent } from "@/lib/api/events";
import type {
  ColumnMapping,
  ContactDraft,
  ContactReviewRow as ReviewRow,
  CsvParseResult,
  ImportContactsStepData,
  ImportResultsSummary as Summary,
} from "@/lib/contacts/types";

type Mode = "choose" | "csv" | "manual";

function applyTenantDedupe(rows: ReviewRow[], probe: DedupeProbe | null): ReviewRow[] {
  if (!probe) return rows;
  const emails = new Set(probe.emails.map((e) => e.toLowerCase()));
  const phones = new Set(probe.phones);
  return rows.map((r) => {
    if (r.dedupe !== "new") return r;
    const e = normalizeEmail(r.email);
    const p = normalizePhone(r.phone);
    if (e && emails.has(e)) return { ...r, dedupe: "duplicate_email" };
    if (p && phones.has(p)) return { ...r, dedupe: "duplicate_phone" };
    return r;
  });
}

export function ImportContactsStep() {
  const [mode, setMode] = React.useState<Mode>("choose");
  const [csvName, setCsvName] = React.useState<string | null>(null);
  const [parsed, setParsed] = React.useState<CsvParseResult | null>(null);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [mapping, setMapping] = React.useState<ColumnMapping>({});
  const [rows, setRows] = React.useState<ReviewRow[]>([]);
  const [sendInvites, setSendInvites] = React.useState(true);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [apiError, setApiError] = React.useState<string | null>(null);

  const dedupeMutation = useDedupeProbe();
  const importMutation = useImportContacts();
  const dedupeProbe = dedupeMutation.data ?? null;
  const { patch } = useOnboardingProgress();

  // Probe tenant-side dedupe once on mount so the review table can flag
  // emails/phones the trainer already has on file. Failure is fine — we
  // just rely on intra-batch dedupe.
  const probeRef = React.useRef(false);
  React.useEffect(() => {
    if (probeRef.current) return;
    probeRef.current = true;
    dedupeMutation.mutate(undefined, {
      onError: () => null,
    });
  }, [dedupeMutation]);

  // Re-validate rows when the dedupe probe lands.
  React.useEffect(() => {
    if (!dedupeProbe) return;
    setRows((prev) => applyTenantDedupe(prev, dedupeProbe));
  }, [dedupeProbe]);

  async function handleFile(file: File) {
    setCsvName(file.name);
    setParseError(null);
    setSummary(null);
    try {
      const text = await file.text();
      const result = parseCsv(text);
      if (result.headers.length === 0 || result.rows.length === 0) {
        setParseError("That file looked empty. Try exporting again.");
        setParsed(null);
        return;
      }
      setParsed(result);
      setMapping(result.suggestedMapping);
      const drafts = mapRows(result.rows, result.suggestedMapping);
      const reviewRows = applyTenantDedupe(buildReviewRows(drafts), dedupeProbe);
      setRows(reviewRows);
      trackEvent({
        name: "onboarding.contacts.csv.parsed",
        payload: { rows: result.rows.length, malformed: result.malformedCount },
      });
    } catch {
      setParseError("Couldn't read that file. Make sure it's a CSV.");
    }
  }

  // Remap rows when the mapping changes after parse.
  React.useEffect(() => {
    if (!parsed) return;
    const drafts = mapRows(parsed.rows, mapping);
    const reviewRows = applyTenantDedupe(buildReviewRows(drafts), dedupeProbe);
    setRows((prev) => {
      // Preserve excluded toggles across remap by id where possible.
      const excludedIds = new Set(prev.filter((r) => r.excluded).map((r) => r.id));
      return reviewRows.map((r) => (excludedIds.has(r.id) ? { ...r, excluded: true } : r));
    });
  }, [parsed, mapping, dedupeProbe]);

  function changeRow(id: string, next: ReviewRow) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? applyTenantDedupe([revalidateRow(next)], dedupeProbe)[0]! : r))
    );
  }

  function toggleExclude(id: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, excluded: !r.excluded } : r)));
  }

  function addManualRow(draft: ContactDraft) {
    setRows((prev) => {
      const next = applyTenantDedupe(buildReviewRows([...rowsToDraft(prev), draft]), dedupeProbe);
      return next;
    });
    if (mode === "choose") setMode("manual");
  }

  const importable = rows.filter(isImportableRow);
  const importableCount = importable.length;
  const continueDisabled = importableCount === 0 && summary === null;

  const onContinue = React.useCallback(async () => {
    if (summary) {
      // Already imported — just patch the snapshot and continue.
      const snapshot: ImportContactsStepData = {
        provider: csvName ? "csv" : "manual",
        importedCount: summary.importedCount,
        duplicateCount: summary.duplicateCount,
        invitesSent: summary.invitesSent,
        importedAt: new Date().toISOString(),
      };
      try {
        await patch("import-contacts", snapshot as unknown as Record<string, unknown>);
        return true;
      } catch {
        setApiError("Couldn't save your progress. Try again.");
        return false;
      }
    }
    if (importable.length === 0) return false;
    setApiError(null);
    try {
      const result = await importMutation.mutateAsync({
        contacts: importable.map((r) => ({
          id: r.id,
          firstName: r.firstName,
          lastName: r.lastName,
          email: r.email,
          phone: r.phone,
          notes: r.notes,
        })),
        sendInvites,
      });
      setSummary(result);
      trackEvent({
        name: "onboarding.contacts.imported",
        payload: {
          imported: result.importedCount,
          duplicates: result.duplicateCount,
          invites: result.invitesSent,
        },
      });
      const snapshot: ImportContactsStepData = {
        provider: csvName ? "csv" : "manual",
        importedCount: result.importedCount,
        duplicateCount: result.duplicateCount,
        invitesSent: result.invitesSent,
        importedAt: new Date().toISOString(),
      };
      await patch("import-contacts", snapshot as unknown as Record<string, unknown>);
      return true;
    } catch {
      setApiError("We couldn't import that batch. Try again, or skip for now.");
      return false;
    }
  }, [importMutation, importable, sendInvites, csvName, patch, summary]);

  useOnboardingStep("import-contacts", {
    onContinue,
    continueLabel: summary
      ? "Continue"
      : importableCount > 0
        ? `Import ${importableCount} client${importableCount === 1 ? "" : "s"}`
        : "Import",
    continueDisabled: continueDisabled || importMutation.isPending,
    dirty: rows.length > 0 && summary === null,
  });

  return (
    <div className="flex flex-col gap-stack-md">
      <p className="text-sm text-text-secondary">
        Bring your existing clients in so you can book them straight away. CSV works, or add a few
        by hand. You can always import more later.
      </p>

      {summary ? (
        <ImportResultsSummary summary={summary} />
      ) : (
        <>
          {mode === "choose" ? (
            <SourcePicker onChoose={setMode} />
          ) : (
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="self-start text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
            >
              ← Change source
            </button>
          )}

          {mode === "csv" ? (
            <>
              <CsvDropzone onFile={handleFile} filename={csvName} />
              {parseError ? (
                <ErrorState
                  title="That CSV didn't parse"
                  description={parseError}
                  onRetry={() => {
                    setCsvName(null);
                    setParsed(null);
                    setParseError(null);
                  }}
                />
              ) : null}
              {parsed ? (
                <Card className="flex flex-col gap-stack-sm p-inset-md">
                  <ColumnMappingForm
                    headers={parsed.headers}
                    mapping={mapping}
                    onChange={setMapping}
                  />
                </Card>
              ) : null}
            </>
          ) : null}

          {mode === "manual" ? <ManualQuickAdd onAdd={addManualRow} /> : null}

          {rows.length > 0 ? (
            <section aria-labelledby="review-heading" className="flex flex-col gap-stack-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-inline-sm">
                <h2 id="review-heading" className="text-sm font-semibold text-text-primary">
                  Review {rows.length} contact{rows.length === 1 ? "" : "s"}
                </h2>
                <p className="text-xs text-text-muted">{importableCount} ready to import</p>
              </div>
              <ContactReviewTable
                rows={rows}
                onChangeRow={changeRow}
                onToggleExclude={toggleExclude}
              />
            </section>
          ) : null}

          {rows.length > 0 ? (
            <div className="flex items-start gap-inline-sm rounded-card border border-border bg-surface p-inset-sm">
              <input
                id="send-invites"
                type="checkbox"
                checked={sendInvites}
                onChange={(e) => setSendInvites(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
              />
              <label htmlFor="send-invites" className="flex flex-col gap-stack-xs">
                <span className="text-sm font-medium text-text-primary">Send invites by email</span>
                <span className="text-xs text-text-secondary">
                  Each client gets a short message with a link to claim their account.
                </span>
              </label>
            </div>
          ) : null}

          {apiError ? (
            <p role="alert" className="text-sm text-signal-danger">
              {apiError}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

function rowsToDraft(rows: ReadonlyArray<ReviewRow>): ContactDraft[] {
  return rows.map((r) => ({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    email: r.email,
    phone: r.phone,
    notes: r.notes,
  }));
}

function SourcePicker({ onChoose }: { onChoose: (mode: Mode) => void }) {
  return (
    <div className="grid grid-cols-1 gap-stack-sm sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onChoose("csv")}
        className="flex flex-col items-start gap-stack-xs rounded-card border border-border bg-surface p-inset-md text-left transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        <span className="text-sm font-semibold text-text-primary">Upload a CSV</span>
        <span className="text-xs text-text-secondary">
          From Google Contacts, Apple Contacts, or your last gym&rsquo;s export.
        </span>
      </button>
      <button
        type="button"
        onClick={() => onChoose("manual")}
        className="flex flex-col items-start gap-stack-xs rounded-card border border-border bg-surface p-inset-md text-left transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        <span className="text-sm font-semibold text-text-primary">Add by hand</span>
        <span className="text-xs text-text-secondary">
          Just a few clients? Type them in — takes a minute.
        </span>
      </button>
    </div>
  );
}
