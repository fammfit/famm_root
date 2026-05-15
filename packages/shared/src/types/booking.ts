export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW"
  | "RESCHEDULED";

export type PaymentStatus =
  | "UNPAID"
  | "PAID"
  | "REFUNDED"
  | "PARTIAL_REFUND"
  | "FAILED";

export interface TimeSlot {
  startAt: string; // ISO 8601
  endAt: string;
  available: boolean;
  price?: number;
  trainerId?: string;
}

export interface BookingRules {
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
  advanceBookingDays?: number;
  minCancellationHours?: number;
  maxConcurrentBookings?: number;
  requiresApproval?: boolean;
}
