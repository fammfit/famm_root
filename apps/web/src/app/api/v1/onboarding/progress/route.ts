/**
 * GET  /api/v1/onboarding/progress  — read or lazily create the row
 * PATCH /api/v1/onboarding/progress — mutate (complete | skip | patch | current)
 *
 * STUB. Uses an in-memory store keyed by tenantId.
 * TODO(onboarding-model): swap for a Prisma model on first real use.
 */
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext } from "@/lib/request-context";
import { getOrCreateProgress, patchProgress } from "@/lib/onboarding/mock-progress";

const ProgressPatchSchema = z.object({
  slug: z.string().optional(),
  action: z.enum(["complete", "skip", "patch", "current"]),
  stepData: z.record(z.unknown()).optional(),
});

const ALLOWED_ROLES = new Set(["TENANT_OWNER", "TENANT_ADMIN", "SUPER_ADMIN"]);

function envelope<T>(data: T) {
  return {
    success: true,
    data,
    meta: { timestamp: new Date().toISOString(), version: "1.0" },
  };
}

function authError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function GET() {
  let ctx;
  try {
    ctx = getRequestContext();
  } catch {
    return authError("UNAUTHORIZED", "Not signed in", 401);
  }
  if (!ALLOWED_ROLES.has(ctx.userRole)) {
    return authError("FORBIDDEN", "Onboarding is for tenant owners", 403);
  }
  const progress = getOrCreateProgress(ctx.tenantId, ctx.userId);
  return NextResponse.json(envelope(progress));
}

export async function PATCH(request: NextRequest) {
  let ctx;
  try {
    ctx = getRequestContext();
  } catch {
    return authError("UNAUTHORIZED", "Not signed in", 401);
  }
  if (!ALLOWED_ROLES.has(ctx.userRole)) {
    return authError("FORBIDDEN", "Onboarding is for tenant owners", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return authError("BAD_REQUEST", "Invalid JSON body", 400);
  }
  const parsed = ProgressPatchSchema.safeParse(body);
  if (!parsed.success) {
    return authError("VALIDATION_ERROR", "Invalid patch", 422);
  }

  const progress = patchProgress(ctx.tenantId, ctx.userId, parsed.data as never);
  return NextResponse.json(envelope(progress));
}
