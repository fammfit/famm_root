"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface BioFieldProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (next: string) => void;
  maxLength?: number;
  softWarnAt?: number;
  placeholder?: string;
}

// TODO(textarea-primitive): replace the inline <textarea> with a real
// @famm/ui Textarea L1 once it's promoted. The styling mirrors Input so
// the swap is mechanical.
export function BioField({
  id = "bio",
  name = "bioMd",
  value,
  onChange,
  maxLength = 500,
  softWarnAt = 450,
  placeholder,
}: BioFieldProps) {
  const remaining = maxLength - value.length;
  const isWarning = value.length >= softWarnAt;
  const isAtLimit = value.length >= maxLength;
  return (
    <div className="flex flex-col gap-stack-xs">
      <textarea
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        maxLength={maxLength}
        rows={5}
        placeholder={placeholder}
        aria-describedby={`${id}-counter`}
        className={cn(
          "w-full rounded-control border border-border bg-surface px-inset-sm py-inset-xs text-sm text-text-primary",
          "transition-colors duration-fast ease-standard",
          "placeholder:text-text-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        )}
      />
      <p
        id={`${id}-counter`}
        aria-live="polite"
        className={cn(
          "self-end text-xs",
          isAtLimit ? "text-signal-danger" : isWarning ? "text-signal-warning" : "text-text-muted"
        )}
      >
        {remaining} character{remaining === 1 ? "" : "s"} left
      </p>
    </div>
  );
}
