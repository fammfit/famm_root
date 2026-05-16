"use client";

import { useMemo, useState } from "react";
import type { TimeSlot } from "@famm/shared";
import { DayStrip } from "./DayStrip";
import { SlotGrid } from "./SlotGrid";
import { BookingConfirmSheet } from "./BookingConfirmSheet";
import { WaitlistSheet } from "./WaitlistSheet";
import { useSlots } from "@/lib/booking/client/useSlots";
import {
  toIsoDate,
  addDays,
  browserTimezone,
  formatDateLong,
} from "./dateUtils";
import { Button } from "@/components/ui/Button";

interface BookingFlowProps {
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    basePrice?: number;
    currency?: string;
    description?: string;
  };
  trainer?: { id: string; name: string } | null;
  location?: { id: string; name: string } | null;
  /** Optional WS endpoint for realtime updates. */
  wsUrl?: string;
}

/**
 * The end-to-end client booking flow:
 *  - Day strip (touch-scrollable)
 *  - Slot grid (mobile-optimized chips, optimistic-aware)
 *  - Bottom-sheet confirmation
 *  - Waitlist fallback for sold-out times
 *  - Realtime slot updates over WebSocket / SSE
 */
export function BookingFlow({
  service,
  trainer,
  location,
  wsUrl,
}: BookingFlowProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [waitlistSlot, setWaitlistSlot] = useState<TimeSlot | null>(null);

  const slotsQuery = useMemo(
    () => ({
      serviceId: service.id,
      trainerId: trainer?.id,
      locationId: location?.id,
      startDate: toIsoDate(selectedDate),
      endDate: toIsoDate(addDays(selectedDate, 0)),
      timezone: browserTimezone(),
    }),
    [service.id, trainer?.id, location?.id, selectedDate]
  );

  const {
    slots,
    isLoading,
    error,
    refresh,
    markUnavailable,
    markAvailable,
  } = useSlots(slotsQuery, { wsUrl });

  return (
    <div className="min-h-screen bg-white pb-16">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            {service.name}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {service.durationMinutes} min{trainer ? ` · with ${trainer.name}` : ""}
            {location ? ` · ${location.name}` : ""}
          </p>
        </div>
        <DayStrip selected={selectedDate} onSelect={setSelectedDate} />
      </header>

      <section className="pt-4">
        <div className="px-4 mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            {formatDateLong(selectedDate)}
          </h2>
          <button
            onClick={() => refresh()}
            className="text-xs text-gray-500 hover:text-gray-900 touch-manipulation"
          >
            Refresh
          </button>
        </div>

        {error ? (
          <div className="mx-4 mb-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <Button size="sm" variant="ghost" onClick={() => refresh()}>
              Retry
            </Button>
          </div>
        ) : null}

        <SlotGrid
          slots={slots}
          isLoading={isLoading}
          selectedStartAt={selectedSlot?.startAt}
          onSelect={setSelectedSlot}
          onJoinWaitlist={setWaitlistSlot}
        />
      </section>

      <BookingConfirmSheet
        open={!!selectedSlot}
        onClose={() => setSelectedSlot(null)}
        slot={selectedSlot}
        service={service}
        trainer={trainer}
        location={location}
        onOptimisticHold={markUnavailable}
        onRollback={markAvailable}
        onConfirmed={() => {
          setSelectedSlot(null);
          refresh();
        }}
      />

      <WaitlistSheet
        open={!!waitlistSlot}
        onClose={() => setWaitlistSlot(null)}
        slot={waitlistSlot}
        service={{ id: service.id, name: service.name }}
        trainerId={trainer?.id}
        locationId={location?.id}
      />
    </div>
  );
}
