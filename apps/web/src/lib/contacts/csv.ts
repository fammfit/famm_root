import type { ColumnMapping, ContactDraft, CsvParseResult } from "./types";
import { suggestMapping } from "./csv-headers";

/**
 * Lightweight CSV parser. Handles quoted fields, escaped quotes, and CRLF
 * line endings. Intentionally NOT a full RFC-4180 implementation — the
 * import step has a manual review table where the trainer fixes anything
 * weird, so robustness > correctness here.
 *
 * Hard cap of 500 rows so a stray 10MB export can't lock the tab.
 */
export const MAX_ROWS = 500;

export function parseCsv(text: string): CsvParseResult {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let malformed = 0;

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };
  const pushRow = () => {
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      pushCell();
      continue;
    }
    if (ch === "\n") {
      pushCell();
      pushRow();
      continue;
    }
    if (ch === "\r") {
      continue;
    }
    cell += ch;
  }
  if (cell.length > 0 || row.length > 0) {
    pushCell();
    pushRow();
  }

  const headerRow = rows.shift() ?? [];
  const headers = headerRow.map((h) => h.trim()).filter((h) => h.length > 0);
  if (headers.length === 0) {
    return { headers: [], rows: [], suggestedMapping: {}, malformedCount: 0 };
  }

  const out: Array<Record<string, string>> = [];
  for (const r of rows) {
    if (r.every((c) => c.trim().length === 0)) continue;
    if (out.length >= MAX_ROWS) break;
    if (r.length > headers.length + 5) {
      malformed++;
      continue;
    }
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? "").trim();
    });
    out.push(obj);
  }

  return {
    headers,
    rows: out,
    suggestedMapping: suggestMapping(headers),
    malformedCount: malformed,
  };
}

export function mapRows(
  rows: ReadonlyArray<Record<string, string>>,
  mapping: ColumnMapping
): ContactDraft[] {
  return rows.map((r, idx) => ({
    id: `csv-${idx}-${Math.random().toString(36).slice(2, 8)}`,
    firstName: mapping.firstName ? (r[mapping.firstName] ?? "") : "",
    lastName: mapping.lastName ? (r[mapping.lastName] ?? "") : "",
    email: mapping.email ? (r[mapping.email] ?? "") : "",
    phone: mapping.phone ? (r[mapping.phone] ?? "") : "",
    notes: mapping.notes ? (r[mapping.notes] ?? "") : "",
  }));
}
