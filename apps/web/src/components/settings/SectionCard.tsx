"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Badge, Card } from "@famm/ui";
import { cn } from "@/lib/cn";

export type SectionStatus = "ok" | "warning" | "error" | "info" | "muted";

export interface SectionCardProps {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  summary: string;
  /** Optional status pill in the header. */
  status?: { label: string; tone: SectionStatus };
  /** Locked sections render the body but disable controls + show a banner. */
  readOnlyReason?: string | null;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const STATUS_VARIANT: Record<
  SectionStatus,
  "default" | "success" | "warning" | "destructive" | "secondary"
> = {
  ok: "success",
  warning: "warning",
  error: "destructive",
  info: "default",
  muted: "secondary",
};

export function SectionCard({
  id,
  icon: Icon,
  title,
  summary,
  status,
  readOnlyReason,
  open,
  onToggle,
  children,
}: SectionCardProps) {
  const bodyId = `${id}-body`;
  return (
    <Card id={id} className="overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
        className="flex w-full items-center gap-inline-sm p-inset-md text-left transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:bg-surface-sunken"
      >
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-accent/10 text-accent"
        >
          <Icon className="h-5 w-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-stack-xs">
          <span className="flex flex-wrap items-center gap-inline-xs">
            <span className="text-sm font-semibold text-text-primary">{title}</span>
            {status ? <Badge variant={STATUS_VARIANT[status.tone]}>{status.label}</Badge> : null}
          </span>
          <span className="truncate text-xs text-text-secondary">{summary}</span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "h-4 w-4 shrink-0 text-text-secondary transition-transform duration-fast ease-standard",
            open && "rotate-180"
          )}
        />
      </button>
      {open ? (
        <div
          id={bodyId}
          role="region"
          aria-labelledby={`${id}-title`}
          className="flex flex-col gap-stack-sm border-t border-border p-inset-md"
        >
          {readOnlyReason ? (
            <p
              role="status"
              className="rounded-card border border-border bg-surface-sunken p-inset-sm text-xs text-text-secondary"
            >
              {readOnlyReason}
            </p>
          ) : null}
          {children}
        </div>
      ) : null}
    </Card>
  );
}
