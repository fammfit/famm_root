/**
 * POST /api/v1/onboarding/complete
 *
 * Marks the flow complete. Errors if any required step is still missing
 * (unless `?override=true` is supplied by a super-admin).
 */
import { type NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { getOrCreateProgress, markComplete } from "@/lib/onboarding/mock-progress";
import { requiredStepsRemaining } from "@/lib/onboarding/steps";

const ALLOWED_ROLES = new Set(["TENANT_OWNER", "TENANT_ADMIN", "SUPER_ADMIN"]);

export async function POST(request: NextRequest) {
  let ctx;
  try {
    ctx = getRequestContext();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not signed in" } },
      { status: 401 }
    );
  }
  if (!ALLOWED_ROLES.has(ctx.userRole)) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Onboarding is for tenant owners" } },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const override = searchParams.get("override") === "true" && ctx.userRole === "SUPER_ADMIN";

  const current = getOrCreateProgress(ctx.tenantId, ctx.userId);
  const remaining = requiredStepsRemaining(current.completedSteps);
  if (remaining.length > 0 && !override) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "REQUIRED_STEPS_MISSING",
          message: `Still required: ${remaining.map((s) => s.slug).join(", ")}`,
        },
      },
      { status: 409 }
    );
  }

  const progress = markComplete(ctx.tenantId, ctx.userId, { override });
  return NextResponse.json({
    success: true,
    data: { progress, redirectTo: "/dashboard?onboarding=done" },
    meta: { timestamp: new Date().toISOString(), version: "1.0" },
  });
}
