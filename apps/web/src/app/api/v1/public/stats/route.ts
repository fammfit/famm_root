/**
 * GET /api/v1/public/stats
 *
 * STUB. Returns the static MOCK_STATS payload. Replace with live counts
 * (cached for 5 min) once the analytics surface exists. Never include
 * tenant-identifying numbers — these are platform-wide aggregates.
 */
import { NextResponse } from "next/server";
import { MOCK_STATS } from "@/lib/marketing/mock-promo";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: MOCK_STATS,
    meta: { timestamp: new Date().toISOString(), version: "1.0" },
  });
}
