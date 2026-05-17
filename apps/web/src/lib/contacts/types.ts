/**
 * Domain types for the onboarding "Import Contacts" step.
 *
 * Kept independent of any persistence layer so the step body can be
 * unit-tested without spinning up the stub import store.
 */

export type ContactProvider = "csv" | "google" | "manual";

export type ContactField = "firstName" | "lastName" | "email" | "phone" | "notes";

export type DedupeStatus = "new" | "duplicate_email" | "duplicate_phone";

export type ContactRowStatus =
  | "valid"
  | "invalid_email"
  | "invalid_phone"
  | "missing_name"
  | "missing_contact";

export interface ContactDraft {
  /** Stable client-side row id (uuid-ish). */
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
}

export interface ContactReviewRow extends ContactDraft {
  status: ContactRowStatus;
  dedupe: DedupeStatus;
  /** Per-field validation message — keyed by field. */
  errors: Partial<Record<ContactField, string>>;
  /** True when the user has explicitly removed this row from the import. */
  excluded: boolean;
}

export type ColumnMapping = Partial<Record<ContactField, string>>;

export interface CsvParseResult {
  /** All header strings as they appear in row 1 of the file. */
  headers: string[];
  /** Each row keyed by raw header. */
  rows: Array<Record<string, string>>;
  /** First-pass auto-mapping based on header heuristics. */
  suggestedMapping: ColumnMapping;
  /** Any rows we couldn't parse at all (count only — we don't surface row text). */
  malformedCount: number;
}

export interface ImportResultsSummary {
  importedCount: number;
  skippedCount: number;
  duplicateCount: number;
  invitesSent: number;
  invitesFailed: number;
}

export interface ImportContactsStepData {
  provider: ContactProvider | "skipped";
  importedCount: number;
  duplicateCount: number;
  invitesSent: number;
  importedAt: string;
}
