"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { Badge } from "@famm/ui";
import { RolePicker } from "./RolePicker";
import type { MemberRole, Teammate } from "@/lib/account/types";

export interface TeammateRowProps {
  member: Teammate;
  isSelf: boolean;
  canEdit: boolean;
  onRoleChange: (next: MemberRole) => void;
  onRemove: () => void;
}

export function TeammateRow({ member, isSelf, canEdit, onRoleChange, onRemove }: TeammateRowProps) {
  const displayName = `${member.firstName} ${member.lastName}`.trim() || member.email;
  return (
    <li className="flex flex-col gap-stack-xs rounded-card border border-border bg-surface p-inset-sm sm:flex-row sm:items-center sm:justify-between sm:gap-inline-sm">
      <div className="flex min-w-0 flex-col gap-stack-xs">
        <div className="flex flex-wrap items-center gap-inline-xs">
          <span className="truncate text-sm font-medium text-text-primary">{displayName}</span>
          {isSelf ? <Badge variant="secondary">You</Badge> : null}
          {member.status === "invited" ? <Badge variant="outline">Invited</Badge> : null}
        </div>
        <span className="truncate text-xs text-text-secondary">{member.email}</span>
      </div>
      <div className="flex items-center gap-inline-xs">
        {member.role === "TENANT_OWNER" ? (
          <Badge variant="default">Owner</Badge>
        ) : (
          <RolePicker
            value={member.role}
            onChange={onRoleChange}
            disabled={!canEdit || isSelf}
            hideOwner
            ariaLabel={`Role for ${displayName}`}
          />
        )}
        {canEdit && !isSelf && member.role !== "TENANT_OWNER" ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${displayName}`}
            className="inline-flex h-control w-control items-center justify-center rounded-control text-text-secondary transition-colors duration-fast ease-standard hover:bg-signal-danger/10 hover:text-signal-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <Trash2 aria-hidden className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </li>
  );
}
