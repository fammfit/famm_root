"use client";

import * as React from "react";
import { Camera, Trash2 } from "lucide-react";
import { Sheet, SheetHeader, SheetFooter, Button } from "@famm/ui";
import { uploadAvatar } from "@/lib/api/profile";
import { resizeImage } from "@/lib/uploads/resize-image";
import { cn } from "@/lib/cn";

export interface AvatarUploaderProps {
  /** The current avatar URL — may be a data: URL while the stub is in place. */
  value: string | null;
  onChange: (next: string | null) => void;
  /** Initials shown when no photo. Two letters max. */
  initials: string;
  disabled?: boolean;
}

const MAX_EDGE_PX = 512;
const MAX_BYTES = 5 * 1024 * 1024;

export function AvatarUploader({ value, onChange, initials, disabled }: AvatarUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [removeOpen, setRemoveOpen] = React.useState(false);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("Photo is over 5 MB. Try a smaller one.");
      return;
    }
    setBusy(true);
    try {
      const resized = await resizeImage(file, MAX_EDGE_PX);
      const { url } = await uploadAvatar(resized);
      onChange(url);
    } catch {
      setError("Couldn't process that photo — try a smaller one.");
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
        aria-label={value ? "Change profile photo" : "Add profile photo"}
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
        <span
          aria-hidden="true"
          className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-pill border border-border bg-surface text-text-primary shadow-sm"
        >
          <Camera aria-hidden className="h-3 w-3" />
        </span>
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
          {value ? "Change photo" : "Upload photo"}
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
        capture="user"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          // Reset so picking the same file twice re-fires the change.
          e.target.value = "";
        }}
      />

      <Sheet
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        side="center"
        ariaLabelledBy="remove-photo-title"
      >
        <SheetHeader
          title="Remove photo?"
          description="Your initials will show instead."
          onClose={() => setRemoveOpen(false)}
          titleId="remove-photo-title"
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
