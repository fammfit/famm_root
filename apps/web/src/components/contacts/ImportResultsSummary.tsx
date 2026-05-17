"use client";

import * as React from "react";
import { CheckCircle2, AlertTriangle, Mail } from "lucide-react";
import { Card } from "@famm/ui";
import type { ImportResultsSummary as Summary } from "@/lib/contacts/types";

export interface ImportResultsSummaryProps {
  summary: Summary;
}

export function ImportResultsSummary({ summary }: ImportResultsSummaryProps) {
  return (
    <Card className="flex flex-col gap-stack-sm border-signal-success/30 bg-signal-success/5 p-inset-md">
      <div className="flex items-center gap-inline-sm">
        <CheckCircle2 aria-hidden className="h-5 w-5 text-signal-success" />
        <h3 className="text-sm font-semibold text-text-primary">
          {summary.importedCount} client{summary.importedCount === 1 ? "" : "s"} imported
        </h3>
      </div>
      <ul className="flex flex-col gap-stack-xs text-sm text-text-secondary">
        {summary.duplicateCount > 0 ? (
          <li className="flex items-center gap-inline-xs">
            <AlertTriangle aria-hidden className="h-4 w-4 text-signal-warning" />
            {summary.duplicateCount} duplicate{summary.duplicateCount === 1 ? "" : "s"} skipped
          </li>
        ) : null}
        {summary.invitesSent > 0 ? (
          <li className="flex items-center gap-inline-xs">
            <Mail aria-hidden className="h-4 w-4 text-accent" />
            {summary.invitesSent} invite{summary.invitesSent === 1 ? "" : "s"} sent
          </li>
        ) : null}
        {summary.skippedCount > 0 ? (
          <li>
            {summary.skippedCount} row{summary.skippedCount === 1 ? "" : "s"} left for later
          </li>
        ) : null}
      </ul>
    </Card>
  );
}
