"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TimeSlot } from "@famm/shared";
import { bookingApi, type GetSlotsQuery } from "./api";
import { useRealtime, type RealtimeEvent } from "./useRealtime";

interface UseSlotsState {
  slots: TimeSlot[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => void;
  /** Locally mark a slot unavailable (optimistic). */
  markUnavailable: (startAt: string) => void;
  /** Restore a slot to available (rollback). */
  markAvailable: (startAt: string) => void;
}

export function useSlots(
  query: GetSlotsQuery | null,
  options: { realtime?: boolean; wsUrl?: string } = {}
): UseSlotsState {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const queryKey = query
    ? `${query.serviceId}|${query.trainerId ?? ""}|${query.locationId ?? ""}|${query.startDate}|${query.endDate}|${query.timezone}`
    : null;

  const fetchSlots = useCallback(
    async (mode: "initial" | "refresh") => {
      if (!query) return;
      const id = ++requestId.current;
      if (mode === "initial") setIsLoading(true);
      else setIsRefreshing(true);
      setError(null);
      try {
        const data = await bookingApi.getSlots(query);
        if (id !== requestId.current) return;
        setSlots(data);
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err instanceof Error ? err.message : "Failed to load slots");
      } finally {
        if (id === requestId.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [queryKey] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (!query) {
      setSlots([]);
      return;
    }
    void fetchSlots("initial");
  }, [queryKey, fetchSlots]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRealtime = useCallback(
    (event: RealtimeEvent) => {
      if (!query) return;
      if (
        event.type === "SLOT_UPDATED" &&
        event.serviceId === query.serviceId &&
        (!query.trainerId || event.trainerId === query.trainerId)
      ) {
        setSlots((prev) =>
          prev.map((s) =>
            s.startAt === event.startAt
              ? { ...s, available: event.available }
              : s
          )
        );
      } else if (
        event.type === "BOOKING_CREATED" ||
        event.type === "BOOKING_CANCELLED" ||
        event.type === "BOOKING_RESCHEDULED"
      ) {
        if (event.serviceId === query.serviceId) {
          // Background revalidation for source-of-truth sync.
          void fetchSlots("refresh");
        }
      }
    },
    [query?.serviceId, query?.trainerId, fetchSlots]
  );

  useRealtime({
    enabled: options.realtime !== false && !!query,
    wsUrl: options.wsUrl,
    channels: query ? [`slots:${query.serviceId}`] : undefined,
    onEvent: handleRealtime,
  });

  const markUnavailable = useCallback((startAt: string) => {
    setSlots((prev) =>
      prev.map((s) => (s.startAt === startAt ? { ...s, available: false } : s))
    );
  }, []);

  const markAvailable = useCallback((startAt: string) => {
    setSlots((prev) =>
      prev.map((s) => (s.startAt === startAt ? { ...s, available: true } : s))
    );
  }, []);

  return useMemo(
    () => ({
      slots,
      isLoading,
      isRefreshing,
      error,
      refresh: () => fetchSlots("refresh"),
      markUnavailable,
      markAvailable,
    }),
    [slots, isLoading, isRefreshing, error, fetchSlots, markUnavailable, markAvailable]
  );
}
