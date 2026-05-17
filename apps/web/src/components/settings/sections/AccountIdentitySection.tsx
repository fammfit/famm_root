"use client";

import * as React from "react";
import { FormField, Input, Button } from "@famm/ui";
import { TimezoneSelect } from "@/components/profile/TimezoneSelect";
import { SaveBar } from "@/components/settings/SaveBar";
import { updateMe, type MeUser } from "@/lib/api/profile";
import { trackEvent } from "@/lib/api/events";

export interface AccountIdentitySectionProps {
  me: MeUser;
  onMeChange: (next: MeUser) => void;
  readOnly?: boolean;
}

export function AccountIdentitySection({ me, onMeChange, readOnly }: AccountIdentitySectionProps) {
  const [firstName, setFirstName] = React.useState(me.firstName);
  const [lastName, setLastName] = React.useState(me.lastName);
  const [timezone, setTimezone] = React.useState(me.timezone);
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const dirty = firstName !== me.firstName || lastName !== me.lastName || timezone !== me.timezone;

  function discard() {
    setFirstName(me.firstName);
    setLastName(me.lastName);
    setTimezone(me.timezone);
    setErrorMessage(null);
  }

  async function save() {
    setErrorMessage(null);
    setSaving(true);
    try {
      const next = await updateMe({ firstName, lastName, timezone });
      onMeChange(next);
      setSavedAt(Date.now());
      trackEvent({ name: "settings.saved", payload: { section: "identity" } });
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <FormField label="Email">
        <Input value={me.email} readOnly disabled aria-readonly />
      </FormField>
      <div className="grid grid-cols-1 gap-stack-sm sm:grid-cols-2">
        <FormField label="First name" required>
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={readOnly || saving}
          />
        </FormField>
        <FormField label="Last name">
          <Input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={readOnly || saving}
          />
        </FormField>
      </div>
      <FormField label="Time zone" hint="Used for reminders and the day view.">
        <TimezoneSelect value={timezone} onChange={readOnly || saving ? () => null : setTimezone} />
      </FormField>
      {readOnly ? null : (
        <SaveBar
          visible={dirty}
          onSave={save}
          onDiscard={discard}
          isSaving={saving}
          savedAt={savedAt}
          errorMessage={errorMessage}
        />
      )}
      {readOnly ? (
        <div className="flex justify-end">
          <Button variant="ghost" disabled>
            Read-only
          </Button>
        </div>
      ) : null}
    </>
  );
}
