"use client";

import { useState } from "react";
import type { TimeSlot } from "@famm/shared";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { formatDateLong, formatTime, browserTimezone } from "./dateUtils";
import { bookingApi, ApiError } from "@/lib/booking/client/api";
import { useToast } from "@/components/ui/Toast";

interface BookingConfirmSheetProps {
  open: boolean;
  onClose: () => void;
  slot: TimeSlot | null;
  service: { id: string; name: string; basePrice?: number; currency?: string };
  trainer?: { id: string; name: string } | null;
  location?: { id: string; name: string } | null;
  /** Called on successful booking; parent should refresh slots. */
  onConfirmed: (bookingId: string) => void;
  /** Optimistic hint: mark slot unavailable in parent state. */
  onOptimisticHold?: (startAt: string) => void;
  /** Rollback hint: restore slot if request fails. */
  onRollback?: (startAt: string) => void;
}

export function BookingConfirmSheet({
  open,
  onClose,
  slot,
  service,
  trainer,
  location,
  onConfirmed,
  onOptimisticHold,
  onRollback,
}: BookingConfirmSheetProps) {
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleConfirm = async () => {
    if (!slot) return;
    setSubmitting(true);
    setError(null);
    onOptimisticHold?.(slot.startAt);

    try {
      const booking = await bookingApi.createBooking({
        serviceId: service.id,
        trainerId: trainer?.id,
        locationId: location?.id,
        startAt: slot.startAt,
        timezone: browserTimezone(),
        notes: notes.trim() || undefined,
      });
      toast("Booking confirmed", "success");
      setNotes("");
      onConfirmed(booking.id);
      onClose();
    } catch (err) {
      onRollback?.(slot.startAt);
      const message =
        err instanceof ApiError
          ? err.code === "SLOT_UNAVAILABLE"
            ? "That time was just taken. Pick another."
            : err.message
          : "Couldn't complete booking. Try again.";
      setError(message);
      toast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!slot) return null;

  const date = new Date(slot.startAt);
  const price = slot.price ?? service.basePrice ?? 0;
  const currency = service.currency ?? "USD";

  return (
    <Sheet open={open} onClose={onClose} title="Confirm booking">
      <div className="px-5 py-4 space-y-5">
        <div className="space-y-1.5">
          <h3 className="text-xl font-semibold text-gray-900">{service.name}</h3>
          <p className="text-sm text-gray-500">{formatDateLong(date)}</p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums pt-1">
            {formatTime(slot.startAt)}{" "}
            <span className="text-base font-normal text-gray-400">
              – {formatTime(slot.endAt)}
            </span>
          </p>
        </div>

        <div className="rounded-2xl bg-gray-50 divide-y divide-gray-100">
          {trainer && (
            <Row label="Trainer" value={trainer.name} />
          )}
          {location && (
            <Row label="Location" value={location.name} />
          )}
          <Row
            label="Total"
            value={new Intl.NumberFormat(undefined, {
              style: "currency",
              currency,
            }).format(price / 100)}
            emphasis
          />
        </div>

        <div>
          <label
            htmlFor="booking-notes"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="booking-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Anything the trainer should know?"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 resize-none"
          />
        </div>

        {error ? (
          <div className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          size="lg"
          fullWidth
          loading={submitting}
          onClick={handleConfirm}
        >
          {submitting ? "Booking..." : "Confirm booking"}
        </Button>
      </div>
    </Sheet>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span
        className={emphasis ? "font-semibold text-gray-900" : "text-gray-900"}
      >
        {value}
      </span>
    </div>
  );
}
