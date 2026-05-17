"use client";

import * as React from "react";
import { NotificationMatrix } from "@/components/settings/NotificationMatrix";
import { SaveBar } from "@/components/settings/SaveBar";
import { useNotifications, useUpdateNotifications } from "@/lib/account/api";
import { trackEvent } from "@/lib/api/events";
import type { NotificationPrefs } from "@/lib/account/types";

export interface NotificationsSectionProps {
  readOnly?: boolean;
}

export function NotificationsSection({ readOnly }: NotificationsSectionProps) {
  const { data, isLoading } = useNotifications();
  const update = useUpdateNotifications();
  const [draft, setDraft] = React.useState<NotificationPrefs | null>(null);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (data?.notifications && !draft) setDraft(data.notifications);
  }, [data, draft]);

  if (isLoading || !data || !draft) {
    return <div className="h-16 animate-pulse rounded-card bg-surface-sunken" />;
  }

  const dirty = JSON.stringify(data.notifications) !== JSON.stringify(draft);

  async function save() {
    if (!draft) return;
    setErrorMessage(null);
    try {
      await update.mutateAsync(draft);
      setSavedAt(Date.now());
      trackEvent({ name: "settings.saved", payload: { section: "notifications" } });
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Couldn't save");
    }
  }

  return (
    <>
      <NotificationMatrix prefs={draft} onChange={setDraft} disabled={readOnly} />
      {!readOnly ? (
        <SaveBar
          visible={dirty}
          onSave={save}
          onDiscard={() => setDraft(data.notifications)}
          isSaving={update.isPending}
          savedAt={savedAt}
          errorMessage={errorMessage}
        />
      ) : null}
    </>
  );
}
