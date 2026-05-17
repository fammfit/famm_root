/**
 * GET   /api/v1/account/tax-settings
 * PATCH /api/v1/account/tax-settings
 *
 * STUB.
 */
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTax, updateTax } from "@/lib/account/mock-account-store";
import { ok, error, resolveCtx, requireAdmin } from "@/lib/account/route-helpers";

const PatchSchema = z.object({
  inclusive: z.boolean().optional(),
  defaultRateBps: z.number().int().min(0).max(10000).optional(),
  invoiceFromName: z.string().max(120).optional(),
  invoiceFromAddress: z.string().max(500).optional(),
});

export async function GET() {
  const ctxOrRes = resolveCtx();
  if (ctxOrRes instanceof NextResponse) return ctxOrRes;
  const forbidden = requireAdmin(ctxOrRes);
  if (forbidden) return forbidden;
  return ok({ tax: getTax(ctxOrRes.tenantId, ctxOrRes.userId, ctxOrRes.userEmail) });
}

export async function PATCH(request: NextRequest) {
  const ctxOrRes = resolveCtx();
  if (ctxOrRes instanceof NextResponse) return ctxOrRes;
  const forbidden = requireAdmin(ctxOrRes);
  if (forbidden) return forbidden;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("BAD_REQUEST", "Invalid JSON body", 400);
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return error("VALIDATION_ERROR", "Invalid patch", 422);
  }
  const tax = updateTax(ctxOrRes.tenantId, ctxOrRes.userId, ctxOrRes.userEmail, parsed.data);
  return ok({ tax });
}
