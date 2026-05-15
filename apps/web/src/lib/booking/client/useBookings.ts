"use client";

import { useCallback, useEffect, useState } from "react";
import {
  bookingApi,
  type Booking,
  type ApiError,
} from "./api";
import { useRealtime, type RealtimeEvent } from "./useRealtime";

export function useBookings(options: { realtime?: boolean; wsUrl?: string } = {}) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const { bookings } = await bookingApi.listBookings();
      setBookings(bookings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleRealtime = useCallback(
    (event: RealtimeEvent) => {
      if (
        event.type === "BOOKING_CREATED" ||
        event.type === "BOOKING_CANCELLED" ||
        event.type === "BOOKING_RESCHEDULED"
      ) {
        void refresh();
      }
    },
    [refresh]
  );

  useRealtime({
    enabled: options.realtime !== false,
    wsUrl: options.wsUrl,
    channels: ["bookings:self"],
    onEvent: handleRealtime,
  });

  const cancel = useCallback(
    async (id: string, reason?: string): Promise<Booking> => {
      const prev = bookings;
      // Optimistic: mark cancelled immediately.
      setBookings((b) =>
        b.map((bk) => (bk.id === id ? { ...bk, status: "CANCELLED" } : bk))
      );
      try {
        return await bookingApi.cancelBooking(id, reason);
      } catch (err) {
        setBookings(prev); // rollback
        throw err;
      }
    },
    [bookings]
  );

  const reschedule = useCallback(
    async (id: string, startAt: string, timezone: string): Promise<Booking> => {
      const prev = bookings;
      try {
        const updated = await bookingApi.rescheduleBooking(id, {
          startAt,
          timezone,
        });
        setBookings((b) => b.map((bk) => (bk.id === id ? updated : bk)));
        return updated;
      } catch (err) {
        setBookings(prev);
        throw err;
      }
    },
    [bookings]
  );

  return { bookings, isLoading, error, refresh, cancel, reschedule };
}

export type { Booking, ApiError };
