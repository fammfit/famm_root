"use client";

import * as React from "react";
import { FormField } from "@famm/ui";
import type { ColumnMapping, ContactField } from "@/lib/contacts/types";
import { REQUIRED_MAPPING_FIELDS } from "@/lib/contacts/csv-headers";

export interface ColumnMappingFormProps {
  headers: ReadonlyArray<string>;
  mapping: ColumnMapping;
  onChange: (next: ColumnMapping) => void;
}

const FIELD_LABELS: Record<ContactField, string> = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  phone: "Phone",
  notes: "Notes",
};

const FIELDS: ReadonlyArray<ContactField> = ["firstName", "lastName", "email", "phone", "notes"];

export function ColumnMappingForm({ headers, mapping, onChange }: ColumnMappingFormProps) {
  function setField(field: ContactField, value: string) {
    const next: ColumnMapping = { ...mapping };
    if (value === "") {
      delete next[field];
    } else {
      next[field] = value;
    }
    onChange(next);
  }

  return (
    <fieldset className="flex flex-col gap-stack-sm">
      <legend className="text-sm font-semibold text-text-primary">Match your columns</legend>
      <p className="text-xs text-text-secondary">
        We took a guess based on your headers. Adjust if anything looks off.
      </p>
      {FIELDS.map((field) => {
        const isRequired = REQUIRED_MAPPING_FIELDS.includes(field);
        return (
          <FormField key={field} label={FIELD_LABELS[field]} required={isRequired}>
            <select
              value={mapping[field] ?? ""}
              onChange={(e) => setField(field, e.target.value)}
              className="h-control w-full rounded-control border border-border bg-surface px-inset-sm text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <option value="">— Don&rsquo;t import —</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </FormField>
        );
      })}
    </fieldset>
  );
}
