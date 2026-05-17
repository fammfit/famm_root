"use client";

import * as React from "react";
import Link from "next/link";
import {
  UserCircle2,
  ShieldCheck,
  Users,
  Building2,
  CalendarClock,
  CreditCard,
  Receipt,
  Bell,
  PlugZap,
  Database,
  AlertOctagon,
  ExternalLink,
} from "lucide-react";
import { Card, Button } from "@famm/ui";
import { SectionCard, type SectionStatus } from "@/components/settings/SectionCard";
import { AccountIdentitySection } from "@/components/settings/sections/AccountIdentitySection";
import { SecuritySection } from "@/components/settings/sections/SecuritySection";
import { TeamSection } from "@/components/settings/sections/TeamSection";
import { BookingDefaultsSection } from "@/components/settings/sections/BookingDefaultsSection";
import { TaxSection } from "@/components/settings/sections/TaxSection";
import { NotificationsSection } from "@/components/settings/sections/NotificationsSection";
import { DangerZoneSection } from "@/components/settings/sections/DangerZoneSection";
import { trackEvent } from "@/lib/api/events";
import type { MeUser } from "@/lib/api/profile";
import type { TenantBundle } from "@/lib/business/types";

export interface AccountAdminClientProps {
  initialMe: MeUser;
  initialBundle: TenantBundle;
  isOwner: boolean;
  currentUserId: string;
}

type SectionKey =
  | "identity"
  | "security"
  | "team"
  | "business"
  | "booking-defaults"
  | "payments"
  | "tax"
  | "notifications"
  | "integrations"
  | "data-privacy"
  | "danger-zone";

const SECTION_DEFS: ReadonlyArray<{
  key: SectionKey;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}> = [
  { key: "identity", icon: UserCircle2, title: "Account identity" },
  { key: "security", icon: ShieldCheck, title: "Security & sessions" },
  { key: "team", icon: Users, title: "Team & roles" },
  { key: "business", icon: Building2, title: "Business info" },
  { key: "booking-defaults", icon: CalendarClock, title: "Booking defaults" },
  { key: "payments", icon: CreditCard, title: "Payments & payouts" },
  { key: "tax", icon: Receipt, title: "Tax" },
  { key: "notifications", icon: Bell, title: "Notifications" },
  { key: "integrations", icon: PlugZap, title: "Integrations" },
  { key: "data-privacy", icon: Database, title: "Data & privacy" },
  { key: "danger-zone", icon: AlertOctagon, title: "Danger zone" },
];

export function AccountAdminClient({
  initialMe,
  initialBundle,
  isOwner,
  currentUserId,
}: AccountAdminClientProps) {
  const [me, setMe] = React.useState(initialMe);
  const [open, setOpen] = React.useState<SectionKey | null>("identity");

  // Reflect open section in the URL hash so refresh restores position.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (hash && SECTION_DEFS.some((s) => s.key === hash)) {
      setOpen(hash as SectionKey);
    }
  }, []);

  function toggle(key: SectionKey) {
    setOpen((prev) => {
      const next = prev === key ? null : key;
      if (next && typeof window !== "undefined") {
        window.history.replaceState(null, "", `#${next}`);
        trackEvent({ name: "settings.section.opened", payload: { section: next } });
      }
      return next;
    });
  }

  const ownerOnlyReason = !isOwner ? "Only the owner can change this section." : null;

  return (
    <div className="flex flex-col gap-stack-md p-inset-md md:p-inset-lg">
      <SectionCard
        id="identity"
        icon={UserCircle2}
        title="Account identity"
        summary={`${me.firstName} ${me.lastName}`.trim() || me.email}
        open={open === "identity"}
        onToggle={() => toggle("identity")}
      >
        <AccountIdentitySection me={me} onMeChange={setMe} />
      </SectionCard>

      <SectionCard
        id="security"
        icon={ShieldCheck}
        title="Security & sessions"
        summary="Password, two-factor, signed-in devices"
        open={open === "security"}
        onToggle={() => toggle("security")}
      >
        <SecuritySection />
      </SectionCard>

      <SectionCard
        id="team"
        icon={Users}
        title="Team & roles"
        summary={isOwner ? "Invite and manage teammates" : "View team"}
        open={open === "team"}
        onToggle={() => toggle("team")}
      >
        <TeamSection currentUserId={currentUserId} canEdit={isOwner} />
      </SectionCard>

      <SectionCard
        id="business"
        icon={Building2}
        title="Business info"
        summary={initialBundle.tenant.name || "Set your business name and brand"}
        open={open === "business"}
        onToggle={() => toggle("business")}
      >
        <BusinessInfoLink />
      </SectionCard>

      <SectionCard
        id="booking-defaults"
        icon={CalendarClock}
        title="Booking defaults"
        summary="Lead time, cancellation window, auto-confirm"
        open={open === "booking-defaults"}
        onToggle={() => toggle("booking-defaults")}
      >
        <BookingDefaultsSection />
      </SectionCard>

      <SectionCard
        id="payments"
        icon={CreditCard}
        title="Payments & payouts"
        summary="Stripe connection and fees"
        {...resolvePaymentStatus()}
        open={open === "payments"}
        onToggle={() => toggle("payments")}
        readOnlyReason={ownerOnlyReason}
      >
        <PaymentsLink />
      </SectionCard>

      <SectionCard
        id="tax"
        icon={Receipt}
        title="Tax"
        summary="Default rate and invoice details"
        open={open === "tax"}
        onToggle={() => toggle("tax")}
      >
        <TaxSection />
      </SectionCard>

      <SectionCard
        id="notifications"
        icon={Bell}
        title="Notifications"
        summary="Per-event email and SMS toggles"
        open={open === "notifications"}
        onToggle={() => toggle("notifications")}
      >
        <NotificationsSection />
      </SectionCard>

      <SectionCard
        id="integrations"
        icon={PlugZap}
        title="Integrations"
        summary="Google, Stripe, Square, Zapier"
        open={open === "integrations"}
        onToggle={() => toggle("integrations")}
      >
        <IntegrationsLinks />
      </SectionCard>

      <SectionCard
        id="data-privacy"
        icon={Database}
        title="Data & privacy"
        summary="Export your data"
        open={open === "data-privacy"}
        onToggle={() => toggle("data-privacy")}
      >
        <DataPrivacyBody />
      </SectionCard>

      <SectionCard
        id="danger-zone"
        icon={AlertOctagon}
        title="Danger zone"
        summary="Transfer ownership or close account"
        status={{ label: "Owner only", tone: "warning" }}
        open={open === "danger-zone"}
        onToggle={() => toggle("danger-zone")}
      >
        <DangerZoneSection isOwner={isOwner} businessName={initialBundle.tenant.name} />
      </SectionCard>
    </div>
  );
}

function resolvePaymentStatus(): { status?: { label: string; tone: SectionStatus } } {
  // The full Stripe status check lives in the onboarding step's useStripeConnect
  // hook. Here we surface a neutral badge; the linked page renders the live
  // status with its `CapabilityChecklist` and `RequirementsList`.
  return { status: { label: "Manage", tone: "muted" } };
}

function BusinessInfoLink() {
  return (
    <Card className="flex flex-col gap-stack-sm p-inset-md">
      <p className="text-sm text-text-secondary">
        Business name, country, currency, hours, and brand are edited in the onboarding flow.
        Re-open it any time to make changes.
      </p>
      <Link
        href="/trainer/onboarding/trainer-onboarding-flow/business-info"
        className="inline-flex items-center gap-inline-xs self-start text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
      >
        Edit business info
        <ExternalLink aria-hidden className="h-3 w-3" />
      </Link>
    </Card>
  );
}

function PaymentsLink() {
  return (
    <Card className="flex flex-col gap-stack-sm p-inset-md">
      <p className="text-sm text-text-secondary">
        Stripe handles checkout, payouts, and identity verification. Connect, reconnect, or check
        capability status from the onboarding step.
      </p>
      <Link
        href="/trainer/onboarding/trainer-onboarding-flow/connect-payments"
        className="inline-flex items-center gap-inline-xs self-start text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
      >
        Manage Stripe
        <ExternalLink aria-hidden className="h-3 w-3" />
      </Link>
    </Card>
  );
}

function IntegrationsLinks() {
  const items: Array<{ label: string; href: string; description: string }> = [
    {
      label: "Google Calendar",
      href: "/trainer/onboarding/trainer-onboarding-flow/connect-calendar",
      description: "Sync busy time and write new bookings to your calendar.",
    },
    {
      label: "Google Business",
      href: "/trainer/onboarding/trainer-onboarding-flow/import-business",
      description: "Pull your business listing on demand.",
    },
    {
      label: "Stripe",
      href: "/trainer/onboarding/trainer-onboarding-flow/connect-payments",
      description: "Charge cards and receive payouts.",
    },
  ];
  return (
    <ul className="flex flex-col gap-stack-xs">
      {items.map((it) => (
        <li
          key={it.label}
          className="flex flex-col gap-stack-xs rounded-card border border-border bg-surface p-inset-sm sm:flex-row sm:items-center sm:justify-between sm:gap-inline-sm"
        >
          <div className="flex min-w-0 flex-col gap-stack-xs">
            <p className="text-sm font-medium text-text-primary">{it.label}</p>
            <p className="text-xs text-text-secondary">{it.description}</p>
          </div>
          <Link
            href={it.href}
            className="inline-flex items-center gap-inline-xs self-start text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
          >
            Manage
            <ExternalLink aria-hidden className="h-3 w-3" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function DataPrivacyBody() {
  function handleExport() {
    trackEvent({ name: "settings.export.requested" });
    window.location.href = "/api/v1/account/export.json";
  }
  return (
    <Card className="flex flex-col gap-stack-sm p-inset-md">
      <p className="text-sm text-text-secondary">
        Download a snapshot of your tenant — clients, bookings, and settings — as JSON.
      </p>
      <Button type="button" variant="outline" size="md" onClick={handleExport}>
        Download account snapshot
      </Button>
    </Card>
  );
}
