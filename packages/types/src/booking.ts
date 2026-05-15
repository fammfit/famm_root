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

export type ServiceType = "INDIVIDUAL" | "GROUP" | "WORKSHOP" | "VIRTUAL" | "HYBRID";

export interface Service {
  id: string;
  tenantId: string;
  locationId?: string;
  name: string;
  description?: string;
  type: ServiceType;
  durationMinutes: number;
  maxParticipants: number;
  basePrice: number;
  currency: string;
  isActive: boolean;
  isPublic: boolean;
}

export interface Booking {
  id: string;
  tenantId: string;
  clientId: string;
  trainerId?: string;
  serviceId: string;
  locationId?: string;
  status: BookingStatus;
  startAt: string;
  endAt: string;
  timezone: string;
  price: number;
  currency: string;
  paymentStatus: PaymentStatus;
  notes?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeSlot {
  startAt: string;
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
