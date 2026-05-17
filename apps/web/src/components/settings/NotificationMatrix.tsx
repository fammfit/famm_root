"use client";

import * as React from "react";
import type {
  NotificationChannel,
  NotificationEvent,
  NotificationPrefs,
} from "@/lib/account/types";

export interface NotificationMatrixProps {
  prefs: NotificationPrefs;
  onChange: (next: NotificationPrefs) => void;
  disabled?: boolean;
}

const EVENT_LABEL: Record<NotificationEvent, string> = {
  "booking.confirmed": "Booking confirmed",
  "booking.reminder.24h": "Reminder · 24h before",
  "booking.reminder.1h": "Reminder · 1h before",
  "booking.cancelled": "Booking cancelled",
  "payment.succeeded": "Payment received",
  "payment.failed": "Payment failed",
};

const EVENTS: ReadonlyArray<NotificationEvent> = [
  "booking.confirmed",
  "booking.reminder.24h",
  "booking.reminder.1h",
  "booking.cancelled",
  "payment.succeeded",
  "payment.failed",
];

const CHANNELS: ReadonlyArray<NotificationChannel> = ["email", "sms"];

const CHANNEL_LABEL: Record<NotificationChannel, string> = {
  email: "Email",
  sms: "SMS",
};

export function NotificationMatrix({ prefs, onChange, disabled }: NotificationMatrixProps) {
  const toggle = (event: NotificationEvent, channel: NotificationChannel) => {
    const next: NotificationPrefs = {
      ...prefs,
      [event]: { ...prefs[event], [channel]: !prefs[event][channel] },
    };
    onChange(next);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-text-muted">
            <th className="py-inset-xs pr-inset-sm font-medium">Event</th>
            {CHANNELS.map((c) => (
              <th key={c} className="py-inset-xs px-inset-sm font-medium">
                {CHANNEL_LABEL[c]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {EVENTS.map((event) => (
            <tr key={event} className="border-b border-border last:border-b-0">
              <th
                scope="row"
                className="py-inset-sm pr-inset-sm text-left text-sm font-normal text-text-primary"
              >
                {EVENT_LABEL[event]}
              </th>
              {CHANNELS.map((channel) => {
                const id = `notif-${event}-${channel}`;
                return (
                  <td key={channel} className="py-inset-sm px-inset-sm">
                    <label
                      htmlFor={id}
                      className="inline-flex h-control min-w-control items-center justify-center"
                    >
                      <input
                        id={id}
                        type="checkbox"
                        checked={prefs[event][channel]}
                        disabled={disabled}
                        onChange={() => toggle(event, channel)}
                        aria-label={`${EVENT_LABEL[event]} via ${CHANNEL_LABEL[channel]}`}
                        className="h-4 w-4 shrink-0 accent-accent"
                      />
                    </label>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
