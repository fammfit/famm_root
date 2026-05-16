"use client";

import { useState } from "react";
import type { TimeSlot } from "@famm/shared";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { DayStrip } from "./DayStrip";
import { SlotGrid } from "./SlotGrid";
import { useSlots } from "@/lib/booking/client/useSlots";
import { toIsoDate, addDays, browserTimezone, formatTime, formatDateLong } from "./dateUtils";
import type { Booking } from "@/lib/booking/client/api";
import { useToast } from "@/components/ui/Toast";

interface RescheduleSheetProps {
  open: boolean;
  onClose: () => void;
  booking: Booking | null;
  onReschedule: (id: string, startAt: string, timezone: string) => Promise<Booking>;
}

export function RescheduleSheet({
  open,
  onClose,
  booking,
  onReschedule,
}: RescheduleSheetProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const dateKey = toIsoDate(selectedDate);
  const { slots, isLoading } = useSlots(
    open && booking
      ? {
          serviceId: booking.serviceId,
          trainerId: booking.trainerId ?? undefined,
          locationId: booking.locationId ?? undefined,
          startDate: dateKey,
          endDate: toIsoDate(addDays(selectedDate, 0)),
          timezone: browserTimezone(),
        }
      : null
  );

  const handleSubmit = async () => {
    if (!booking || !selectedSlot) return;
    setSubmitting(true);
    try {
      await onReschedule(booking.id, selectedSlot.startAt, browserTimezone());
      toast("Booking rescheduled", "success");
      onClose();
      setSelectedSlot(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Reschedule failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!booking) return null;

  return (
    <Sheet open={open} onClose={onClose} title="Reschedule" size="tall">
      <div className="px-5 pt-3 pb-2 text-sm text-gray-500">
        Current: {formatDateLong(new Date(booking.startAt))} at{" "}
        {formatTime(booking.startAt)}
      </div>
      <DayStrip selected={selectedDate} onSelect={(d) => { setSelectedDate(d); setSelectedSlot(null); }} />
      <div className="pt-1 pb-4">
        <SlotGrid
          slots={slots}
          isLoading={isLoading}
          selectedStartAt={selectedSlot?.startAt}
          onSelect={setSelectedSlot}
        />
      </div>
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          size="lg"
          fullWidth
          disabled={!selectedSlot}
          loading={submitting}
          onClick={handleSubmit}
        >
          {selectedSlot
            ? `Reschedule to ${formatTime(selectedSlot.startAt)}`
            : "Pick a new time"}
        </Button>
      </div>
    </Sheet>
  );
}
