/**
 * POST /api/v1/public/events
 *
 * STUB. First-party analytics ping for the marketing surface (page views,
 * CTA clicks, lead submits, promo misses). Real impl writes to the
 * platform analytics store; for now we log and ack.
 *
 * Accepts both JSON bodies and navigator.sendBeacon blobs.
 */
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const text = await request.text();
    if (text) {
      // Parse-or-ignore — telemetry never blocks the page.
      try {
        const payload = JSON.parse(text) as { name?: string };
        if (payload?.name) {
          console.warn(`[public/events] STUB — ${payload.name}`, text.slice(0, 240));
        }
      } catch {
        console.warn("[public/events] STUB — non-JSON payload");
      }
    }
  } catch {
    // Body read failed — still ack.
  }
  return NextResponse.json({
    success: true,
    data: { ok: true },
    meta: { timestamp: new Date().toISOString(), version: "1.0" },
  });
}
