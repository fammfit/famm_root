"use client";

import { useMutation } from "@tanstack/react-query";
import type { ContactDraft, ImportResultsSummary } from "./types";

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

async function readEnvelope<T>(res: Response, fallback: string): Promise<T> {
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !body || body.success === false) {
    throw new Error(body?.error?.message ?? fallback);
  }
  return body.data as T;
}

export interface DedupeProbe {
  /** Emails (normalized lower-case) that already exist for this tenant. */
  emails: string[];
  /** Phones (normalized) that already exist for this tenant. */
  phones: string[];
}

async function probeDedupe(): Promise<DedupeProbe> {
  const res = await fetch("/api/v1/contacts/import/dedupe", {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  return readEnvelope<DedupeProbe>(res, "Couldn't check for duplicates");
}

interface ImportRequest {
  contacts: ContactDraft[];
  sendInvites: boolean;
}

async function postImport(input: ImportRequest): Promise<ImportResultsSummary> {
  const res = await fetch("/api/v1/contacts/import", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return readEnvelope<ImportResultsSummary>(res, "Couldn't import contacts");
}

export function useDedupeProbe() {
  return useMutation({ mutationFn: probeDedupe });
}

export function useImportContacts() {
  return useMutation({ mutationFn: postImport });
}
