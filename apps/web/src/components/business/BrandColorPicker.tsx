/* eslint-disable no-restricted-syntax --
 * Exception: brand-color preset hex values are *data*, and the swatch
 * preview applies the value via a CSS custom property. This file is the
 * only place in the app that legitimately carries raw hex literals and a
 * style={} attribute — see design-system/principles.md §"Theming".
 */
"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Input } from "@famm/ui";
import { cn } from "@/lib/cn";

export interface BrandColorPickerProps {
  value: string;
  onChange: (next: string) => void;
  /** Surface validation errors from the form layer. */
  error?: string;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

interface Preset {
  name: string;
  value: string;
}

const PRESETS: ReadonlyArray<Preset> = [
  { name: "Slate", value: "#0F172A" },
  { name: "Indigo", value: "#4F46E5" },
  { name: "Teal", value: "#0D9488" },
  { name: "Emerald", value: "#059669" },
  { name: "Amber", value: "#D97706" },
  { name: "Rose", value: "#E11D48" },
  { name: "Purple", value: "#7C3AED" },
  { name: "Sky", value: "#0284C7" },
];

export function BrandColorPicker({ value, onChange, error }: BrandColorPickerProps) {
  const [draft, setDraft] = React.useState(value);

  React.useEffect(() => {
    setDraft(value);
  }, [value]);

  function commit(next: string) {
    if (HEX_RE.test(next)) {
      onChange(next.toLowerCase());
    } else {
      // Invalid — restore the last valid value.
      setDraft(value);
    }
  }

  return (
    <div className="flex flex-col gap-stack-sm">
      <div className="flex flex-wrap items-center gap-inline-xs">
        {PRESETS.map((preset) => {
          const selected = preset.value.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={preset.value}
              type="button"
              aria-pressed={selected}
              aria-label={`Brand color: ${preset.name}`}
              onClick={() => onChange(preset.value.toLowerCase())}
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-pill border-2",
                selected ? "border-text-primary" : "border-border hover:border-text-secondary",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              )}
              style={{ backgroundColor: preset.value }}
            >
              {selected ? (
                <Check
                  aria-hidden
                  className="h-4 w-4"
                  style={{ color: contrastText(preset.value) }}
                />
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-inline-sm">
        <span
          aria-hidden="true"
          className="h-9 w-9 shrink-0 rounded-control border border-border"
          style={{ backgroundColor: value }}
        />
        <Input
          name="primaryColor"
          aria-label="Custom hex color"
          value={draft}
          maxLength={7}
          placeholder="#0F172A"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value.trim())}
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-signal-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function contrastText(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#FFFFFF";
  // Simple luminance check (sRGB approximation).
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.55 ? "#0F172A" : "#FFFFFF";
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const raw = m[1]!;
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}
