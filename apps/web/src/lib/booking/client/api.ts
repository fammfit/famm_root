import type {
  CreateBookingInput,
  RescheduleBookingInput,
  TimeSlot,
} from "@famm/shared";

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  init?: RequestInit & { signal?: AbortSignal }
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });
  const body = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || !body.success || body.data === undefined) {
    throw new ApiError(
      body.error?.code ?? "UNKNOWN",
      body.error?.message ?? "Request failed",
      res.status
    );
  }
  return body.data;
}

export interface GetSlotsQuery {
  serviceId: string;
  trainerId?: string;
  locationId?: string;
  startDate: string;
  endDate: string;
  timezone: string;
}

export const bookingApi = {
  getSlots(query: GetSlotsQuery, signal?: AbortSignal): Promise<TimeSlot[]> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v != null) params.set(k, String(v));
    });
    return request<TimeSlot[]>(`/api/v1/slots?${params.toString()}`, { signal });
  },

  createBooking(input: CreateBookingInput): Promise<Booking> {
    return request<Booking>("/api/v1/bookings", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  listBookings(): Promise<{ bookings: Booking[] }> {
    return request<{ bookings: Booking[] }>("/api/v1/bookings");
  },

  getBooking(id: string): Promise<Booking> {
    return request<Booking>(`/api/v1/bookings/${id}`);
  },

  cancelBooking(id: string, reason?: string): Promise<Booking> {
    return request<Booking>(`/api/v1/bookings/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "CANCELLED", cancellationReason: reason }),
    });
  },

  rescheduleBooking(
    id: string,
    input: RescheduleBookingInput
  ): Promise<Booking> {
    return request<Booking>(`/api/v1/bookings/${id}/reschedule`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  joinWaitlist(input: {
    serviceId: string;
    startAt: string;
    endAt: string;
    trainerId?: string;
    locationId?: string;
  }): Promise<WaitlistEntry> {
    return request<WaitlistEntry>("/api/v1/waitlist", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  leaveWaitlist(id: string): Promise<{ id: string }> {
    return request<{ id: string }>(`/api/v1/waitlist/${id}`, {
      method: "DELETE",
    });
  },
};

export interface Booking {
  id: string;
  status:
    | "PENDING"
    | "CONFIRMED"
    | "CANCELLED"
    | "COMPLETED"
    | "NO_SHOW"
    | "RESCHEDULED";
  startAt: string;
  endAt: string;
  timezone: string;
  price: number;
  currency: string;
  notes?: string | null;
  serviceId: string;
  trainerId?: string | null;
  locationId?: string | null;
  clientId: string;
  service?: { id: string; name: string; durationMinutes?: number };
  trainer?: { id: string; user?: { firstName?: string; lastName?: string } };
  location?: { id: string; name: string };
}

export interface WaitlistEntry {
  id: string;
  serviceId: string;
  startAt: string;
  endAt: string;
  status: "ACTIVE" | "NOTIFIED" | "CONVERTED" | "EXPIRED" | "CANCELLED";
  position?: number;
}
