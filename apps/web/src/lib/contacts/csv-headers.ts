import type { ColumnMapping, ContactField } from "./types";

/**
 * Header aliases we recognize for each contact field. Lower-cased,
 * whitespace-normalized matches only — we don't try to be clever about
 * fuzzy matching to keep the surprise factor low.
 */
const HEADER_ALIASES: Record<ContactField, ReadonlyArray<string>> = {
  firstName: ["first name", "firstname", "given name", "first"],
  lastName: ["last name", "lastname", "surname", "family name", "last"],
  email: ["email", "e-mail", "email address", "mail"],
  phone: ["phone", "mobile", "cell", "phone number", "tel", "telephone"],
  notes: ["notes", "note", "comment", "comments", "tags"],
};

function normalize(header: string): string {
  return header.trim().toLowerCase();
}

export function suggestMapping(headers: ReadonlyArray<string>): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const field of Object.keys(HEADER_ALIASES) as ContactField[]) {
    const aliases = HEADER_ALIASES[field];
    const hit = headers.find((h) => aliases.includes(normalize(h)));
    if (hit) mapping[field] = hit;
  }
  return mapping;
}

export const REQUIRED_MAPPING_FIELDS: ReadonlyArray<ContactField> = ["firstName", "email"];
