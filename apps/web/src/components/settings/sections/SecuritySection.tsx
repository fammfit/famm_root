"use client";

import * as React from "react";
import { Sheet, SheetHeader, SheetFooter, Button, FormField, Input } from "@famm/ui";
import { setPassword } from "@/lib/api/profile";
import { useRevokeOtherSessions, useSecurity, useUpdateSecurity } from "@/lib/account/api";
import { SessionRow } from "@/components/settings/SessionRow";
import { trackEvent } from "@/lib/api/events";

export interface SecuritySectionProps {
  readOnly?: boolean;
}

export function SecuritySection({ readOnly }: SecuritySectionProps) {
  const { data, isLoading } = useSecurity();
  const updateSecurity = useUpdateSecurity();
  const revokeOthers = useRevokeOtherSessions();
  const [passwordOpen, setPasswordOpen] = React.useState(false);

  if (isLoading || !data) {
    return <div className="h-16 animate-pulse rounded-card bg-surface-sunken" />;
  }

  const { security, sessions } = data;
  const othersCount = sessions.filter((s) => !s.isCurrent).length;

  const setMfa = async (method: "none" | "sms" | "totp") => {
    await updateSecurity.mutateAsync({ mfaMethod: method });
    trackEvent({ name: "settings.saved", payload: { section: "security.mfa" } });
  };

  return (
    <>
      <section className="flex flex-col gap-stack-sm">
        <h3 className="text-sm font-semibold text-text-primary">Password</h3>
        <div className="flex flex-wrap items-center justify-between gap-inline-sm">
          <p className="text-xs text-text-secondary">
            {security.passwordUpdatedAt
              ? `Last changed ${new Date(security.passwordUpdatedAt).toLocaleDateString()}`
              : "Set a password to sign in by email"}
          </p>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => setPasswordOpen(true)}
            disabled={readOnly}
          >
            Change password
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-stack-sm">
        <h3 className="text-sm font-semibold text-text-primary">Two-factor</h3>
        <p className="text-xs text-text-secondary">
          A second step at sign-in stops takeovers even if your password leaks.
        </p>
        <div className="flex flex-wrap gap-inline-xs">
          <Button
            type="button"
            variant={security.mfaMethod === "none" ? "default" : "outline"}
            size="md"
            onClick={() => void setMfa("none")}
            disabled={readOnly || updateSecurity.isPending}
          >
            Off
          </Button>
          <Button
            type="button"
            variant={security.mfaMethod === "sms" ? "default" : "outline"}
            size="md"
            onClick={() => void setMfa("sms")}
            disabled={readOnly || updateSecurity.isPending}
          >
            SMS code
          </Button>
          <Button
            type="button"
            variant={security.mfaMethod === "totp" ? "default" : "outline"}
            size="md"
            onClick={() => void setMfa("totp")}
            disabled={readOnly || updateSecurity.isPending}
          >
            Authenticator app
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-stack-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-inline-sm">
          <h3 className="text-sm font-semibold text-text-primary">Active sessions</h3>
          {othersCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void revokeOthers.mutateAsync()}
              loading={revokeOthers.isPending}
              disabled={readOnly}
            >
              Sign out everywhere else
            </Button>
          ) : null}
        </div>
        <ul className="flex flex-col gap-stack-xs">
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}
        </ul>
      </section>

      <ChangePasswordSheet open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </>
  );
}

function ChangePasswordSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirmation, setConfirmation] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    if (!open) {
      setCurrent("");
      setNext("");
      setConfirmation("");
      setErrorMessage(null);
    }
  }, [open]);

  const mismatch = next.length > 0 && confirmation.length > 0 && next !== confirmation;
  const tooShort = next.length > 0 && next.length < 10;
  const canSubmit = current.length > 0 && next.length >= 10 && next === confirmation && !busy;

  async function submit() {
    setErrorMessage(null);
    setBusy(true);
    try {
      await setPassword({ currentPassword: current, newPassword: next });
      trackEvent({ name: "settings.saved", payload: { section: "security.password" } });
      onClose();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Couldn't change password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} side="center" ariaLabelledBy={titleId}>
      <SheetHeader
        title="Change password"
        description="Use at least 10 characters with a number and a symbol."
        onClose={onClose}
        titleId={titleId}
      />
      <div className="flex flex-col gap-stack-sm px-inset-md pb-inset-md">
        <FormField label="Current password" required>
          <Input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
          />
        </FormField>
        <FormField
          label="New password"
          required
          error={tooShort ? "At least 10 characters" : undefined}
        >
          <Input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
          />
        </FormField>
        <FormField
          label="Confirm new password"
          required
          error={mismatch ? "Doesn't match" : undefined}
        >
          <Input
            type="password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="new-password"
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
        <Button onClick={() => void submit()} disabled={!canSubmit} loading={busy}>
          Save password
        </Button>
      </SheetFooter>
    </Sheet>
  );
}
