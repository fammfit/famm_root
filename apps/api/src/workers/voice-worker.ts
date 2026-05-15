/**
 * Voice outbound worker.
 *
 * Listens for NATS events that should result in an outbound voice call:
 *   • `booking.confirmed`  → 24-hour reminder call
 *   • `booking.cancelled`  → waitlist fulfillment (call next eligible client)
 *   • `availability.updated` → trainer utilization nudge if next-7-day
 *     booked hours fall below the configured floor
 *
 * Run as a separate process:  `tsx apps/api/src/workers/voice-worker.ts`
 *
 * Like the payments worker, deploy with replicas=1 (or a leader lock) so a
 * single slot opening doesn't fan out into duplicate calls.
 */
import { subscribe } from "@famm/events";
import { prisma } from "@famm/db";
import {
  TwilioVoiceClient,
  placeOutboundCall,
  reminderBrief,
  waitlistBrief,
  trainerUtilizationBrief,
  type OutboundDialerDeps,
} from "@famm/ai";

const MIN_BOOKED_HOURS_PER_WEEK = parseFloat(
  process.env["TRAINER_MIN_HOURS_PER_WEEK"] ?? "10"
);

function buildDeps(): OutboundDialerDeps | null {
  const sid = process.env["TWILIO_ACCOUNT_SID"];
  const token = process.env["TWILIO_AUTH_TOKEN"];
  const callerId = process.env["TWILIO_PHONE_NUMBER"];
  const publicApiUrl = process.env["PUBLIC_API_URL"];
  if (!sid || !token || !callerId || !publicApiUrl) return null;
  return {
    twilio: new TwilioVoiceClient({ accountSid: sid, authToken: token, callerId }),
    publicApiUrl,
  };
}

async function handleBookingConfirmed(
  tenantId: string,
  bookingId: string
): Promise<void> {
  const deps = buildDeps();
  if (!deps) return;
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, tenantId },
    include: {
      service: { select: { name: true } },
      trainer: { select: { user: { select: { firstName: true, lastName: true } } } },
      client: { select: { id: true, phone: true } },
      tenant: { include: { settings: { select: { timezone: true } } } },
    },
  });
  if (!booking || !booking.client.phone) return;

  const trainerName = booking.trainer?.user
    ? `${booking.trainer.user.firstName} ${booking.trainer.user.lastName}`.trim()
    : undefined;

  await placeOutboundCall(
    {
      tenantId,
      userId: booking.client.id,
      to: booking.client.phone,
      intent: "reminder",
      brief: reminderBrief({
        serviceName: booking.service.name,
        ...(trainerName ? { trainerName } : {}),
        startAt: booking.startAt.toISOString(),
        timezone: booking.tenant.settings?.timezone ?? "UTC",
      }),
      label: `reminder:${bookingId}`,
    },
    deps
  );
}

/**
 * Waitlist fulfillment.
 *
 * The schema does not yet carry a dedicated `Waitlist` model, so we rely
 * on the event payload (published by the booking service) to supply the
 * `nextClientId` to call. If absent, we fall back to the most recently
 * cancelled-by-system pending booking for the same service+window — i.e.
 * a client who hit "I'd take this slot if it opened" at booking time.
 */
async function handleBookingCancelled(
  tenantId: string,
  payload: { bookingId: string; nextClientId?: string }
): Promise<void> {
  const deps = buildDeps();
  if (!deps) return;

  const cancelled = await prisma.booking.findFirst({
    where: { id: payload.bookingId, tenantId },
    include: {
      service: { select: { id: true, name: true } },
      tenant: { include: { settings: { select: { timezone: true } } } },
    },
  });
  if (!cancelled) return;

  let candidateClientId = payload.nextClientId;
  if (!candidateClientId) {
    // Fallback: anyone who tried to book this service in the last 24h and
    // landed on PENDING but never got confirmed. This is a heuristic; once
    // a real Waitlist model exists, replace this branch.
    const recent = await prisma.booking.findFirst({
      where: {
        tenantId,
        serviceId: cancelled.serviceId,
        status: "PENDING",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        id: { not: cancelled.id },
      },
      orderBy: { createdAt: "asc" },
      select: { clientId: true },
    });
    candidateClientId = recent?.clientId;
  }
  if (!candidateClientId) return;

  const client = await prisma.user.findFirst({
    where: {
      id: candidateClientId,
      memberships: { some: { tenantId } },
    },
    select: { id: true, phone: true },
  });
  if (!client?.phone) return;

  await placeOutboundCall(
    {
      tenantId,
      userId: client.id,
      to: client.phone,
      intent: "waitlist_fulfillment",
      brief: waitlistBrief({
        serviceName: cancelled.service.name,
        startAt: cancelled.startAt.toISOString(),
        timezone: cancelled.tenant.settings?.timezone ?? "UTC",
        holdMinutes: 15,
      }),
      label: `waitlist:${cancelled.id}`,
    },
    deps
  );
}

async function handleAvailabilityUpdated(
  tenantId: string,
  trainerId: string
): Promise<void> {
  const deps = buildDeps();
  if (!deps) return;

  const trainer = await prisma.trainerProfile.findFirst({
    where: { id: trainerId },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, phone: true } },
    },
  });
  if (!trainer?.user.phone) return;

  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Sum the service duration for every booking on this trainer's calendar
  // in the next 7 days. We use a grouped count + join because the booking
  // row doesn't carry duration directly — it lives on Service.
  const bookings = await prisma.booking.findMany({
    where: {
      tenantId,
      trainerId,
      status: { in: ["CONFIRMED", "PENDING"] },
      startAt: { gte: now, lt: weekLater },
    },
    select: { service: { select: { durationMinutes: true } } },
  });
  let bookedMinutes = 0;
  for (const b of bookings as Array<{ service: { durationMinutes: number | null } }>) {
    bookedMinutes += b.service.durationMinutes ?? 0;
  }
  const bookedHours = bookedMinutes / 60;
  if (bookedHours >= MIN_BOOKED_HOURS_PER_WEEK) return;

  // Crude utilization estimate against the policy floor. The brief is
  // human-readable, not a strict KPI — the assistant uses it to frame the
  // conversation, not to bill or rank.
  const utilizationPercent = Math.min(
    100,
    Math.round((bookedHours / MIN_BOOKED_HOURS_PER_WEEK) * 100)
  );

  await placeOutboundCall(
    {
      tenantId,
      userId: trainer.user.id,
      to: trainer.user.phone,
      intent: "trainer_utilization",
      brief: trainerUtilizationBrief({
        trainerName: `${trainer.user.firstName} ${trainer.user.lastName}`.trim(),
        utilizationPercent,
        weekStarting: now.toISOString().slice(0, 10),
      }),
      label: `utilization:${trainerId}`,
    },
    deps
  );
}

async function main(): Promise<void> {
  const tenants = await prisma.tenant.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });

  for (const tenant of tenants) {
    await subscribe<{ bookingId: string }>(
      tenant.id,
      "booking.confirmed",
      async (event) => {
        try {
          await handleBookingConfirmed(event.tenantId, event.payload.bookingId);
        } catch (err) {
          console.error("[voice-worker] booking.confirmed failed", err);
        }
      }
    );
    await subscribe<{ bookingId: string; nextClientId?: string }>(
      tenant.id,
      "booking.cancelled",
      async (event) => {
        try {
          await handleBookingCancelled(event.tenantId, event.payload);
        } catch (err) {
          console.error("[voice-worker] booking.cancelled failed", err);
        }
      }
    );
    await subscribe<{ trainerId: string }>(
      tenant.id,
      "availability.updated",
      async (event) => {
        try {
          await handleAvailabilityUpdated(event.tenantId, event.payload.trainerId);
        } catch (err) {
          console.error("[voice-worker] availability.updated failed", err);
        }
      }
    );
  }

  console.warn(`[voice-worker] subscribed to events for ${tenants.length} tenant(s)`);
}

if (require.main === module) {
  void main().catch((err) => {
    console.error("[voice-worker] startup failed", err);
    process.exit(1);
  });
}

export {
  handleBookingConfirmed,
  handleBookingCancelled,
  handleAvailabilityUpdated,
};
