import { type NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContextChecked } from "@/lib/request-context";
import { apiSuccess, handleError } from "@/lib/api-response";
import { joinWaitlist } from "@/lib/booking/waitlist";

const JoinSchema = z.object({
  serviceId: z.string().cuid(),
  trainerId: z.string().cuid().optional(),
  locationId: z.string().cuid().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await getRequestContextChecked();
    const body = (await request.json()) as unknown;
    const input = JoinSchema.parse(body);

    const entry = await joinWaitlist({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      ...input,
    });

    return apiSuccess(
      {
        id: entry.id,
        serviceId: entry.serviceId,
        startAt: entry.startAt,
        endAt: entry.endAt,
        status: entry.status,
        position: entry.position,
      },
      201
    );
  } catch (err) {
    return handleError(err);
  }
}
