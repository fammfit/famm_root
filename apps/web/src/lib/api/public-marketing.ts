import { MOCK_PROMO, MOCK_STATS } from "@/lib/marketing/mock-promo";
import type {
  AnalyticsEvent,
  LeadSubmissionInput,
  LeadSubmissionResult,
  PromoOffer,
  PromoAudience,
  PublicStats,
} from "@/lib/marketing/types";

/**
 * Client- and server-safe fetchers for the unauthenticated marketing
 * endpoints. Each function returns a fully-formed payload — falling back
 * to static mocks if the network or backend stub fails. The page must
 * never blank because a non-critical fetch missed.
 */

export class PublicApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "PublicApiError";
  }
}

function resolveBaseUrl(): string {
  if (typeof window !== "undefined") return "";
  const envUrl = process.env["NEXT_PUBLIC_APP_URL"];
  if (envUrl) return envUrl;
  return "http://localhost:3000";
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${resolveBaseUrl()}${path}`, {
    cache: "no-store",
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  });
  const body = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: T;
    error?: { code: string; message: string };
  } | null;
  if (!res.ok || !body || body.success === false) {
    const message = body?.error?.message ?? "Public API request failed";
    throw new PublicApiError(message, res.status);
  }
  return body.data as T;
}

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(`${resolveBaseUrl()}${path}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: T;
    error?: { code: string; message: string };
  } | null;
  if (!res.ok || !body || body.success === false) {
    const message = body?.error?.message ?? "Public API request failed";
    throw new PublicApiError(message, res.status);
  }
  return body.data as T;
}

// ── Promotions ───────────────────────────────────────────────────────────

export interface FetchActivePromoInput {
  slug?: string;
  audience?: PromoAudience;
}

export async function fetchActivePromo(
  input: FetchActivePromoInput = {}
): Promise<PromoOffer | null> {
  const params = new URLSearchParams();
  if (input.slug) params.set("slug", input.slug);
  params.set("audience", input.audience ?? "TRAINER");
  try {
    const data = await getJson<{ promo: PromoOffer | null }>(
      `/api/v1/public/promotions/active?${params.toString()}`
    );
    return data.promo;
  } catch {
    // Never blank the page above the fold; the page will render the
    // "no promo" variant if this resolves to null. Static mock falls
    // through in dev only.
    if (process.env.NODE_ENV === "development") {
      return MOCK_PROMO;
    }
    return null;
  }
}

// ── Stats ────────────────────────────────────────────────────────────────

export async function fetchPublicStats(): Promise<PublicStats> {
  try {
    return await getJson<PublicStats>("/api/v1/public/stats");
  } catch {
    return MOCK_STATS;
  }
}

// ── Leads ────────────────────────────────────────────────────────────────

export async function submitLead(input: LeadSubmissionInput): Promise<LeadSubmissionResult> {
  return postJson<LeadSubmissionResult>("/api/v1/public/leads", input);
}

// ── Analytics (fire-and-forget) ──────────────────────────────────────────

export async function trackEvent(event: AnalyticsEvent): Promise<void> {
  try {
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([JSON.stringify(event)], {
        type: "application/json",
      });
      navigator.sendBeacon("/api/v1/public/events", blob);
      return;
    }
    await fetch("/api/v1/public/events", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
  } catch {
    // Telemetry must never break the page.
  }
}
