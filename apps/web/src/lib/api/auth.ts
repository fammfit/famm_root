/**
 * Client-side fetch wrappers for the unauthenticated auth surface.
 *
 * All endpoints accept JSON, return `{ success, data?, error? }`, and live
 * behind the public-paths whitelist in middleware.ts.
 *
 * These helpers always send same-origin with `credentials: "include"` so
 * the API can set the access/refresh cookies on the response.
 */

export interface ApiErrorPayload {
  code: string;
  message: string;
}

export class AuthApiError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = "AuthApiError";
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  return parseResponse<T>(res);
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return parseResponse<T>(res);
}

async function parseResponse<T>(res: Response): Promise<T> {
  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    throw new AuthApiError(
      "NETWORK_ERROR",
      "We couldn't reach the server. Check your connection and try again.",
      res.status
    );
  }
  const envelope = payload as {
    success?: boolean;
    data?: T;
    error?: ApiErrorPayload;
  };
  if (!res.ok || envelope?.success === false) {
    const err = envelope?.error ?? {
      code: "UNKNOWN",
      message: "Something went wrong",
    };
    throw new AuthApiError(err.code, err.message, res.status);
  }
  return envelope.data as T;
}

// ── Magic link ───────────────────────────────────────────────────────────

export function requestMagicLink(input: {
  email: string;
  tenantSlug: string;
}): Promise<{ sent: true; expiresAt?: string }> {
  return postJson("/api/v1/auth/magic-link", input);
}

export function verifyMagicLink(input: {
  token: string;
  email: string;
  tenant: string;
}): Promise<{ accessToken: string; user: { id: string; role: string } }> {
  const url = new URL("/api/v1/auth/magic-link/verify", window.location.origin);
  url.searchParams.set("token", input.token);
  url.searchParams.set("email", input.email);
  url.searchParams.set("tenant", input.tenant);
  return getJson(url.pathname + url.search);
}

// ── SMS OTP ──────────────────────────────────────────────────────────────

export function requestSmsOtp(input: {
  phone: string;
  tenantSlug: string;
}): Promise<{ sent: true; expiresAt?: string }> {
  return postJson("/api/v1/auth/sms", input);
}

export function verifySmsOtp(input: { phone: string; code: string; tenantSlug: string }): Promise<{
  accessToken: string;
  user: { id: string; role: string };
}> {
  return postJson("/api/v1/auth/sms/verify", input);
}

// ── Password ─────────────────────────────────────────────────────────────

export function loginWithPassword(input: {
  email: string;
  password: string;
  tenantSlug: string;
}): Promise<{
  accessToken: string;
  user: { id: string; role: string };
}> {
  return postJson("/api/v1/auth/login", input);
}
