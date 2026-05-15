"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import type { Booking } from "@/lib/booking/client/api";
import { formatDateLong, formatTime } from "./dateUtils";
import { useToast } from "@/components/ui/Toast";

interface BookingDetailSheetProps {
  open: boolean;
  onClose: () => void;
  booking: Booking | null;
  onCancel: (id: string, reason?: string) => Promise<unknown>;
  onReschedule: (booking: Booking) => void;
}

export function BookingDetailSheet({
  open,
  onClose,
  booking,
  onCancel,
  onReschedule,
}: BookingDetailSheetProps) {
  const [cancelling, setCancelling] = useState(false);
  const { toast } = useToast();

  if (!booking) return null;

  const isUpcoming =
    new Date(booking.startAt) > new Date() &&
    (booking.status === "PENDING" || booking.status === "CONFIRMED");

  const handleCancel = async () => {
    if (!confirm("Cancel this booking?")) return;
    setCancelling(true);
    try {
      await onCancel(booking.id);
      toast("Booking cancelled", "success");
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't cancel", "error");
    } finally {
      setCancelling(false);
    }
  };

  const trainerName = [
    booking.trainer?.user?.firstName,
    booking.trainer?.user?.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Sheet open={open} onClose={onClose} title={booking.service?.name ?? "Booking"}>
      <div className="px-5 py-4 space-y-4">
        <div>
          <p className="text-sm text-gray-500">
            {formatDateLong(new Date(booking.startAt))}
          </p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums mt-0.5">
            {formatTime(booking.startAt)}{" "}
            <span className="text-base font-normal text-gray-400">
              – {formatTime(booking.endAt)}
            </span>
          </p>
        </div>

        <div className="rounded-2xl bg-gray-50 divide-y divide-gray-100">
          {trainerName && <Row label="Trainer" value={trainerName} />}
          {booking.location?.name && (
            <Row label="Location" value={booking.location.name} />
          )}
          <Row
            label="Total"
            value={new Intl.NumberFormat(undefined, {
              style: "currency",
              currency: booking.currency,
            }).format(booking.price / 100)}
          />
          <Row label="Status" value={booking.status.replace("_", " ")} />
        </div>

        {booking.notes ? (
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-1">
              Notes
            </p>
            <p className="text-sm text-gray-700">{booking.notes}</p>
          </div>
        ) : null}
      </div>

      {isUpcoming ? (
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex gap-2">
          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={() => onReschedule(booking)}
          >
            Reschedule
          </Button>
          <Button
            variant="danger"
            size="lg"
            className="flex-1"
            loading={cancelling}
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </div>
      ) : null}
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}
