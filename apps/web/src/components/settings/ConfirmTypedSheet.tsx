"use client";

import * as React from "react";
import { Sheet, SheetHeader, SheetFooter, Button, FormField, Input } from "@famm/ui";

export interface ConfirmTypedSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  /** The exact string the user must type to confirm. */
  expected: string;
  /** Hint text under the input. */
  hint?: string;
  /** Label for the destructive confirm button. */
  confirmLabel?: string;
  busy?: boolean;
  errorMessage?: string | null;
  onConfirm: () => Promise<void> | void;
}

/**
 * Destructive-confirmation Sheet that requires the user to type the
 * `expected` string verbatim before the confirm button enables. Used by
 * Transfer Ownership and Close Account.
 */
export function ConfirmTypedSheet({
  open,
  onClose,
  title,
  description,
  expected,
  hint,
  confirmLabel = "Confirm",
  busy,
  errorMessage,
  onConfirm,
}: ConfirmTypedSheetProps) {
  const [value, setValue] = React.useState("");
  const titleId = React.useId();

  React.useEffect(() => {
    if (!open) setValue("");
  }, [open]);

  const matches = value.trim() === expected.trim() && expected.trim().length > 0;

  return (
    <Sheet open={open} onClose={onClose} side="center" ariaLabelledBy={titleId}>
      <SheetHeader title={title} description={description} onClose={onClose} titleId={titleId} />
      <div className="flex flex-col gap-stack-sm px-inset-md pb-inset-md">
        <FormField
          label={`Type "${expected}" to confirm`}
          hint={hint}
          error={errorMessage ?? undefined}
        >
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </FormField>
      </div>
      <SheetFooter>
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={() => void onConfirm()}
          disabled={!matches || busy}
          loading={busy}
        >
          {confirmLabel}
        </Button>
      </SheetFooter>
    </Sheet>
  );
}
