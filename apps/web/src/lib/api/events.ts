/**
 * First-party analytics tracker. Fire-and-forget; never throws.
 *
 * Endpoint: POST /api/v1/public/events (stub today; will graduate to a
 * tenant-aware /api/v1/events when authed surfaces start emitting volume).
 */

export interface AnalyticsEvent {
  name: string;
  payload?: Record<string, unknown>;
}

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
