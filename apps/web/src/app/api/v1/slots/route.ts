import { type NextRequest } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { apiSuccess, handleError } from "@/lib/api-response";
import { GetSlotsSchema } from "@famm/shared";
import { generateAvailableSlots } from "@/lib/booking/slot-generator";

export async function GET(request: NextRequest) {
  try {
    const ctx = getRequestContext();
    const { searchParams } = new URL(request.url);

    const input = GetSlotsSchema.parse({
      serviceId: searchParams.get("serviceId"),
      trainerId: searchParams.get("trainerId"),
      locationId: searchParams.get("locationId"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      timezone: searchParams.get("timezone") ?? "UTC",
    });

    const slots = await generateAvailableSlots({
      tenantId: ctx.tenantId,
      ...input,
    });

    return apiSuccess(slots);
  } catch (err) {
    return handleError(err);
  }
}
