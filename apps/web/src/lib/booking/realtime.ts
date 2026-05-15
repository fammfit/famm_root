import { redis } from "@/lib/redis";

/**
 * Redis pub/sub fan-out for booking realtime events. Producers publish on
 * `realtime:{tenantId}`; SSE/WebSocket connections subscribe to that channel
 * and forward JSON-encoded events to the client.
 */

export type RealtimeEvent =
  | {
      type: "SLOT_UPDATED";
      serviceId: string;
      trainerId?: string;
      startAt: string;
      endAt: string;
      available: boolean;
    }
  | {
      type: "BOOKING_CREATED" | "BOOKING_CANCELLED" | "BOOKING_RESCHEDULED";
      bookingId: string;
      serviceId: string;
      startAt: string;
      endAt: string;
    }
  | {
      type: "WAITLIST_NOTIFIED";
      waitlistId: string;
      serviceId: string;
      startAt: string;
      endAt: string;
    };

const channel = (tenantId: string) => `realtime:${tenantId}`;

export async function publishEvent(
  tenantId: string,
  event: RealtimeEvent
): Promise<void> {
  await redis.publish(channel(tenantId), JSON.stringify(event));
}

export function tenantChannel(tenantId: string): string {
  return channel(tenantId);
}
