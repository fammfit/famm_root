import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import {
  generateSlotCandidates,
  materializeSlots,
  blackoutSlots,
  computeSlotStatus,
} from "@/lib/scheduling/slot-generator";
import { acquireHold, releaseHold, getActiveHoldCount, HOLD_TTL_SEC } from "@/lib/scheduling/booking-hold";
import { joinWaitlist, leaveWaitlist, getWaitlistPosition, promoteFromWaitlist } from "@/lib/scheduling/waitlist";
import {
  joinSlotWaitlist,
  onBookingCancelled,
} from "@/lib/scheduling/scheduling-service";

// ── Test factory helpers ──────────────────────────────────────────────────────

let _counter = 0;
const uid = () => `test-sched-${Date.now()}-${++_counter}`;

async function createTenant() {
  const id = uid();
  const tenant = await prisma.tenant.create({
    data: { id, name: `Sched Tenant ${id}`, slug: id, plan: "FREE" },
  });
  await prisma.tenantSettings.create({
    data: {
      tenantId: id,
      timezone: "UTC",
      currency: "USD",
      locale: "en-US",
      bookingLeadTimeMinutes: 0, // Disable lead time for predictable test slots
      bookingWindowDays: 365,
    },
  });
  return tenant;
}

async function createTrainer(tenantId: string) {
  const user = await prisma.user.create({
    data: { email: `${uid()}@test.example`, firstName: "Trainer", lastName: uid() },
  });
  await prisma.tenantMembership.create({
    data: { tenantId, userId: user.id, role: "TRAINER" },
  });
  return prisma.trainerProfile.create({ data: { userId: user.id } });
}

async function createClient(tenantId: string) {
  const user = await prisma.user.create({
    data: { email: `${uid()}@test.example`, firstName: "Client", lastName: uid() },
  });
  await prisma.tenantMembership.create({
    data: { tenantId, userId: user.id, role: "CLIENT" },
  });
  return user;
}

async function createService(tenantId: string, overrides: { durationMinutes?: number; maxParticipants?: number } = {}) {
  return prisma.service.create({
    data: {
      tenantId,
      name: `Service ${uid()}`,
      durationMinutes: overrides.durationMinutes ?? 60,
      maxParticipants: overrides.maxParticipants ?? 1,
      bufferAfterMinutes: 0,
      bufferBeforeMinutes: 0,
      basePrice: 50,
    },
  });
}

async function createAvailabilityRule(
  tenantId: string,
  trainerId: string,
  serviceId: string,
  dayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY",
  startTime = "09:00",
  endTime = "12:00"
) {
  return prisma.availabilityRule.create({
    data: {
      tenantId,
      trainerId,
      serviceId,
      dayOfWeek,
      startTime,
      endTime,
      timezone: "UTC",
      isActive: true,
    },
  });
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(async () => {
  // Clean Redis test keys
  const keys = await redis.keys("*test-sched*");
  if (keys.length > 0) await redis.del(...keys);
  // Also clean slot hold keys from previous runs
  const holdKeys = await redis.keys("slot:hold:*");
  if (holdKeys.length > 0) await redis.del(...holdKeys);
  const holdsKeys = await redis.keys("slot:holds:*");
  if (holdsKeys.length > 0) await redis.del(...holdsKeys);
});

// ── Slot generation ───────────────────────────────────────────────────────────

describe("generateSlotCandidates", () => {
  it("generates slots for an availability rule", async () => {
    const tenant = await createTenant();
    const trainer = await createTrainer(tenant.id);
    const service = await createService(tenant.id, { durationMinutes: 60 });

    // 2024-06-03 is a Monday
    await createAvailabilityRule(tenant.id, trainer.id, service.id, "MONDAY", "09:00", "12:00");

    const from = new Date("2024-06-03T00:00:00Z");
    const to = new Date("2024-06-03T23:59:59Z");
    const now = new Date("2024-01-01T00:00:00Z"); // Far in the past to avoid lead-time filtering

    const candidates = await generateSlotCandidates({
      tenantId: tenant.id,
      trainerId: trainer.id,
      serviceId: service.id,
      from,
      to,
      now,
    });

    // 09:00-10:00, 10:00-11:00, 11:00-12:00 = 3 slots
    expect(candidates.length).toBe(3);
    expect(candidates[0]!.startsAt.toISOString()).toBe("2024-06-03T09:00:00.000Z");
    expect(candidates[2]!.startsAt.toISOString()).toBe("2024-06-03T11:00:00.000Z");
  });

  it("excludes slots overlapping a blocked period", async () => {
    const tenant = await createTenant();
    const trainer = await createTrainer(tenant.id);
    const service = await createService(tenant.id);

    await createAvailabilityRule(tenant.id, trainer.id, service.id, "MONDAY", "09:00", "12:00");
    await prisma.blockedPeriod.create({
      data: {
        tenantId: tenant.id,
        trainerId: trainer.id,
        startAt: new Date("2024-06-03T10:00:00Z"),
        endAt: new Date("2024-06-03T10:30:00Z"),
        timezone: "UTC",
        isRecurring: false,
      },
    });

    const from = new Date("2024-06-03T00:00:00Z");
    const to = new Date("2024-06-03T23:59:59Z");
    const now = new Date("2024-01-01T00:00:00Z");

    const candidates = await generateSlotCandidates({
      tenantId: tenant.id,
      trainerId: trainer.id,
      serviceId: service.id,
      from,
      to,
      now,
    });

    // 10:00 slot is blocked; should have 09:00 and 11:00 only
    expect(candidates.length).toBe(2);
    const startTimes = candidates.map((c) => c.startsAt.toISOString());
    expect(startTimes).not.toContain("2024-06-03T10:00:00.000Z");
  });

  it("respects booking lead time", async () => {
    const tenant = await createTenant();
    const trainer = await createTrainer(tenant.id);
    const service = await createService(tenant.id);

    await createAvailabilityRule(tenant.id, trainer.id, service.id, "MONDAY", "09:00", "12:00");

    // Settings: 120 min lead time
    await prisma.tenantSettings.update({
      where: { tenantId: tenant.id },
      data: { bookingLeadTimeMinutes: 120 },
    });

    // Now = 09:30 on that Monday — first slot (09:00) is within lead time, skip it
    const now = new Date("2024-06-03T09:30:00Z");
    const from = new Date("2024-06-03T00:00:00Z");
    const to = new Date("2024-06-03T23:59:59Z");

    const candidates = await generateSlotCandidates({
      tenantId: tenant.id,
      trainerId: trainer.id,
      serviceId: service.id,
      from,
      to,
      now,
    });

    // earliest = 09:30 + 120 min = 11:30 → only 11:00 slot qualifies... wait
    // earliest = 11:30, so 09:00 and 10:00 and 11:00 are all < 11:30 → none qualify
    expect(candidates.length).toBe(0);
  });

  it("does not generate slots for inactive service", async () => {
    const tenant = await createTenant();
    const trainer = await createTrainer(tenant.id);
    const service = await prisma.service.create({
      data: { tenantId: tenant.id, name: "Inactive", durationMinutes: 60, basePrice: 0, isActive: false },
    });
    await createAvailabilityRule(tenant.id, trainer.id, service.id, "MONDAY");

    const candidates = await generateSlotCandidates({
      tenantId: tenant.id,
      trainerId: trainer.id,
      serviceId: service.id,
      from: new Date("2024-06-03T00:00:00Z"),
      to: new Date("2024-06-03T23:59:59Z"),
      now: new Date("2024-01-01T00:00:00Z"),
    });

    expect(candidates).toHaveLength(0);
  });
});

describe("materializeSlots", () => {
  it("creates GeneratedSlot records from candidates", async () => {
    const tenant = await createTenant();
    const trainer = await createTrainer(tenant.id);
    const service = await createService(tenant.id);
    await createAvailabilityRule(tenant.id, trainer.id, service.id, "MONDAY");

    const candidates = await generateSlotCandidates({
      tenantId: tenant.id,
      trainerId: trainer.id,
      serviceId: service.id,
      from: new Date("2024-06-03T00:00:00Z"),
      to: new Date("2024-06-03T23:59:59Z"),
      now: new Date("2024-01-01T00:00:00Z"),
    });

    const { created, updated } = await materializeSlots(candidates);
    expect(created).toBeGreaterThan(0);
    expect(updated).toBe(0);

    const inDb = await prisma.generatedSlot.count({
      where: { tenantId: tenant.id, trainerId: trainer.id },
    });
    expect(inDb).toBe(created);
  });

  it("updates (not duplicates) on second call for same slots", async () => {
    const tenant = await createTenant();
    const trainer = await createTrainer(tenant.id);
    const service = await createService(tenant.id);
    await createAvailabilityRule(tenant.id, trainer.id, service.id, "MONDAY");

    const opts = {
      tenantId: tenant.id,
      trainerId: trainer.id,
      serviceId: service.id,
      from: new Date("2024-06-03T00:00:00Z"),
      to: new Date("2024-06-03T23:59:59Z"),
      now: new Date("2024-01-01T00:00:00Z"),
    };

    const candidates = await generateSlotCandidates(opts);
    const first = await materializeSlots(candidates);
    const second = await materializeSlots(candidates);

    expect(second.created).toBe(0);
    expect(second.updated).toBe(first.created);
  });
});

// ── Booking holds ─────────────────────────────────────────────────────────────

describe("Booking holds", () => {
  async function makeSlot(tenantId: string, trainerId: string, serviceId: string) {
    return prisma.generatedSlot.create({
      data: {
        tenantId,
        trainerId,
        serviceId,
        startsAt: new Date("2024-07-01T09:00:00Z"),
        endsAt: new Date("2024-07-01T10:00:00Z"),
        timezone: "UTC",
        capacity: 2,
        status: "AVAILABLE",
      },
    });
  }

  it("acquires a hold and returns a holdId", async () => {
    const tenant = await createTenant();
    const trainer = await createTrainer(tenant.id);
    const service = await createService(tenant.id);
    const client = await createClient(tenant.id);
    const slot = await makeSlot(tenant.id, trainer.id, service.id);

    const hold = await acquireHold(slot.id, client.id);
    expect(hold).not.toBeNull();
    expect(hold!.holdId).toBeTruthy();
    expect(hold!.slotId).toBe(slot.id);
    expect(hold!.userId).toBe(client.id);
  });

  it("idempotent — re-acquiring returns same holdId", async () => {
    const tenant = await createTenant();
    const trainer = await createTrainer(tenant.id);
    const service = await createService(tenant.id);
    const client = await createClient(tenant.id);
    const slot = await makeSlot(tenant.id, trainer.id, service.id);

    const h1 = await acquireHold(slot.id, client.id);
    const h2 = await acquireHold(slot.id, client.id);
    expect(h1!.holdId).toBe(h2!.holdId);
  });

  it("blocks hold when capacity is full", async () => {
    const tenant = await createTenant();
    const trainer = await createTrainer(tenant.id);
    const service = await createService(tenant.id);
    const c1 = await createClient(tenant.id);
    const c2 = await createClient(tenant.id);
    const c3 = await createClient(tenant.id);
    const slot = await makeSlot(tenant.id, trainer.id, service.id); // capacity=2

    await acquireHold(slot.id, c1.id);
    await acquireHold(slot.id, c2.id);

    const h3 = await acquireHold(slot.id, c3.id);
    expect(h3).toBeNull();
  });

  it("releases a hold, freeing capacity", async () => {
    const tenant = await createTenant();
    const trainer = await createTrainer(tenant.id);
    const service = await createService(tenant.id);
    const c1 = await createClient(tenant.id);
    const c2 = await createClient(tenant.id);
    const c3 = await createClient(tenant.id);
    const slot = await makeSlot(tenant.id, trainer.id, service.id); // capacity=2

    await acquireHold(slot.id, c1.id);
    await acquireHold(slot.id, c2.id);
    await releaseHold(slot.id, c1.id);

    const h3 = await acquireHold(slot.id, c3.id);
    expect(h3).not.toBeNull();
  });

  it("getActiveHoldCount returns current hold count", async () => {
    const tenant = await createTenant();
    const trainer = await createTrainer(tenant.id);
    const service = await createService(tenant.id);
    const c1 = await createClient(tenant.id);
    const c2 = await createClient(tenant.id);
    const slot = await makeSlot(tenant.id, trainer.id, service.id);

    expect(await getActiveHoldCount(slot.id)).toBe(0);
    await acquireHold(slot.id, c1.id);
    expect(await getActiveHoldCount(slot.id)).toBe(1);
    await acquireHold(slot.id, c2.id);
    expect(await getActiveHoldCount(slot.id)).toBe(2);
    await releaseHold(slot.id, c1.id);
    expect(await getActiveHoldCount(slot.id)).toBe(1);
  });
});

// ── Waitlist ──────────────────────────────────────────────────────────────────

describe("Waitlist management", () => {
  async function makeFullSlot(tenantId: string, trainerId: string, serviceId: string) {
    return prisma.generatedSlot.create({
      data: {
        tenantId,
        trainerId,
        serviceId,
        startsAt: new Date("2024-07-15T10:00:00Z"),
        endsAt: new Date("2024-07-15T11:00:00Z"),
        timezone: "UTC",
        capacity: 1,
        bookedCount: 1,
        status: "FULLY_BOOKED",
      },
    });
  }

  it("joins waitlist and returns position", async () => {
    const tenant = await createTenant();
    const trainer = await createTrainer(tenant.id);
    const service = await createService(tenant.id);
    const client = await createClient(tenant.id);
    const slot = await makeFullSlot(tenant.id, trainer.id, service.id);

    const entry = await joinWaitlist(slot.id, client.id, tenant.id);
    expect(entry.position).toBe(1);
    expect(entry.userId).toBe(client.id);
  });

  it("assigns sequential positions to multiple users", async () => {
    const tenant = await createTenant();
    const trainer = await createTrainer(tenant.id);
    const service = await createService(tenant.id);
    const c1 = await createClient(tenant.id);
    const c2 = await createClient(tenant.id);
    const c3 = await createClient(tenant.id);
    const slot = await makeFullSlot(tenant.id, trainer.id, service.id);

    const e1 = await joinWaitlist(slot.id, c1.id, tenant.id);
    const e2 = await joinWaitlist(slot.id, c2.id, tenant.id);
    const e3 = await joinWaitlist(slot.id, c3.id, tenant.id);

    expect(e1.position).toBe(1);
    expect(e2.position).toBe(2);
    expect(e3.position).toBe(3);
  });

  it("joinWaitlist is idempotent", async () => {
    const tenant = await createTenant();
    const trainer = await createTrainer(tenant.id);
    const service = await createService(tenant.id);
    const client = await createClient(tenant.id);
    const slot = await makeFullSlot(tenant.id, trainer.id, service.id);

    const e1 = await joinWaitlist(slot.id, client.id, tenant.id);
    const e2 = await joinWaitlist(slot.id, client.id, tenant.id);
    expect(e1.entryId).toBe(e2.entryId);
    expect(e1.position).toBe(e2.position);
  });

  it("leaveWaitlist removes user and re-sequences remaining", async () => {
    const tenant = await createTenant();
    const trainer = await createTrainer(tenant.id);
    const service = await createService(tenant.id);
    const c1 = await createClient(tenant.id);
    const c2 = await createClient(tenant.id);
    const slot = await makeFullSlot(tenant.id, trainer.id, service.id);

    await joinWaitlist(slot.id, c1.id, tenant.id);
    await joinWaitlist(slot.id, c2.id, tenant.id);
    await leaveWaitlist(slot.id, c1.id);

    const pos = await getWaitlistPosition(slot.id, c2.id);
    expect(pos).toBe(1); // Re-sequenced after c1 leaves
  });

  it("promoteFromWaitlist marks entries as notified", async () => {
    const tenant = await createTenant();
    const trainer = await createTrainer(tenant.id);
    const service = await createService(tenant.id);
    const c1 = await createClient(tenant.id);
    const c2 = await createClient(tenant.id);
    const slot = await makeFullSlot(tenant.id, trainer.id, service.id);

    await joinWaitlist(slot.id, c1.id, tenant.id);
    await joinWaitlist(slot.id, c2.id, tenant.id);

    const promoted = await promoteFromWaitlist(slot.id, 1);
    expect(promoted).toHaveLength(1);
    expect(promoted[0]!.userId).toBe(c1.id);
    expect(promoted[0]!.notifiedAt).not.toBeNull();
    expect(promoted[0]!.expiresAt).not.toBeNull();
  });
});

// ── Blackout ──────────────────────────────────────────────────────────────────

describe("blackoutSlots", () => {
  it("marks AVAILABLE slots in range as BLACKOUT", async () => {
    const tenant = await createTenant();
    const trainer = await createTrainer(tenant.id);
    const service = await createService(tenant.id);

    await prisma.generatedSlot.createMany({
      data: [
        { tenantId: tenant.id, trainerId: trainer.id, serviceId: service.id,
          startsAt: new Date("2024-08-01T09:00:00Z"), endsAt: new Date("2024-08-01T10:00:00Z"),
          timezone: "UTC", status: "AVAILABLE", capacity: 1 },
        { tenantId: tenant.id, trainerId: trainer.id, serviceId: service.id,
          startsAt: new Date("2024-08-01T10:00:00Z"), endsAt: new Date("2024-08-01T11:00:00Z"),
          timezone: "UTC", status: "AVAILABLE", capacity: 1 },
      ],
    });

    const count = await blackoutSlots(
      tenant.id,
      trainer.id,
      new Date("2024-08-01T00:00:00Z"),
      new Date("2024-08-01T23:59:59Z")
    );
    expect(count).toBe(2);

    const slots = await prisma.generatedSlot.findMany({
      where: { tenantId: tenant.id, trainerId: trainer.id },
    });
    slots.forEach((s) => expect(s.status).toBe("BLACKOUT"));
  });

  it("does not blackout slots with existing bookings", async () => {
    const tenant = await createTenant();
    const trainer = await createTrainer(tenant.id);
    const service = await createService(tenant.id);

    await prisma.generatedSlot.create({
      data: {
        tenantId: tenant.id,
        trainerId: trainer.id,
        serviceId: service.id,
        startsAt: new Date("2024-08-02T09:00:00Z"),
        endsAt: new Date("2024-08-02T10:00:00Z"),
        timezone: "UTC",
        status: "FULLY_BOOKED",
        capacity: 1,
        bookedCount: 1,
      },
    });

    const count = await blackoutSlots(
      tenant.id,
      trainer.id,
      new Date("2024-08-02T00:00:00Z"),
      new Date("2024-08-02T23:59:59Z")
    );
    expect(count).toBe(0);
  });
});
