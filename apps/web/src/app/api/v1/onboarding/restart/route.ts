/**
 * POST /api/v1/onboarding/restart
 *
 * Wipes the trainer's onboarding progress (TENANT_OWNER only).
 * Increments restartCount for audit visibility.
 */
import { NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { restart } from "@/lib/onboarding/mock-progress";

export async function POST() {
  let ctx;
  try {
    ctx = getRequestContext();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not signed in" } },
      { status: 401 }
    );
  }
  if (ctx.userRole !== "TENANT_OWNER" && ctx.userRole !== "SUPER_ADMIN") {
    return NextResponse.json(
      {
        success: false,
        error: { code: "FORBIDDEN", message: "Only the owner can restart onboarding" },
      },
      { status: 403 }
    );
  }
  const progress = restart(ctx.tenantId, ctx.userId);
  return NextResponse.json({
    success: true,
    data: progress,
    meta: { timestamp: new Date().toISOString(), version: "1.0" },
  });
}
