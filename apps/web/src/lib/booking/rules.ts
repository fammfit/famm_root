import type { Service, TenantSettings } from "@famm/db";

interface ValidateParams {
  tenantId: string;
  serviceId: string;
  startAt: Date;
  endAt: Date;
  tenantSettings: TenantSettings | null;
  service: Service;
}

interface RuleViolation {
  code: string;
  message: string;
}

export async function validateBookingRules({
  startAt,
  endAt,
  tenantSettings,
  service,
}: ValidateParams): Promise<RuleViolation | null> {
  const now = new Date();
  const leadTimeMs = (tenantSettings?.bookingLeadTimeMinutes ?? 60) * 60 * 1000;
  const windowMs = (tenantSettings?.bookingWindowDays ?? 60) * 24 * 60 * 60 * 1000;

  if (startAt.getTime() - now.getTime() < leadTimeMs) {
    return {
      code: "BOOKING_RULES_VIOLATION",
      message: `Bookings must be made at least ${tenantSettings?.bookingLeadTimeMinutes ?? 60} minutes in advance`,
    };
  }

  if (startAt.getTime() - now.getTime() > windowMs) {
    return {
      code: "BOOKING_WINDOW_EXCEEDED",
      message: `Cannot book more than ${tenantSettings?.bookingWindowDays ?? 60} days in advance`,
    };
  }

  if (startAt >= endAt) {
    return {
      code: "BOOKING_RULES_VIOLATION",
      message: "End time must be after start time",
    };
  }

  if (service.bookingRules) {
    const rules = service.bookingRules as {
      minDurationMinutes?: number;
      maxDurationMinutes?: number;
    };
    const durationMinutes = (endAt.getTime() - startAt.getTime()) / (1000 * 60);

    if (rules.minDurationMinutes && durationMinutes < rules.minDurationMinutes) {
      return {
        code: "BOOKING_RULES_VIOLATION",
        message: `Minimum booking duration is ${rules.minDurationMinutes} minutes`,
      };
    }

    if (rules.maxDurationMinutes && durationMinutes > rules.maxDurationMinutes) {
      return {
        code: "BOOKING_RULES_VIOLATION",
        message: `Maximum booking duration is ${rules.maxDurationMinutes} minutes`,
      };
    }
  }

  return null;
}
