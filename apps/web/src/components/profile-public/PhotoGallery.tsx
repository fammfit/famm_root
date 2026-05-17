"use client";

import * as React from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Sheet, SheetHeader, SheetFooter, Button } from "@famm/ui";
import { uploadPhoto } from "@/lib/api/business";
import { resizeImage } from "@/lib/uploads/resize-image";
import { cn } from "@/lib/cn";

export interface PhotoGalleryProps {
  value: ReadonlyArray<string>;
  onChange: (next: string[]) => void;
  max?: number;
  disabled?: boolean;
}

const MAX_EDGE_PX = 1600;
const MAX_BYTES = 5 * 1024 * 1024;

interface TileError {
  index: number;
  message: string;
}

export function PhotoGallery({ value, onChange, max = 6, disabled }: PhotoGalleryProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<TileError | null>(null);
  const [removeIndex, setRemoveIndex] = React.useState<number | null>(null);

  const atCap = value.length >= max;

  async function handleFile(file: File) {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError({ index: value.length, message: "Photo is over 5 MB" });
      return;
    }
    setBusy(true);
    try {
      const resized = await resizeImage(file, MAX_EDGE_PX);
      const { url } = await uploadPhoto(resized);
      onChange([...value, url]);
    } catch {
      setError({ index: value.length, message: "Couldn't upload that photo" });
    } finally {
      setBusy(false);
    }
  }

  function confirmRemove() {
    if (removeIndex === null) return;
    const next = value.filter((_, i) => i !== removeIndex);
    onChange(next);
    setRemoveIndex(null);
  }

  return (
    <div className="flex flex-col gap-stack-sm">
      <ul className="grid grid-cols-3 gap-stack-xs sm:grid-cols-4 lg:grid-cols-6">
        {value.map((url, i) => (
          <li key={`${i}-${url.slice(-12)}`} className="relative">
            <span
              className={cn(
                "block aspect-square overflow-hidden rounded-card border border-border bg-surface-sunken"
              )}
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
            </span>
            <button
              type="button"
              aria-label={`Photo ${i + 1} of ${value.length} — remove`}
              onClick={() => setRemoveIndex(i)}
              disabled={disabled}
              className={cn(
                "absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center",
                "rounded-pill bg-surface/90 text-text-primary shadow-sm",
                "transition-colors duration-fast ease-standard hover:bg-surface",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              )}
            >
              <Trash2 aria-hidden className="h-3 w-3" />
            </button>
          </li>
        ))}
        {!atCap ? (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || busy}
              aria-label="Add photo"
              aria-disabled={atCap || undefined}
              className={cn(
                "flex aspect-square w-full items-center justify-center rounded-card border-2 border-dashed border-border bg-surface text-text-secondary",
                "transition-colors duration-fast ease-standard hover:bg-surface-sunken hover:text-text-primary",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                (disabled || busy) && "cursor-not-allowed opacity-60"
              )}
            >
              <ImagePlus aria-hidden className="h-5 w-5" />
            </button>
          </li>
        ) : null}
      </ul>

      {error ? (
        <p role="alert" className="text-sm text-signal-danger">
          {error.message}
        </p>
      ) : null}
      <p className="text-xs text-text-muted">
        Up to {max} photos. {value.length} added.
      </p>

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
        open={removeIndex !== null}
        onClose={() => setRemoveIndex(null)}
        side="center"
        ariaLabelledBy="remove-photo-title"
      >
        <SheetHeader
          title="Remove photo?"
          description="You can add it again later."
          onClose={() => setRemoveIndex(null)}
          titleId="remove-photo-title"
        />
        <SheetFooter>
          <Button variant="ghost" onClick={() => setRemoveIndex(null)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirmRemove}>
            Remove
          </Button>
        </SheetFooter>
      </Sheet>
    </div>
  );
}
