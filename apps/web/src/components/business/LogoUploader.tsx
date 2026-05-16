"use client";

import * as React from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Sheet, SheetHeader, SheetFooter, Button } from "@famm/ui";
import { uploadLogo } from "@/lib/api/business";
import { cn } from "@/lib/cn";

export interface LogoUploaderProps {
  value: string | null;
  onChange: (next: string | null) => void;
  /** Initials shown when no logo. Two letters max. */
  initials: string;
  disabled?: boolean;
}

const MAX_EDGE_PX = 1024;
const MAX_BYTES = 5 * 1024 * 1024;

export function LogoUploader({ value, onChange, initials, disabled }: LogoUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [removeOpen, setRemoveOpen] = React.useState(false);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("Logo is over 5 MB. Try a smaller one.");
      return;
    }
    setBusy(true);
    try {
      const resized = await resizeImage(file, MAX_EDGE_PX);
      const { url } = await uploadLogo(resized);
      onChange(url);
    } catch {
      setError("Couldn't upload that logo — try a different file.");
    } finally {
      setBusy(false);
    }
  }

  function openPicker() {
    inputRef.current?.click();
  }

  return (
    <div className="flex items-center gap-stack-sm">
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled || busy}
        aria-label={value ? "Change logo" : "Add logo"}
        className={cn(
          "relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-card border border-border bg-surface-sunken",
          "transition-colors duration-fast ease-standard hover:bg-surface",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
          (disabled || busy) && "cursor-not-allowed opacity-60"
        )}
      >
        {value ? (
          // data: URL from the stub upload; swap for next/image once the
          // S3 wiring lands and the URLs become https with known hosts.
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden="true" className="text-2xl font-semibold text-text-secondary">
            {initials || "?"}
          </span>
        )}
      </button>

      <div className="flex flex-col gap-stack-xs">
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={openPicker}
          loading={busy}
          disabled={disabled}
        >
          <ImagePlus aria-hidden className="mr-inline-xs h-4 w-4" />
          {value ? "Change logo" : "Upload logo"}
        </Button>
        {value ? (
          <button
            type="button"
            onClick={() => setRemoveOpen(true)}
            disabled={disabled || busy}
            className="inline-flex items-center gap-inline-xs self-start rounded-control px-inset-xs text-sm font-medium text-text-secondary transition-colors duration-fast ease-standard hover:text-signal-danger focus-visible:outline-none focus-visible:underline disabled:cursor-not-allowed"
          >
            <Trash2 aria-hidden className="h-3 w-3" />
            Remove
          </button>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-signal-danger">
            {error}
          </p>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      <Sheet
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        side="center"
        ariaLabelledBy="remove-logo-title"
      >
        <SheetHeader
          title="Remove logo?"
          description="Your initials will show instead."
          onClose={() => setRemoveOpen(false)}
          titleId="remove-logo-title"
        />
        <SheetFooter>
          <Button variant="ghost" onClick={() => setRemoveOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setRemoveOpen(false);
              onChange(null);
            }}
          >
            Remove
          </Button>
        </SheetFooter>
      </Sheet>
    </div>
  );
}

async function resizeImage(file: File, maxEdge: number): Promise<Blob> {
  if (typeof createImageBitmap === "undefined") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob ?? file),
      file.type === "image/png" ? "image/png" : "image/jpeg",
      0.9
    );
  });
}
