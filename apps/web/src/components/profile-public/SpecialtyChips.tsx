"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@famm/ui";
import { cn } from "@/lib/cn";
import { COMMON_SPECIALTIES } from "@/lib/profile/specialties";

export interface SpecialtyChipsProps {
  value: ReadonlyArray<string>;
  onChange: (next: string[]) => void;
  max?: number;
  error?: string;
}

const CUSTOM_MAX = 32;

export function SpecialtyChips({ value, onChange, max = 6, error }: SpecialtyChipsProps) {
  const [showCustom, setShowCustom] = React.useState(false);
  const [draft, setDraft] = React.useState("");

  const selected = new Set(value.map((v) => v.toLowerCase()));
  const atCap = value.length >= max;

  function toggle(label: string) {
    if (selected.has(label.toLowerCase())) {
      onChange(value.filter((v) => v.toLowerCase() !== label.toLowerCase()));
    } else {
      if (atCap) return;
      onChange([...value, label]);
    }
  }

  function addCustom() {
    const trimmed = draft.trim().slice(0, CUSTOM_MAX);
    if (!trimmed) return;
    if (selected.has(trimmed.toLowerCase())) return;
    if (atCap) return;
    onChange([...value, trimmed]);
    setDraft("");
    setShowCustom(false);
  }

  const knownOptions = COMMON_SPECIALTIES;
  const customSelected = value.filter(
    (v) => !knownOptions.some((k) => k.toLowerCase() === v.toLowerCase())
  );

  return (
    <div role="group" aria-label="Specialties" className="flex flex-col gap-stack-sm">
      <div className="flex flex-wrap gap-inline-xs">
        {knownOptions.map((label) => {
          const isOn = selected.has(label.toLowerCase());
          const disabled = !isOn && atCap;
          return (
            <button
              key={label}
              type="button"
              aria-pressed={isOn}
              onClick={() => toggle(label)}
              disabled={disabled}
              className={cn(
                "inline-flex items-center gap-inline-xs rounded-pill border px-inset-sm py-1 text-xs font-medium",
                "transition-colors duration-fast ease-standard",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                isOn
                  ? "border-accent bg-accent text-onAccent"
                  : "border-border bg-surface text-text-primary hover:bg-surface-sunken",
                disabled && "cursor-not-allowed opacity-50"
              )}
            >
              {isOn ? (
                <X aria-hidden className="h-3 w-3" />
              ) : (
                <Plus aria-hidden className="h-3 w-3" />
              )}
              {label}
            </button>
          );
        })}
        {customSelected.map((label) => (
          <button
            key={label}
            type="button"
            aria-pressed
            onClick={() => toggle(label)}
            className={cn(
              "inline-flex items-center gap-inline-xs rounded-pill border border-accent bg-accent px-inset-sm py-1 text-xs font-medium text-onAccent",
              "transition-colors duration-fast ease-standard",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            )}
          >
            <X aria-hidden className="h-3 w-3" />
            {label}
          </button>
        ))}
        {!atCap ? (
          showCustom ? null : (
            <button
              type="button"
              onClick={() => setShowCustom(true)}
              className="inline-flex items-center gap-inline-xs rounded-pill border border-dashed border-border bg-surface px-inset-sm py-1 text-xs font-medium text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <Plus aria-hidden className="h-3 w-3" />
              Add custom
            </button>
          )
        ) : null}
      </div>

      {showCustom ? (
        <div className="flex items-center gap-inline-xs">
          <Input
            value={draft}
            maxLength={CUSTOM_MAX}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setShowCustom(false);
                setDraft("");
              }
            }}
            placeholder="e.g. Marathon training"
            aria-label="Add a custom specialty"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={draft.trim().length === 0}
            className="inline-flex h-10 items-center justify-center rounded-control bg-accent px-inset-md text-sm font-medium text-onAccent transition-colors duration-fast ease-standard hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add
          </button>
        </div>
      ) : null}

      <p aria-live="polite" className="text-xs text-text-muted">
        {value.length} of {max} selected
      </p>
      {error ? (
        <p role="alert" className="text-sm text-signal-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
