import { type NextRequest } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import { leaveWaitlist } from "@/lib/booking/waitlist";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = getRequestContext();
    const removed = await leaveWaitlist(params.id, ctx.tenantId, ctx.userId);
    if (!removed) return apiError("NOT_FOUND", "Waitlist entry not found", 404);
    return apiSuccess({ id: params.id });
  } catch (err) {
    return handleError(err);
  }
}
