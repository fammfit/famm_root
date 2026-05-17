"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { COUNTRIES } from "@/lib/business/countries";

export interface CountrySelectProps {
  value: string;
  onChange: (next: string) => void;
  id?: string;
  name?: string;
  required?: boolean;
  "aria-describedby"?: string;
}

export function CountrySelect({
  value,
  onChange,
  id,
  name = "country",
  required,
  ...aria
}: CountrySelectProps) {
  return (
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
      <option value="" disabled>
        Pick a country
      </option>
      {COUNTRIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
