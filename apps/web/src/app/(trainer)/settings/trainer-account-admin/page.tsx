/**
 * @page Trainer Account Admin
 *   (/settings/trainer-account-admin)
 *
 * The spec recommends `/trainer/settings/...` but the existing trainer
 * surface (Dashboard, Calendar, Settings index) lives at the root of
 * the `(trainer)` route group with no `/trainer/` URL prefix; keeping
 * this consistent avoids a one-off URL shape.
 *
 * Purpose: the single configuration surface for a trainer's account —
 *   identity, security, team, business, booking defaults, payments,
 *   tax, notifications, integrations, data & privacy, danger zone.
 * Primary user: TENANT_OWNER (full) / TENANT_ADMIN (most sections);
 *   CLIENT redirected to /my by the (trainer) layout.
 * Core actions: edit per-section settings, invite/remove teammates,
 *   change password, toggle 2FA, revoke sessions, reconnect Stripe,
 *   set tax / booking defaults, transfer ownership, close account.
 * UI sections: collapsible SectionCard per slice; one open at a time
 *   on mobile, multiple on ≥md.
 * Empty state: Team section EmptyState when only the owner is present.
 * Loading state: per-section skeleton placeholders.
 * Error state: per-section inline errors; ErrorState shown if the
 *   underlying /tenants/me bundle fails to load.
 * Mobile layout: single column, accordion sections, sticky SaveBar
 *   per section above the BottomTabBar; bottom-tab kept visible.
 * Required data: TenantBundle, MeUser, security snapshot, team list,
 *   booking defaults, tax settings, notification prefs, Stripe status,
 *   Google integrations status.
 * Related components: SectionCard, SaveBar, ConfirmTypedSheet,
 *   RolePicker, TeammateRow, InviteTeammateSheet, SessionRow,
 *   NotificationMatrix, DangerZoneRow.
 * Route: /trainer/settings/trainer-account-admin (gated by (trainer)).
 */

import { redirect } from "next/navigation";
import { AppBar } from "@/components/nav/AppBar";
import { AccountAdminClient } from "./account-admin-client";
import { getMeServer } from "@/lib/api/profile";
import { getTenantBundleServer } from "@/lib/api/business";
import { getRequestContext } from "@/lib/request-context";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Account & Settings — FAMM",
};

const ADMIN_ROLES = new Set(["TENANT_OWNER", "TENANT_ADMIN", "SUPER_ADMIN"]);

export default async function TrainerAccountAdminPage() {
  let ctx;
  try {
    ctx = getRequestContext();
  } catch {
    redirect("/login?next=/trainer/settings/trainer-account-admin");
  }
  if (!ADMIN_ROLES.has(ctx.userRole)) {
    redirect("/dashboard");
  }

  const [me, bundle] = await Promise.all([getMeServer(), getTenantBundleServer()]);
  const isOwner = ctx.userRole === "TENANT_OWNER" || ctx.userRole === "SUPER_ADMIN";

  return (
    <>
      <AppBar title="Account & Settings" subtitle="Customize how this workspace runs" />
      <AccountAdminClient
        initialMe={me}
        initialBundle={bundle}
        isOwner={isOwner}
        currentUserId={ctx.userId}
      />
    </>
  );
}
