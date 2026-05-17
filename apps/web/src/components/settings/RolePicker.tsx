"use client";

import * as React from "react";
import type { MemberRole } from "@/lib/account/types";

export interface RolePickerProps {
  value: MemberRole;
  onChange: (next: MemberRole) => void;
  /** If true, hide TENANT_OWNER from options (it's only assignable via transfer). */
  hideOwner?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

const ROLE_LABEL: Record<MemberRole, string> = {
  TENANT_OWNER: "Owner",
  TENANT_ADMIN: "Admin",
  TRAINER_LEAD: "Lead trainer",
  TRAINER: "Trainer",
  CLIENT: "Client",
};

const ASSIGNABLE: ReadonlyArray<MemberRole> = ["TENANT_ADMIN", "TRAINER_LEAD", "TRAINER"];

export function RolePicker({ value, onChange, hideOwner, disabled, ariaLabel }: RolePickerProps) {
  const options: ReadonlyArray<MemberRole> = hideOwner
    ? ASSIGNABLE
    : (["TENANT_OWNER", ...ASSIGNABLE] as MemberRole[]);
  return (
    <select
      aria-label={ariaLabel ?? "Role"}
      value={value}
      onChange={(e) => onChange(e.target.value as MemberRole)}
      disabled={disabled}
      className="h-control rounded-control border border-border bg-surface px-inset-sm text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
    >
      {options.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABEL[r]}
        </option>
      ))}
    </select>
  );
}
