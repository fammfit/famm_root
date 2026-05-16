"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface TimezoneSelectProps {
  value: string;
  onChange: (next: string) => void;
  id?: string;
  name?: string;
  required?: boolean;
  "aria-describedby"?: string;
}

const FALLBACK_ZONES: ReadonlyArray<string> = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Toronto",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

function listZones(): ReadonlyArray<string> {
  const intl = Intl as unknown as {
    supportedValuesOf?: (key: "timeZone") => string[];
  };
  if (typeof intl.supportedValuesOf === "function") {
    return intl.supportedValuesOf("timeZone");
  }
  return FALLBACK_ZONES;
}

function formatLocal(timezone: string, now: Date): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
      hour12: false,
    }).format(now);
  } catch {
    return "—";
  }
}

export function TimezoneSelect({
  value,
  onChange,
  id,
  name = "timezone",
  required,
  ...aria
}: TimezoneSelectProps) {
  const zones = React.useMemo(() => listZones(), []);
  const [now, setNow] = React.useState<Date>(() => new Date());

  React.useEffect(() => {
    // Tick every minute — local-time preview stays honest without spam.
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-stack-xs">
      <select
        id={id}
        name={name}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={aria["aria-describedby"]}
        className={cn(
          "h-10 w-full rounded-control border border-border bg-surface px-inset-sm text-sm text-text-primary",
          "transition-colors duration-fast ease-standard",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        )}
      >
        {zones.map((zone) => (
          <option key={zone} value={zone}>
            {zone.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      <p aria-live="polite" className="text-xs text-text-muted">
        Right now there: {formatLocal(value, now)}
      </p>
    </div>
  );
}
