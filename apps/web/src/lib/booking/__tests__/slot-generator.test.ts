import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    service: { findFirst: vi.fn() },
    availabilityRule: { findMany: vi.fn() },
    booking: { findMany: vi.fn() },
    blockedPeriod: { findMany: vi.fn() },
  },
}));

import { generateAvailableSlots } from "../slot-generator";
import { prisma } from "@/lib/db";

describe("generateAvailableSlots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when service not found", async () => {
    vi.mocked(prisma.service.findFirst).mockResolvedValue(null);

    const slots = await generateAvailableSlots({
      tenantId: "tenant_1",
      serviceId: "svc_1",
      startDate: "2026-06-01",
      endDate: "2026-06-01",
      timezone: "UTC",
    });

    expect(slots).toEqual([]);
  });

  it("generates slots for a valid availability rule on a Monday", async () => {
    const mockService = {
      id: "svc_1",
      tenantId: "tenant_1",
      locationId: null,
      name: "Training",
      description: null,
      type: "INDIVIDUAL" as const,
      durationMinutes: 60,
      maxParticipants: 1,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      basePrice: 100,
      currency: "USD",
      dynamicPricingConfig: null,
      isActive: true,
      isPublic: true,
      bookingRules: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.service.findFirst).mockResolvedValue(mockService);
    vi.mocked(prisma.availabilityRule.findMany).mockResolvedValue([
      {
        id: "rule_1",
        tenantId: "tenant_1",
        trainerId: null,
        serviceId: "svc_1",
        locationId: null,
        dayOfWeek: "MONDAY" as const,
        startTime: "09:00",
        endTime: "17:00",
        timezone: "UTC",
        isActive: true,
        validFrom: null,
        validUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(prisma.booking.findMany).mockResolvedValue([]);
    vi.mocked(prisma.blockedPeriod.findMany).mockResolvedValue([]);

    // 2026-06-01 is a Monday
    const slots = await generateAvailableSlots({
      tenantId: "tenant_1",
      serviceId: "svc_1",
      startDate: "2026-06-01",
      endDate: "2026-06-01",
      timezone: "UTC",
    });

    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]).toHaveProperty("startAt");
    expect(slots[0]).toHaveProperty("endAt");
    expect(slots[0]).toHaveProperty("available");
    expect(slots[0]?.available).toBe(true);
  });

  it("marks conflicting slots as unavailable", async () => {
    const mockService = {
      id: "svc_1",
      tenantId: "tenant_1",
      locationId: null,
      name: "Training",
      description: null,
      type: "INDIVIDUAL" as const,
      durationMinutes: 60,
      maxParticipants: 1,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      basePrice: 100,
      currency: "USD",
      dynamicPricingConfig: null,
      isActive: true,
      isPublic: true,
      bookingRules: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.service.findFirst).mockResolvedValue(mockService);
    vi.mocked(prisma.availabilityRule.findMany).mockResolvedValue([
      {
        id: "rule_1",
        tenantId: "tenant_1",
        trainerId: null,
        serviceId: "svc_1",
        locationId: null,
        dayOfWeek: "MONDAY" as const,
        startTime: "09:00",
        endTime: "11:00",
        timezone: "UTC",
        isActive: true,
        validFrom: null,
        validUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Existing booking covers 09:00-10:00
    vi.mocked(prisma.booking.findMany).mockResolvedValue([
      {
        startAt: new Date("2026-06-01T09:00:00Z"),
        endAt: new Date("2026-06-01T10:00:00Z"),
      },
    ]);
    vi.mocked(prisma.blockedPeriod.findMany).mockResolvedValue([]);

    const slots = await generateAvailableSlots({
      tenantId: "tenant_1",
      serviceId: "svc_1",
      startDate: "2026-06-01",
      endDate: "2026-06-01",
      timezone: "UTC",
    });

    const conflicting = slots.find((s) => s.startAt === "2026-06-01T09:00:00.000Z");
    expect(conflicting?.available).toBe(false);

    const free = slots.find((s) => s.startAt === "2026-06-01T10:00:00.000Z");
    expect(free?.available).toBe(true);
  });
});
