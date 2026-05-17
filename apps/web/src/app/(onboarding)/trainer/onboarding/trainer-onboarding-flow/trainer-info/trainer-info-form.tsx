"use client";

import * as React from "react";
import { Sheet, SheetHeader, SheetBody, FormField, Input } from "@famm/ui";
import { OtpForm } from "@/components/auth/OtpForm";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { TimezoneSelect } from "@/components/profile/TimezoneSelect";
import { VerificationBadge } from "@/components/profile/VerificationBadge";
import { useOnboardingStep } from "@/lib/onboarding/context";
import { useOnboardingProgress } from "@/lib/onboarding/use-onboarding-progress";
import { TrainerInfoSchema, PasswordChangeSchema } from "@/lib/onboarding/trainer-info-schema";
import { ProfileApiError, setPassword, updateMe, type MeUser } from "@/lib/api/profile";
import { trackEvent } from "@/lib/api/events";
import { cn } from "@/lib/cn";

interface TrainerInfoFormProps {
  initialUser: MeUser;
  tenantSlug: string;
}

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  phone?: string;
  timezone?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  summary?: string;
}

export function TrainerInfoForm({ initialUser, tenantSlug }: TrainerInfoFormProps) {
  const [firstName, setFirstName] = React.useState(initialUser.firstName);
  const [lastName, setLastName] = React.useState(initialUser.lastName);
  const [phone, setPhone] = React.useState(initialUser.phone ?? "");
  const [phoneVerified, setPhoneVerified] = React.useState<boolean>(
    Boolean(initialUser.phoneVerified)
  );
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(initialUser.avatarUrl);
  const [timezone, setTimezone] = React.useState(initialUser.timezone);
  const [pwOpen, setPwOpen] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [verifyOpen, setVerifyOpen] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrors>({});

  const { patch } = useOnboardingProgress();

  const initialPhone = initialUser.phone ?? "";
  const phoneChanged = phone.trim() !== initialPhone.trim();
  // Editing a previously verified phone resets the verified flag locally.
  React.useEffect(() => {
    if (phoneChanged) setPhoneVerified(false);
    // If the user reverted to the original verified phone, restore the flag.
    if (!phoneChanged && initialUser.phoneVerified) setPhoneVerified(true);
  }, [phoneChanged, initialUser.phoneVerified]);

  const dirty =
    firstName !== initialUser.firstName ||
    lastName !== initialUser.lastName ||
    phone.trim() !== initialPhone.trim() ||
    avatarUrl !== initialUser.avatarUrl ||
    timezone !== initialUser.timezone ||
    Boolean(newPassword);

  const requiredOk =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    phone.trim().length > 0 &&
    phoneVerified &&
    timezone.length > 0;

  const passwordValid =
    !pwOpen ||
    (!newPassword && !confirmPassword && !currentPassword) ||
    (newPassword.length >= 8 &&
      newPassword === confirmPassword &&
      (!initialUser.hasPassword || currentPassword.length > 0));

  const continueDisabled = !requiredOk || !passwordValid;

  const onContinue = React.useCallback(async () => {
    setErrors({});
    const profileResult = TrainerInfoSchema.safeParse({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      timezone,
      avatarUrl,
    });
    if (!profileResult.success) {
      const f: FieldErrors = {};
      for (const issue of profileResult.error.errors) {
        const key = issue.path[0] as keyof FieldErrors | undefined;
        if (key) f[key] = issue.message;
      }
      setErrors(f);
      return false;
    }

    if (!phoneVerified) {
      setErrors({ phone: "Please verify this phone before continuing." });
      return false;
    }

    if (pwOpen && (newPassword || confirmPassword || currentPassword)) {
      const pwResult = PasswordChangeSchema.safeParse({
        currentPassword: currentPassword || undefined,
        newPassword,
        confirmPassword,
      });
      if (!pwResult.success) {
        const f: FieldErrors = {};
        for (const issue of pwResult.error.errors) {
          const key = issue.path[0] as keyof FieldErrors | undefined;
          if (key) f[key] = issue.message;
        }
        setErrors(f);
        return false;
      }
    }

    try {
      if (pwOpen && newPassword) {
        await setPassword({
          ...(initialUser.hasPassword ? { currentPassword } : {}),
          newPassword,
        });
      }
      const saved = await updateMe(profileResult.data);
      await patch("trainer-info", {
        firstName: saved.firstName,
        lastName: saved.lastName,
        phone: saved.phone,
        timezone: saved.timezone,
        avatarUrl: saved.avatarUrl,
        hasPassword: pwOpen && Boolean(newPassword) ? true : initialUser.hasPassword,
        completedAt: new Date().toISOString(),
      });
      return true;
    } catch (err) {
      if (err instanceof ProfileApiError) {
        if (err.code === "PHONE_TAKEN") {
          setErrors({ phone: err.message });
        } else if (err.code === "INVALID_PASSWORD") {
          setErrors({ currentPassword: "Current password is incorrect" });
        } else if (err.code === "WEAK_PASSWORD") {
          setErrors({ newPassword: err.message });
        } else if (err.fieldErrors.length > 0) {
          const f: FieldErrors = {};
          for (const fe of err.fieldErrors) {
            const key = fe.field.split(".")[0] as keyof FieldErrors | undefined;
            if (key) f[key] = fe.message;
          }
          setErrors(f);
        } else {
          setErrors({ summary: err.message });
        }
      } else {
        setErrors({ summary: "Couldn't save your profile. Try again." });
      }
      return false;
    }
  }, [
    firstName,
    lastName,
    phone,
    timezone,
    avatarUrl,
    phoneVerified,
    pwOpen,
    currentPassword,
    newPassword,
    confirmPassword,
    initialUser.hasPassword,
    patch,
  ]);

  useOnboardingStep("trainer-info", {
    onContinue,
    continueDisabled,
    dirty,
  });

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const emailVerified = Boolean(initialUser.emailVerified);
  const showSetCopy = !initialUser.hasPassword;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onContinue();
      }}
      className="flex flex-col gap-stack-lg"
      noValidate
    >
      <p className="text-sm text-text-secondary">
        One minute. We use this on your public booking page and your SMS reminders.
      </p>

      <section aria-labelledby="photo-heading" className="flex flex-col gap-stack-sm">
        <h2 id="photo-heading" className="text-sm font-semibold text-text-primary">
          Photo
        </h2>
        <AvatarUploader value={avatarUrl} onChange={setAvatarUrl} initials={initials} />
      </section>

      <section
        aria-labelledby="name-heading"
        className="grid grid-cols-1 gap-stack-sm md:grid-cols-2"
      >
        <h2 id="name-heading" className="sr-only">
          Your name
        </h2>
        <FormField label="First name" error={errors.firstName}>
          <Input
            name="firstName"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Last name" error={errors.lastName}>
          <Input
            name="lastName"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </FormField>
      </section>

      <FormField
        label="Email"
        hint={emailVerified ? undefined : "We'll send a magic link to confirm this."}
      >
        <div className="flex flex-col gap-stack-xs">
          <Input
            name="email"
            type="email"
            autoComplete="email"
            value={initialUser.email}
            readOnly
            aria-readonly="true"
          />
          <span>
            <VerificationBadge verified={emailVerified} verifyLabel="Resend email" />
          </span>
        </div>
      </FormField>

      <FormField
        label="Phone"
        hint="We use this for SMS confirmations and client reminders."
        error={errors.phone}
      >
        <div className="flex flex-col gap-stack-xs">
          <Input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+15551234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <span>
            <VerificationBadge
              verified={phoneVerified}
              onVerify={phone.trim().length > 0 ? () => setVerifyOpen(true) : undefined}
              verifyLabel="Verify phone"
            />
          </span>
        </div>
      </FormField>

      <FormField label="Timezone" error={errors.timezone}>
        <TimezoneSelect value={timezone} onChange={setTimezone} required />
      </FormField>

      <section
        aria-labelledby="password-heading"
        className="rounded-card border border-border bg-surface"
      >
        <button
          type="button"
          onClick={() => setPwOpen((s) => !s)}
          aria-expanded={pwOpen}
          aria-controls="password-region"
          className={cn(
            "flex w-full items-center justify-between gap-inline-sm px-inset-md py-inset-sm text-left text-sm font-medium text-text-primary",
            "transition-colors duration-fast ease-standard hover:bg-surface-sunken",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
          )}
        >
          <span id="password-heading">
            {showSetCopy ? "Set a password" : "Change your password"}
          </span>
          <span aria-hidden="true" className="text-text-secondary">
            {pwOpen ? "Hide" : "Show"}
          </span>
        </button>
        {pwOpen ? (
          <div
            id="password-region"
            className="flex flex-col gap-stack-sm border-t border-border p-inset-md"
          >
            <p className="text-xs text-text-secondary">
              {showSetCopy
                ? "Adding a password lets you sign in from any device."
                : "Enter your current password to change it."}
            </p>
            {!showSetCopy ? (
              <FormField label="Current password" error={errors.currentPassword}>
                <Input
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </FormField>
            ) : null}
            <FormField
              label="New password"
              hint="At least 8 characters, with a letter and a digit."
              error={errors.newPassword}
            >
              <div className="flex items-stretch gap-inline-xs">
                <Input
                  name="newPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((s) => !s)}
                  className="inline-flex h-10 items-center justify-center rounded-control border border-border bg-surface px-inset-sm text-sm font-medium text-text-secondary transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </FormField>
            <FormField label="Confirm new password" error={errors.confirmPassword}>
              <Input
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </FormField>
          </div>
        ) : null}
      </section>

      {errors.summary ? (
        <p
          role="alert"
          className="rounded-card border border-signal-danger/30 bg-signal-danger/10 p-inset-sm text-sm text-signal-danger"
        >
          {errors.summary}
        </p>
      ) : null}

      {/* Visually hidden submit so Enter triggers the shell's onContinue. */}
      <button type="submit" className="sr-only">
        Save and continue
      </button>

      <Sheet
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        ariaLabelledBy="verify-phone-title"
      >
        <SheetHeader
          title="Verify your phone"
          description="We'll text a 6-digit code so reminders land on the right device."
          onClose={() => setVerifyOpen(false)}
          titleId="verify-phone-title"
        />
        <SheetBody>
          <OtpForm
            phone={phone.trim()}
            tenantSlug={tenantSlug}
            onSuccess={() => {
              setPhoneVerified(true);
              setVerifyOpen(false);
              trackEvent({ name: "profile.phone.verified" });
            }}
          />
        </SheetBody>
      </Sheet>
    </form>
  );
}
