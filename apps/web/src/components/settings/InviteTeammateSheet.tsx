"use client";

import * as React from "react";
import { Sheet, SheetHeader, SheetFooter, Button, FormField, Input } from "@famm/ui";
import { RolePicker } from "./RolePicker";
import type { MemberRole } from "@/lib/account/types";

export interface InviteTeammateSheetProps {
  open: boolean;
  onClose: () => void;
  onInvite: (input: {
    email: string;
    firstName: string;
    lastName: string;
    role: Exclude<MemberRole, "TENANT_OWNER" | "CLIENT" | "SUPER_ADMIN" | "GUEST">;
  }) => Promise<void> | void;
  busy?: boolean;
  errorMessage?: string | null;
}

export function InviteTeammateSheet({
  open,
  onClose,
  onInvite,
  busy,
  errorMessage,
}: InviteTeammateSheetProps) {
  const [email, setEmail] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [role, setRole] = React.useState<MemberRole>("TRAINER");
  const titleId = React.useId();

  React.useEffect(() => {
    if (!open) {
      setEmail("");
      setFirstName("");
      setLastName("");
      setRole("TRAINER");
    }
  }, [open]);

  const valid = email.trim().length > 0 && firstName.trim().length > 0;

  return (
    <Sheet open={open} onClose={onClose} side="center" ariaLabelledBy={titleId}>
      <SheetHeader
        title="Invite a teammate"
        description="They'll get an email with a link to join your account."
        onClose={onClose}
        titleId={titleId}
      />
      <div className="flex flex-col gap-stack-sm px-inset-md pb-inset-md">
        <FormField label="Email" required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </FormField>
        <div className="grid grid-cols-1 gap-stack-sm sm:grid-cols-2">
          <FormField label="First name" required>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </FormField>
          <FormField label="Last name">
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </FormField>
        </div>
        <FormField label="Role">
          <RolePicker
            value={role}
            onChange={(r) => setRole(r)}
            hideOwner
            ariaLabel="Role for invitee"
          />
        </FormField>
        {errorMessage ? (
          <p role="alert" className="text-sm text-signal-danger">
            {errorMessage}
          </p>
        ) : null}
      </div>
      <SheetFooter>
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          onClick={() =>
            void onInvite({
              email: email.trim(),
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              role: role as Exclude<
                MemberRole,
                "TENANT_OWNER" | "CLIENT" | "SUPER_ADMIN" | "GUEST"
              >,
            })
          }
          disabled={!valid || busy}
          loading={busy}
        >
          Send invite
        </Button>
      </SheetFooter>
    </Sheet>
  );
}
