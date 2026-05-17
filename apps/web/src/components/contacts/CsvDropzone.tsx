"use client";

import * as React from "react";
import { Upload, FileText } from "lucide-react";
import { Button } from "@famm/ui";
import { cn } from "@/lib/cn";

export interface CsvDropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
  /** Filename of the most recently chosen file, for feedback. */
  filename?: string | null;
}

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPT = ".csv,text/csv,application/vnd.ms-excel";

export function CsvDropzone({ onFile, disabled, filename }: CsvDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function handleFile(file: File) {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("That CSV is over 2 MB. Try a smaller export.");
      return;
    }
    const ext = file.name.toLowerCase();
    if (!ext.endsWith(".csv")) {
      setError("Use a .csv file. Export from Google Contacts works too.");
      return;
    }
    onFile(file);
  }

  return (
    <div className="flex flex-col gap-stack-xs">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (disabled) return;
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-stack-xs rounded-card border-2 border-dashed border-border bg-surface-sunken p-inset-lg text-center transition-colors duration-fast ease-standard",
          dragging && "border-accent bg-accent/5",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        {filename ? (
          <>
            <FileText aria-hidden className="h-6 w-6 text-accent" />
            <p className="text-sm font-medium text-text-primary">{filename}</p>
            <p className="text-xs text-text-secondary">Tap the button to replace.</p>
          </>
        ) : (
          <>
            <Upload aria-hidden className="h-6 w-6 text-text-secondary" />
            <p className="text-sm text-text-primary">Drop your CSV here</p>
            <p className="text-xs text-text-secondary">Or tap below to pick a file.</p>
          </>
        )}
        <Button
          type="button"
          variant="outline"
          size="md"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {filename ? "Replace file" : "Choose CSV"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-signal-danger">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-text-muted">
        Need a starter?{" "}
        <a
          href="/templates/clients-import-template.csv"
          className="font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
          download
        >
          Download the template
        </a>
        .
      </p>
    </div>
  );
}
