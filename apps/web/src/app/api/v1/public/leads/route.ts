/**
 * POST /api/v1/public/leads
 *
 * STUB. Validates the input and logs it; real implementation will write
 * a `Lead` row and trigger the welcome-email + ops-notification flows.
 *
 * Honeypot: any non-empty `company` field marks the request as bot
 * traffic. We still respond 200 to avoid signalling.
 *
 * Rate limiting: real impl gates 5 submissions / 10 min / IP.
 */
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const LeadSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z
      .string()
      .regex(/^\+?[1-9]\d{6,19}$/)
      .optional(),
    source: z.string().min(1).max(64),
    promoSlug: z.string().max(64).optional(),
    refCode: z.string().max(64).optional(),
    metadata: z.record(z.unknown()).optional(),
    company: z.string().optional(),
  })
  .refine((v) => v.email || v.phone, {
    message: "Either email or phone is required",
    path: ["email"],
  });

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: "BAD_REQUEST", message: "Invalid JSON body" },
      },
      { status: 400 }
    );
  }

  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid lead submission",
          details: parsed.error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
      },
      { status: 422 }
    );
  }

  // Honeypot — silently accept so the bot doesn't retry against the next
  // form variant.
  if (parsed.data.company && parsed.data.company.length > 0) {
    return NextResponse.json({
      success: true,
      data: { id: `bot_${Date.now()}`, deduped: true },
      meta: { timestamp: new Date().toISOString(), version: "1.0" },
    });
  }

  console.warn(
    "[public/leads] STUB — would persist lead",
    JSON.stringify({
      source: parsed.data.source,
      promoSlug: parsed.data.promoSlug,
      hasEmail: Boolean(parsed.data.email),
      hasPhone: Boolean(parsed.data.phone),
    })
  );

  return NextResponse.json({
    success: true,
    data: { id: `lead_${Date.now()}`, deduped: false },
    meta: { timestamp: new Date().toISOString(), version: "1.0" },
  });
}
