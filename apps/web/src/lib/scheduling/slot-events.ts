/**
 * NATS event publishing for scheduling domain events.
 * Fire-and-forget — scheduling operations never block on event delivery.
 */
import { publish } from "@famm/events";
import { randomUUID } from "crypto";

type SlotEventPayload = Record<string, unknown>;

function makeEvent(
  tenantId: string,
  type: string,
  aggregateId: string,
  payload: SlotEventPayload
) {
  return {
    id: randomUUID(),
    tenantId,
    type: type as never, // DomainEventType is a string union; cast for extensibility
    aggregateId,
    aggregateType: "GeneratedSlot",
    payload,
    occurredAt: new Date().toISOString(),
  };
}

export async function publishSlotGenerated(
  tenantId: string,
  slotId: string,
  payload: { trainerId: string | null; serviceId: string; count: number }
): Promise<void> {
  await publish(makeEvent(tenantId, "slot.generated", slotId, payload)).catch(
    (err) => console.error("[slot-events] publish slot.generated failed", err)
  );
}

export async function publishSlotCancelled(
  tenantId: string,
  slotId: string,
  payload: { reason?: string; affectedBookingIds: string[] }
): Promise<void> {
  await publish(makeEvent(tenantId, "slot.cancelled", slotId, payload)).catch(
    (err) => console.error("[slot-events] publish slot.cancelled failed", err)
  );
}

export async function publishSlotUpdated(
  tenantId: string,
  slotId: string,
  payload: { status: string; bookedCount: number; capacity: number }
): Promise<void> {
  await publish(makeEvent(tenantId, "slot.updated", slotId, payload)).catch(
    (err) => console.error("[slot-events] publish slot.updated failed", err)
  );
}

export async function publishHoldAcquired(
  tenantId: string,
  slotId: string,
  payload: { userId: string; holdId: string; expiresAt: string }
): Promise<void> {
  await publish(makeEvent(tenantId, "booking_hold.acquired", slotId, payload)).catch(
    (err) => console.error("[slot-events] publish booking_hold.acquired failed", err)
  );
}

export async function publishWaitlistJoined(
  tenantId: string,
  slotId: string,
  payload: { userId: string; position: number }
): Promise<void> {
  await publish(makeEvent(tenantId, "waitlist.joined", slotId, payload)).catch(
    (err) => console.error("[slot-events] publish waitlist.joined failed", err)
  );
}

export async function publishWaitlistPromoted(
  tenantId: string,
  slotId: string,
  payload: { promotedUserIds: string[]; expiresAt: string }
): Promise<void> {
  await publish(makeEvent(tenantId, "waitlist.promoted", slotId, payload)).catch(
    (err) => console.error("[slot-events] publish waitlist.promoted failed", err)
  );
}
