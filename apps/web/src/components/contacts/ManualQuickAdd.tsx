"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button, Card, FormField, Input } from "@famm/ui";
import type { ContactDraft } from "@/lib/contacts/types";

export interface ManualQuickAddProps {
  onAdd: (draft: ContactDraft) => void;
}

interface DraftState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const EMPTY: DraftState = { firstName: "", lastName: "", email: "", phone: "" };

export function ManualQuickAdd({ onAdd }: ManualQuickAddProps) {
  const [draft, setDraft] = React.useState<DraftState>(EMPTY);
  const canAdd =
    draft.firstName.trim().length > 0 &&
    (draft.email.trim().length > 0 || draft.phone.trim().length > 0);

  function submit() {
    if (!canAdd) return;
    onAdd({
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      notes: "",
    });
    setDraft(EMPTY);
  }

  return (
    <Card className="flex flex-col gap-stack-sm p-inset-md">
      <h3 className="text-sm font-semibold text-text-primary">Add a client</h3>
      <div className="grid grid-cols-1 gap-stack-sm sm:grid-cols-2">
        <FormField label="First name" required>
          <Input
            value={draft.firstName}
            onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
          />
        </FormField>
        <FormField label="Last name">
          <Input
            value={draft.lastName}
            onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
          />
        </FormField>
        <FormField label="Email" hint="Email or phone is required.">
          <Input
            type="email"
            value={draft.email}
            onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
          />
        </FormField>
        <FormField label="Phone">
          <Input
            type="tel"
            value={draft.phone}
            onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
          />
        </FormField>
      </div>
      <div>
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={submit}
          disabled={!canAdd}
          aria-label="Add this client to the import list"
        >
          <Plus aria-hidden className="mr-inline-xs h-4 w-4" />
          Add to list
        </Button>
      </div>
    </Card>
  );
}
