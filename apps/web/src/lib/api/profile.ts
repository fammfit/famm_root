import type { UserRole } from "@famm/types";

export interface MeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  timezone: string;
  emailVerified: string | null;
  phoneVerified: string | null;
  status: string;
  role: UserRole;
  tenantId: string;
  /** Whether this account has a password set. Inferred from `passwordHash`'s presence on the server; the API never returns the hash itself. */
  hasPassword: boolean;
}

export interface UpdateMeInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  timezone?: string;
  avatarUrl?: string | null;
}

export interface SetPasswordInput {
  currentPassword?: string;
  newPassword: string;
}

export class ProfileApiError extends Error {
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
    this.name = "ProfileApiError";
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
    throw new ProfileApiError(code, message, res.status, body?.error?.details ?? []);
  }
  return body.data as T;
}

function resolveBaseUrl(): string {
  if (typeof window !== "undefined") return "";
  return process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
}

// ── Server-side fetchers (auth flows through the JWT cookie) ─────────────

export async function getMeServer(): Promise<MeUser> {
  // Server components — forward the auth cookie automatically via Next's
  // `cookies()` is overkill here; the API route reads the JWT from the
  // request, which the server-side fetch already includes when called
  // same-origin.
  const res = await fetch(`${resolveBaseUrl()}/api/v1/auth/me`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const data = await parse<MeUser & { passwordHash?: never }>(res, "Couldn't load your profile");
  // The endpoint doesn't return passwordHash; derive hasPassword from a
  // separate signal once the endpoint exposes it. For now, optimistically
  // assume false so the form shows the "set a password" copy.
  return { ...data, hasPassword: false };
}

// ── Client-side fetchers ─────────────────────────────────────────────────

export async function getMe(): Promise<MeUser> {
  const res = await fetch("/api/v1/auth/me", {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const data = await parse<MeUser & { passwordHash?: never }>(res, "Couldn't load your profile");
  return { ...data, hasPassword: false };
}

export async function updateMe(input: UpdateMeInput): Promise<MeUser> {
  const res = await fetch("/api/v1/auth/me", {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(input),
  });
  const data = await parse<{ user: MeUser }>(res, "Couldn't save your profile");
  return data.user;
}

export async function setPassword(input: SetPasswordInput): Promise<void> {
  const res = await fetch("/api/v1/auth/password", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(input),
  });
  await parse<{ ok: true }>(res, "Couldn't set your password");
}

export async function uploadAvatar(file: Blob): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file, "avatar");
  const res = await fetch("/api/v1/uploads/avatar", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  return parse<{ url: string }>(res, "Couldn't upload that photo");
}
