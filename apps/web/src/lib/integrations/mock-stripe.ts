import { labelForRequirement } from "@/lib/payments/requirement-labels";
import type { Integration, StripeAccountRequirement, StripeAccountStatus } from "./types";

/**
 * In-memory mock store for the Stripe Connect integration. Mirrors the
 * google-business / google-calendar stubs with a three-state machine:
 *
 *   not connected -> connected with requirements -> fully active
 *
 * The state advances on connect (-> requirements) and on the first
 * refresh after connect (-> active). Disconnect wipes the row.
 *
 * TODO(integration-model): swap for Prisma Integration + real Stripe API
 * calls in @famm/payments.
 */

interface StripeBundle {
  integration: Integration;
  account: StripeAccountStatus;
}

const STORE = new Map<string, StripeBundle>();

const MOCK_EMAIL = "sarah@example.com";

export const MOCK_REQUIREMENTS_PENDING: ReadonlyArray<StripeAccountRequirement> = [
  {
    field: "individual.verification.document",
    label: labelForRequirement("individual.verification.document"),
    urgency: "currently_due",
  },
  {
    field: "external_account",
    label: labelForRequirement("external_account"),
    urgency: "currently_due",
  },
];

export const MOCK_REQUIREMENTS_CLEAR: ReadonlyArray<StripeAccountRequirement> = [];

function buildIntegration(tenantId: string): Integration {
  const now = new Date().toISOString();
  return {
    id: `igr_${tenantId}_stripe`,
    tenantId,
    provider: "stripe",
    status: "CONNECTED",
    externalAccountId: `acct_${tenantId.slice(0, 8)}`,
    externalAccountEmail: MOCK_EMAIL,
    scopes: ["read_write"],
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

function buildPendingAccount(accountId: string, defaultCurrency: string): StripeAccountStatus {
  return {
    accountId,
    email: MOCK_EMAIL,
    chargesEnabled: true,
    payoutsEnabled: false,
    detailsSubmitted: false,
    status: "restricted",
    disabledReason: null,
    requirements: [...MOCK_REQUIREMENTS_PENDING],
    externalAccountLast4: null,
    payoutSchedule: null,
    defaultCurrency,
  };
}

function buildActiveAccount(accountId: string, defaultCurrency: string): StripeAccountStatus {
  return {
    accountId,
    email: MOCK_EMAIL,
    chargesEnabled: true,
    payoutsEnabled: true,
    detailsSubmitted: true,
    status: "active",
    disabledReason: null,
    requirements: [...MOCK_REQUIREMENTS_CLEAR],
    externalAccountLast4: "4242",
    payoutSchedule: { interval: "daily", delayDays: 2 },
    defaultCurrency,
  };
}

export function getStripeBundle(tenantId: string): StripeBundle | null {
  return STORE.get(tenantId) ?? null;
}

export function startStripeConnect(tenantId: string, defaultCurrency: string): StripeBundle {
  const existing = STORE.get(tenantId);
  if (existing) return existing;
  const integration = buildIntegration(tenantId);
  const account = buildPendingAccount(integration.externalAccountId, defaultCurrency);
  const bundle: StripeBundle = { integration, account };
  STORE.set(tenantId, bundle);
  return bundle;
}

/**
 * Marks the connect as completed on Stripe's side. In the stub this
 * keeps the account in `restricted` (the first refresh after this
 * advances it to active).
 */
export function markConnectReturn(tenantId: string, outcome: "ok" | "cancel"): StripeBundle | null {
  const bundle = STORE.get(tenantId);
  if (!bundle) return null;
  if (outcome === "cancel") {
    // Cancellation leaves the bundle with no progress — `detailsSubmitted`
    // stays false and requirements remain pending.
    return bundle;
  }
  const next: StripeBundle = {
    integration: { ...bundle.integration, updatedAt: new Date().toISOString() },
    account: { ...bundle.account, detailsSubmitted: true },
  };
  STORE.set(tenantId, next);
  return next;
}

/**
 * Advances the stub: first refresh after connect clears requirements
 * and activates payouts. Subsequent refreshes are no-ops.
 */
export function refreshStripeAccount(
  tenantId: string,
  defaultCurrency: string
): StripeBundle | null {
  const bundle = STORE.get(tenantId);
  if (!bundle) return null;
  if (bundle.account.status === "active") return bundle;
  const next: StripeBundle = {
    integration: { ...bundle.integration, updatedAt: new Date().toISOString() },
    account: buildActiveAccount(bundle.account.accountId, defaultCurrency),
  };
  STORE.set(tenantId, next);
  return next;
}

export function disconnectStripe(tenantId: string): void {
  STORE.delete(tenantId);
}
