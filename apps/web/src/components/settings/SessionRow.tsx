"use client";

import * as React from "react";
import { Badge } from "@famm/ui";
import type { ActiveSession } from "@/lib/account/types";

export interface SessionRowProps {
  session: ActiveSession;
}

function timeAgo(iso: string): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "—";
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function SessionRow({ session }: SessionRowProps) {
  return (
    <li className="flex items-center justify-between gap-inline-sm rounded-card border border-border bg-surface p-inset-sm">
      <div className="flex min-w-0 flex-col gap-stack-xs">
        <div className="flex flex-wrap items-center gap-inline-xs">
          <span className="truncate text-sm font-medium text-text-primary">
            {session.deviceName}
          </span>
          {session.isCurrent ? <Badge variant="success">This device</Badge> : null}
        </div>
        <span className="text-xs text-text-secondary">
          {session.ipAddress ? `${session.ipAddress} · ` : ""}Last seen{" "}
          {timeAgo(session.lastSeenAt)}
        </span>
      </div>
    </li>
  );
}
