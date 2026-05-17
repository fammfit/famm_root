"use client";

import * as React from "react";
import { AlertCircle, Trash2, Undo2 } from "lucide-react";
import { Badge, Input } from "@famm/ui";
import type { ContactField, ContactReviewRow as ReviewRow } from "@/lib/contacts/types";

export interface ContactReviewRowProps {
  row: ReviewRow;
  onChange: (next: ReviewRow) => void;
  onToggleExclude: () => void;
}

export function ContactReviewRow({ row, onChange, onToggleExclude }: ContactReviewRowProps) {
  const baseId = React.useId();
  const update = (field: ContactField) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...row, [field]: e.target.value });
  };

  const isDuplicate = row.dedupe !== "new";
  const hasError = row.status !== "valid";

  return (
    <li
      className="flex flex-col gap-stack-xs rounded-card border border-border bg-surface p-inset-sm data-[excluded=true]:opacity-50"
      data-excluded={row.excluded ? "true" : "false"}
    >
      <div className="flex flex-wrap items-center justify-between gap-inline-xs">
        <div className="flex flex-wrap items-center gap-inline-xs">
          {isDuplicate ? (
            <Badge variant="warning">
              {row.dedupe === "duplicate_email" ? "Duplicate email" : "Duplicate phone"}
            </Badge>
          ) : null}
          {hasError ? (
            <span className="inline-flex items-center gap-inline-xs text-xs font-medium text-signal-danger">
              <AlertCircle aria-hidden className="h-3 w-3" />
              Needs a fix
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onToggleExclude}
          className="inline-flex items-center gap-inline-xs text-xs font-medium text-text-secondary underline-offset-4 hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:underline"
        >
          {row.excluded ? (
            <>
              <Undo2 aria-hidden className="h-3 w-3" />
              Include
            </>
          ) : (
            <>
              <Trash2 aria-hidden className="h-3 w-3" />
              Skip this row
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-stack-xs sm:grid-cols-2">
        <div className="flex flex-col gap-stack-xs">
          <label htmlFor={`${baseId}-first`} className="text-xs font-medium text-text-secondary">
            First name
          </label>
          <Input
            id={`${baseId}-first`}
            value={row.firstName}
            onChange={update("firstName")}
            disabled={row.excluded}
            aria-invalid={row.errors.firstName ? "true" : undefined}
          />
        </div>
        <div className="flex flex-col gap-stack-xs">
          <label htmlFor={`${baseId}-last`} className="text-xs font-medium text-text-secondary">
            Last name
          </label>
          <Input
            id={`${baseId}-last`}
            value={row.lastName}
            onChange={update("lastName")}
            disabled={row.excluded}
          />
        </div>
        <div className="flex flex-col gap-stack-xs">
          <label htmlFor={`${baseId}-email`} className="text-xs font-medium text-text-secondary">
            Email
          </label>
          <Input
            id={`${baseId}-email`}
            type="email"
            value={row.email}
            onChange={update("email")}
            disabled={row.excluded}
            aria-invalid={row.errors.email ? "true" : undefined}
          />
          {row.errors.email ? (
            <span role="alert" className="text-xs text-signal-danger">
              {row.errors.email}
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-stack-xs">
          <label htmlFor={`${baseId}-phone`} className="text-xs font-medium text-text-secondary">
            Phone
          </label>
          <Input
            id={`${baseId}-phone`}
            type="tel"
            value={row.phone}
            onChange={update("phone")}
            disabled={row.excluded}
            aria-invalid={row.errors.phone ? "true" : undefined}
          />
          {row.errors.phone ? (
            <span role="alert" className="text-xs text-signal-danger">
              {row.errors.phone}
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}
