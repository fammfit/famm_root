import type { TenantBundle, UpdateTenantInput } from "@/lib/business/types";

export class BusinessApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fieldErrors: ReadonlyArray<{ field: string; message: string }>;
  constructor(
    code: string,
    message: string,
    status: number,
    fieldErrors: ReadonlyArray<{ field: string; message: string }> = []
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.name = "BusinessApiError";
  }
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

async function parse<T>(res: Response, fallback: string): Promise<T> {
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !body || body.success === false) {
    const code = body?.error?.code ?? "UNKNOWN";
    const message = body?.error?.message ?? fallback;
    throw new BusinessApiError(code, message, res.status, body?.error?.details ?? []);
  }
  return body.data as T;
}

function baseUrl(): string {
  if (typeof window !== "undefined") return "";
  return process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
}

// ── Server-side fetcher ─────────────────────────────────────────────────

export async function getTenantBundleServer(): Promise<TenantBundle> {
  const res = await fetch(`${baseUrl()}/api/v1/tenants/me`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  return parse<TenantBundle>(res, "Couldn't load your business");
}

// ── Client-side fetchers ────────────────────────────────────────────────

export async function getTenantBundle(): Promise<TenantBundle> {
  const res = await fetch("/api/v1/tenants/me", {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  return parse<TenantBundle>(res, "Couldn't load your business");
}

export async function updateTenantBundle(input: UpdateTenantInput): Promise<TenantBundle> {
  const res = await fetch("/api/v1/tenants/me", {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(input),
  });
  return parse<TenantBundle>(res, "Couldn't save your business");
}

export async function uploadLogo(file: Blob): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file, "logo");
  const res = await fetch("/api/v1/uploads/logo", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  return parse<{ url: string }>(res, "Couldn't upload that logo");
}

export interface SlugAvailability {
  available: boolean;
  reason?: "taken" | "reserved" | "invalid";
}

export async function checkSlugAvailability(slug: string): Promise<SlugAvailability> {
  const res = await fetch(`/api/v1/tenants/slug-available?slug=${encodeURIComponent(slug)}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  return parse<SlugAvailability>(res, "Couldn't check that link");
}

export async function uploadPhoto(file: Blob): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file, "photo");
  const res = await fetch("/api/v1/uploads/photo", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  return parse<{ url: string }>(res, "Couldn't upload that photo");
}
