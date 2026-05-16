/**
 * POST /api/v1/trainers/:trainerId/slots/generate
 * Trigger on-demand slot generation for a trainer within a date window.
 * Idempotent — safe to call multiple times; existing slots are updated.
 */
import { type NextRequest } from "next/server";
import { getAuthContext, assertPermission } from "@/lib/rbac/access-control";
import { apiSuccess, apiError, handleError, zodErrorsToDetails } from "@/lib/api-response";
import { generateSlots } from "@/lib/scheduling/scheduling-service";
import { z, ZodError } from "zod";

type RouteParams = { params: Promise<{ trainerId: string }> };

const GenerateSchema = z.object({
  serviceId: z.string(),
  from: z.string().datetime(),
  to: z.string().datetime(),
  locationId: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { trainerId } = await params;
    const ctx = getAuthContext(request);

    assertPermission(ctx, "availability:write");

    const body = await request.json();
    const data = GenerateSchema.parse(body);

    const from = new Date(data.from);
    const to = new Date(data.to);

    if (to <= from) return apiError("VALIDATION_ERROR", "to must be after from", 400);

    const rangeMs = to.getTime() - from.getTime();
    if (rangeMs > 90 * 24 * 60 * 60_000) {
      return apiError("VALIDATION_ERROR", "Date range cannot exceed 90 days", 400);
    }

    const result = await generateSlots({
      tenantId: ctx.tenantId,
      trainerId,
      serviceId: data.serviceId,
      locationId: data.locationId,
      from,
      to,
    });

    return apiSuccess(result, 200);
  } catch (err) {
    if (err instanceof ZodError) {
      return apiError("VALIDATION_ERROR", "Invalid request data", 400, zodErrorsToDetails(err));
    }
    return handleError(err);
  }
}
