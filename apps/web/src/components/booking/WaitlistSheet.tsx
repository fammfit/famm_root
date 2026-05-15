"use client";

import { useState } from "react";
import type { TimeSlot } from "@famm/shared";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { bookingApi } from "@/lib/booking/client/api";
import { formatDateLong, formatTime } from "./dateUtils";
import { useToast } from "@/components/ui/Toast";

interface WaitlistSheetProps {
  open: boolean;
  onClose: () => void;
  slot: TimeSlot | null;
  service: { id: string; name: string };
  trainerId?: string;
  locationId?: string;
}

export function WaitlistSheet({
  open,
  onClose,
  slot,
  service,
  trainerId,
  locationId,
}: WaitlistSheetProps) {
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);
  const [position, setPosition] = useState<number | undefined>();
  const { toast } = useToast();

  const handleJoin = async () => {
    if (!slot) return;
    setSubmitting(true);
    try {
      const entry = await bookingApi.joinWaitlist({
        serviceId: service.id,
        startAt: slot.startAt,
        endAt: slot.endAt,
        trainerId,
        locationId,
      });
      setJoined(true);
      setPosition(entry.position);
      toast("You're on the waitlist", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't join waitlist", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setJoined(false);
    setPosition(undefined);
    onClose();
  };

  if (!slot) return null;
  const date = new Date(slot.startAt);

  return (
    <Sheet open={open} onClose={handleClose} title="Join waitlist">
      <div className="px-5 py-5 space-y-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          {joined
            ? "We'll notify you the moment a spot opens up. First to claim, gets it."
            : "This time is fully booked. Add yourself to the waitlist — we'll text you if it opens up."}
        </p>
        <div className="rounded-2xl bg-gray-50 p-4 space-y-1">
          <p className="font-semibold text-gray-900">{service.name}</p>
          <p className="text-sm text-gray-500">{formatDateLong(date)}</p>
          <p className="text-sm text-gray-500 tabular-nums">
            {formatTime(slot.startAt)} – {formatTime(slot.endAt)}
          </p>
        </div>
        {joined && position ? (
          <div className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
            You're <span className="font-semibold">#{position}</span> in line.
          </div>
        ) : null}
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {joined ? (
          <Button size="lg" fullWidth variant="secondary" onClick={handleClose}>
            Done
          </Button>
        ) : (
          <Button size="lg" fullWidth loading={submitting} onClick={handleJoin}>
            Join waitlist
          </Button>
        )}
      </div>
    </Sheet>
  );
}
