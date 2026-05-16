/**
 * GET /api/v1/public/promotions/active
 *
 * STUB. Returns the static MOCK_PROMO with `expiresAt` resolved to 7 days
 * from request time so the countdown demo doesn't stale during local dev.
 * Replace the body with a real Prisma query once the PromoOffer model
 * lands.
 *
 * Query:
 *   slug      — optional promo slug override (campaign URL).
 *   audience  — TRAINER | CLIENT | ALL. Defaults to TRAINER.
 */
import { type NextRequest, NextResponse } from "next/server";
import { MOCK_PROMO } from "@/lib/marketing/mock-promo";
import type { PromoOffer } from "@/lib/marketing/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const audience = searchParams.get("audience") ?? "TRAINER";

  // Demo expiry: 7d from now. Real backend will read from the model.
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const promo: PromoOffer | null =
    audience === "TRAINER" || audience === "ALL" ? { ...MOCK_PROMO, expiresAt } : null;

  return NextResponse.json({
    success: true,
    data: { promo },
    meta: { timestamp: new Date().toISOString(), version: "1.0" },
  });
}
