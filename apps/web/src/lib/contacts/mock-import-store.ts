import type { ContactDraft, ImportResultsSummary } from "./types";
import { normalizeEmail, normalizePhone } from "./validate";

/**
 * In-memory imported-contacts store keyed by tenantId. Replaces a real
 * Contact/Client table until the onboarding model wiring lands. The
 * store is intentionally append-only — disconnect/restart for the
 * onboarding flow uses {@link clearImports}.
 */
interface StoredContact extends ContactDraft {
  importedAt: string;
  inviteSentAt: string | null;
}

const STORE = new Map<string, StoredContact[]>();

function get(tenantId: string): StoredContact[] {
  return STORE.get(tenantId) ?? [];
}

export function existingEmails(tenantId: string): Set<string> {
  return new Set(
    get(tenantId)
      .map((c) => normalizeEmail(c.email))
      .filter(Boolean)
  );
}

export function existingPhones(tenantId: string): Set<string> {
  return new Set(
    get(tenantId)
      .map((c) => normalizePhone(c.phone))
      .filter(Boolean)
  );
}

export function importContacts(
  tenantId: string,
  drafts: ReadonlyArray<ContactDraft>,
  options: { sendInvites: boolean }
): ImportResultsSummary {
  const now = new Date().toISOString();
  const existingEmail = existingEmails(tenantId);
  const existingPhone = existingPhones(tenantId);
  const current = get(tenantId);
  let imported = 0;
  let duplicates = 0;
  let invitesSent = 0;

  for (const d of drafts) {
    const email = normalizeEmail(d.email);
    const phone = normalizePhone(d.phone);
    const isDupe = (email && existingEmail.has(email)) || (phone && existingPhone.has(phone));
    if (isDupe) {
      duplicates++;
      continue;
    }
    const stored: StoredContact = {
      ...d,
      email,
      phone,
      importedAt: now,
      inviteSentAt: options.sendInvites && email ? now : null,
    };
    current.push(stored);
    if (stored.inviteSentAt) invitesSent++;
    if (email) existingEmail.add(email);
    if (phone) existingPhone.add(phone);
    imported++;
  }

  STORE.set(tenantId, current);
  return {
    importedCount: imported,
    skippedCount: drafts.length - imported - duplicates,
    duplicateCount: duplicates,
    invitesSent,
    invitesFailed: 0,
  };
}

export function clearImports(tenantId: string): void {
  STORE.delete(tenantId);
}
