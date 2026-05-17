"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sheet, SheetHeader, SheetFooter, Button, FormField, Input } from "@famm/ui";
import { DangerZoneRow } from "@/components/settings/DangerZoneRow";
import { ConfirmTypedSheet } from "@/components/settings/ConfirmTypedSheet";
import {
  useCloseAccount,
  useConfirmTransfer,
  useInitiateTransfer,
  useTeam,
} from "@/lib/account/api";
import { trackEvent } from "@/lib/api/events";
import type { Teammate } from "@/lib/account/types";

export interface DangerZoneSectionProps {
  /** Owner-only sections only render when this is true. */
  isOwner: boolean;
  /** Used to scope the close-account typed confirmation. */
  businessName: string;
}

export function DangerZoneSection({ isOwner, businessName }: DangerZoneSectionProps) {
  const [transferOpen, setTransferOpen] = React.useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = React.useState(false);
  const [closeError, setCloseError] = React.useState<string | null>(null);
  const closeAccountMutation = useCloseAccount();
  const router = useRouter();

  async function handleClose(value: string) {
    setCloseError(null);
    try {
      await closeAccountMutation.mutateAsync(value);
      trackEvent({ name: "settings.account.closed.requested" });
      router.push("/login?account=closed");
    } catch (e) {
      setCloseError(e instanceof Error ? e.message : "Couldn't close account");
    }
  }

  if (!isOwner) {
    return (
      <p className="text-sm text-text-secondary">
        Only the owner can transfer ownership or close the account.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-stack-sm">
      <DangerZoneRow
        title="Transfer ownership"
        description="Hand the account over to another admin. You stay on as an admin."
        actionLabel="Transfer"
        onAction={() => setTransferOpen(true)}
      />
      <DangerZoneRow
        title="Close account"
        description="Permanent. Cancel future bookings and clear out clients first."
        actionLabel="Close account"
        onAction={() => setConfirmCloseOpen(true)}
      />

      <TransferOwnershipSheet open={transferOpen} onClose={() => setTransferOpen(false)} />

      <ConfirmTypedSheet
        open={confirmCloseOpen}
        onClose={() => {
          setConfirmCloseOpen(false);
          setCloseError(null);
        }}
        title="Close this account?"
        description="This signs you out and locks the workspace. You can't undo it."
        expected={businessName || "FAMM"}
        hint="Type your business name exactly."
        confirmLabel="Close account"
        busy={closeAccountMutation.isPending}
        errorMessage={closeError}
        onConfirm={() => handleClose((businessName || "FAMM").trim())}
      />
    </div>
  );
}

function TransferOwnershipSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useTeam();
  const initiate = useInitiateTransfer();
  const confirmMutation = useConfirmTransfer();
  const [target, setTarget] = React.useState<Teammate | null>(null);
  const [ticketId, setTicketId] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [stepError, setStepError] = React.useState<string | null>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    if (!open) {
      setTarget(null);
      setTicketId(null);
      setCode("");
      setStepError(null);
    }
  }, [open]);

  const eligible = (data?.members ?? []).filter(
    (m) => m.role === "TENANT_ADMIN" && m.status === "active"
  );

  async function startTransfer() {
    if (!target) return;
    setStepError(null);
    try {
      const ticket = await initiate.mutateAsync(target.id);
      setTicketId(ticket.ticketId);
    } catch (e) {
      setStepError(e instanceof Error ? e.message : "Couldn't start transfer");
    }
  }

  async function confirmTransferStep() {
    if (!ticketId) return;
    setStepError(null);
    try {
      await confirmMutation.mutateAsync({ ticketId, code });
      trackEvent({ name: "settings.transfer.confirmed" });
      onClose();
    } catch (e) {
      setStepError(e instanceof Error ? e.message : "Couldn't confirm");
    }
  }

  return (
    <Sheet open={open} onClose={onClose} side="center" ariaLabelledBy={titleId}>
      <SheetHeader
        title="Transfer ownership"
        description="Pick an admin teammate. We'll text you a code to confirm."
        onClose={onClose}
        titleId={titleId}
      />
      <div className="flex flex-col gap-stack-sm px-inset-md pb-inset-md">
        {ticketId ? (
          <FormField label="Enter the 6-digit code we sent" required>
            <Input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              autoComplete="one-time-code"
            />
          </FormField>
        ) : eligible.length === 0 ? (
          <p className="text-sm text-text-secondary">
            Promote a teammate to admin first — only active admins can receive ownership.
          </p>
        ) : (
          <FormField label="New owner">
            <select
              value={target?.id ?? ""}
              onChange={(e) => setTarget(eligible.find((m) => m.id === e.target.value) ?? null)}
              aria-label="Pick new owner"
              className="h-control w-full rounded-control border border-border bg-surface px-inset-sm text-sm text-text-primary"
            >
              <option value="">Choose…</option>
              {eligible.map((m) => (
                <option key={m.id} value={m.id}>
                  {`${m.firstName} ${m.lastName}`.trim() || m.email}
                </option>
              ))}
            </select>
          </FormField>
        )}
        {stepError ? (
          <p role="alert" className="text-sm text-signal-danger">
            {stepError}
          </p>
        ) : null}
      </div>
      <SheetFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        {ticketId ? (
          <Button
            onClick={() => void confirmTransferStep()}
            disabled={code.length !== 6 || confirmMutation.isPending}
            loading={confirmMutation.isPending}
          >
            Confirm transfer
          </Button>
        ) : (
          <Button
            onClick={() => void startTransfer()}
            disabled={!target || initiate.isPending}
            loading={initiate.isPending}
          >
            Send code
          </Button>
        )}
      </SheetFooter>
    </Sheet>
  );
}
