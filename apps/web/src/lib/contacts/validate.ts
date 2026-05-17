import type {
  ContactDraft,
  ContactField,
  ContactReviewRow,
  ContactRowStatus,
  DedupeStatus,
} from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
// Loose international phone match: at least 7 digits, optional leading +.
const PHONE_RE = /^\+?[\d][\d\s().-]{5,}$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return "";
  // Keep leading + and digits only.
  const plus = trimmed.startsWith("+") ? "+" : "";
  return plus + trimmed.replace(/[^\d]/g, "");
}

interface ValidationOutput {
  status: ContactRowStatus;
  errors: Partial<Record<ContactField, string>>;
}

function validateOne(draft: ContactDraft): ValidationOutput {
  const errors: Partial<Record<ContactField, string>> = {};
  const hasName = draft.firstName.trim().length > 0 || draft.lastName.trim().length > 0;
  const email = draft.email.trim();
  const phone = draft.phone.trim();

  if (!hasName) {
    errors.firstName = "Add a name";
  }
  if (email.length === 0 && phone.length === 0) {
    errors.email = "Email or phone required";
  }
  if (email.length > 0 && !EMAIL_RE.test(email)) {
    errors.email = "Doesn't look like an email";
  }
  if (phone.length > 0 && !PHONE_RE.test(phone)) {
    errors.phone = "Doesn't look like a phone";
  }

  let status: ContactRowStatus = "valid";
  if (!hasName) status = "missing_name";
  else if (errors.email && email.length > 0) status = "invalid_email";
  else if (errors.phone && phone.length > 0) status = "invalid_phone";
  else if (email.length === 0 && phone.length === 0) status = "missing_contact";

  return { status, errors };
}

/**
 * Build review rows from drafts. Dedupes across the imported batch by
 * normalized email and phone — the *first* occurrence wins, later rows
 * are flagged as duplicates so the trainer can decide.
 */
export function buildReviewRows(drafts: ReadonlyArray<ContactDraft>): ContactReviewRow[] {
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  return drafts.map((d) => {
    const { status, errors } = validateOne(d);
    const email = normalizeEmail(d.email);
    const phone = normalizePhone(d.phone);
    let dedupe: DedupeStatus = "new";
    if (email && seenEmails.has(email)) dedupe = "duplicate_email";
    else if (phone && seenPhones.has(phone)) dedupe = "duplicate_phone";
    if (email) seenEmails.add(email);
    if (phone) seenPhones.add(phone);
    return { ...d, status, errors, dedupe, excluded: false };
  });
}

export function revalidateRow(row: ContactReviewRow): ContactReviewRow {
  const { status, errors } = validateOne(row);
  return { ...row, status, errors };
}

export function isImportableRow(row: ContactReviewRow): boolean {
  return !row.excluded && row.status === "valid" && row.dedupe === "new";
}
