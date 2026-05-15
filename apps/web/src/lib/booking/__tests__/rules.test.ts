import { describe, it, expect } from "vitest";
import { validateBookingRules } from "../rules";

const mockService = {
  id: "svc_1",
  tenantId: "tenant_1",
  locationId: null,
  name: "Personal Training",
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

const mockSettings = {
  id: "settings_1",
  tenantId: "tenant_1",
  timezone: "UTC",
  currency: "USD",
  locale: "en-US",
  bookingLeadTimeMinutes: 60,
  bookingWindowDays: 60,
  cancellationWindowHours: 24,
  maxConcurrentBookings: 1,
  requirePaymentUpfront: false,
  emailNotifications: true,
  smsNotifications: false,
  aiEnabled: true,
  aiPersonaName: "Assistant",
  aiSystemPrompt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("validateBookingRules", () => {
  it("rejects bookings with insufficient lead time", async () => {
    const startAt = new Date(Date.now() + 30 * 60 * 1000);
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

    const result = await validateBookingRules({
      tenantId: "tenant_1",
      serviceId: "svc_1",
      startAt,
      endAt,
      tenantSettings: mockSettings,
      service: mockService,
    });

    expect(result).not.toBeNull();
    expect(result?.code).toBe("BOOKING_RULES_VIOLATION");
  });

  it("accepts valid bookings within window", async () => {
    const startAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

    const result = await validateBookingRules({
      tenantId: "tenant_1",
      serviceId: "svc_1",
      startAt,
      endAt,
      tenantSettings: mockSettings,
      service: mockService,
    });

    expect(result).toBeNull();
  });

  it("rejects bookings beyond the booking window", async () => {
    const startAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

    const result = await validateBookingRules({
      tenantId: "tenant_1",
      serviceId: "svc_1",
      startAt,
      endAt,
      tenantSettings: mockSettings,
      service: mockService,
    });

    expect(result?.code).toBe("BOOKING_WINDOW_EXCEEDED");
  });

  it("rejects bookings with end before start", async () => {
    const startAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const endAt = new Date(startAt.getTime() - 30 * 60 * 1000);

    const result = await validateBookingRules({
      tenantId: "tenant_1",
      serviceId: "svc_1",
      startAt,
      endAt,
      tenantSettings: mockSettings,
      service: mockService,
    });

    expect(result?.code).toBe("BOOKING_RULES_VIOLATION");
  });
});
