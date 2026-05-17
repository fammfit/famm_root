"use client";

import * as React from "react";
import { EmptyState } from "@famm/ui";
import { ContactReviewRow } from "./ContactReviewRow";
import type { ContactReviewRow as ReviewRow } from "@/lib/contacts/types";

export interface ContactReviewTableProps {
  rows: ReadonlyArray<ReviewRow>;
  onChangeRow: (id: string, next: ReviewRow) => void;
  onToggleExclude: (id: string) => void;
}

export function ContactReviewTable({
  rows,
  onChangeRow,
  onToggleExclude,
}: ContactReviewTableProps) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No contacts to review"
        description="Pick a CSV or add a few clients by hand."
      />
    );
  }
  return (
    <ul className="flex flex-col gap-stack-sm">
      {rows.map((row) => (
        <ContactReviewRow
          key={row.id}
          row={row}
          onChange={(next) => onChangeRow(row.id, next)}
          onToggleExclude={() => onToggleExclude(row.id)}
        />
      ))}
    </ul>
  );
}
