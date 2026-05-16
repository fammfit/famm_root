import { Hono, type Context } from "hono";
import { z } from "zod";
import { prisma } from "@famm/db";
import {
  createAccountLink,
  createCheckoutSession,
  createConnectAccount,
  createDashboardLoginLink,
  createRefund,
  getConnectAccountStatus,
  reconcileTenant,
  runEnterprisePayoutBatch,
  syncTrainerConnectStatus,
  tenantRevenueSummary,
  topTrainerEarners,
} from "@famm/payments";
import type { JwtPayload } from "@famm/types";

interface TenantCtx {
  tenantId: string;
  currency: string;
}

type Env = { Variables: { tenant: TenantCtx; user: JwtPayload } };

const payments = new Hono<Env>();

function tenantCtx(c: Context<Env>): TenantCtx {
  const t = c.get("tenant");
  if (!t) throw new Error("tenant context missing");
  return t;
}

// ─── Checkout ────────────────────────────────────────────────────────────────

const checkoutSchema = z.object({
  mode: z.enum(["payment", "subscription"]),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  bookingId: z.string().optional(),
  trainerProfileId: z.string().optional(),
  customerEmail: z.string().email().optional(),
  // NOTE: destinationAccountId is intentionally NOT accepted from the client.
  // It is derived server-side from the trainerProfile's verified Connect
  // account so a malicious caller cannot redirect funds.
  trialPeriodDays: z.number().int().min(0).max(365).optional(),
  lineItems: z
    .array(
      z.object({
        priceId: z.string().optional(),
        quantity: z.number().int().min(1).default(1),
        adhoc: z
          .object({
            name: z.string(),
            description: z.string().optional(),
            amount: z.number().int().min(0),
            currency: z.string().length(3),
          })
          .optional(),
      })
    )
    .min(1),
});

payments.post("/checkout", async (c) => {
  const tenant = tenantCtx(c);
  const user = c.get("user");
  const body = checkoutSchema.parse(await c.req.json());

  const lineItems = body.lineItems.map((li) => ({
    quantity: li.quantity,
    ...(li.priceId ? { priceId: li.priceId } : {}),
    ...(li.adhoc
      ? {
          adhoc: {
            name: li.adhoc.name,
            amount: li.adhoc.amount,
            currency: li.adhoc.currency,
            ...(li.adhoc.description ? { description: li.adhoc.description } : {}),
          },
        }
      : {}),
  }));

  // Resolve the Connect destination strictly from server state. We refuse to
  // honor a client-supplied destination — accepting one would let a caller
  // redirect platform revenue to any Connect account they control.
  let destinationAccountId: string | undefined;
  if (body.trainerProfileId) {
    // TrainerProfile is scoped to a tenant via the user's membership.
    const trainer = await prisma.trainerProfile.findFirst({
      where: {
        id: body.trainerProfileId,
        user: { memberships: { some: { tenantId: tenant.tenantId } } },
      },
      select: { stripeConnectAccountId: true },
    });
    if (!trainer) {
      return c.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Trainer not found in this tenant" },
        },
        404
      );
    }
    if (trainer.stripeConnectAccountId) {
      destinationAccountId = trainer.stripeConnectAccountId;
    }
  }

  const session = await createCheckoutSession({
    tenantId: tenant.tenantId,
    successUrl: body.successUrl,
    cancelUrl: body.cancelUrl,
    mode: body.mode,
    lineItems,
    ...(body.bookingId ? { bookingId: body.bookingId } : {}),
    ...(body.trainerProfileId ? { trainerProfileId: body.trainerProfileId } : {}),
    ...(body.customerEmail ? { customerEmail: body.customerEmail } : {}),
    ...(destinationAccountId ? { destinationAccountId } : {}),
    ...(body.trialPeriodDays ? { trialPeriodDays: body.trialPeriodDays } : {}),
    idempotencyKey: `checkout_${user.sub}_${Date.now()}`,
  });

  return c.json({ success: true, data: session });
});

// ─── Refunds ─────────────────────────────────────────────────────────────────

const refundSchema = z.object({
  paymentId: z.string(),
  amount: z.number().int().min(1).optional(),
  reason: z.enum(["duplicate", "fraudulent", "requested_by_customer"]).optional(),
  reverseCommissions: z.boolean().optional(),
});

payments.post("/refunds", async (c) => {
  const tenant = tenantCtx(c);
  const body = refundSchema.parse(await c.req.json());

  // Cross-tenant IDOR guard: only refund payments owned by the caller's
  // tenant. Without this check, an attacker who learns a paymentId can
  // refund a payment in any tenant.
  const payment = await prisma.payment.findUnique({
    where: { id: body.paymentId },
    select: { tenantId: true },
  });
  if (!payment || payment.tenantId !== tenant.tenantId) {
    return c.json(
      { success: false, error: { code: "NOT_FOUND", message: "Payment not found" } },
      404
    );
  }

  const result = await createRefund({
    paymentId: body.paymentId,
    ...(body.amount != null ? { amount: body.amount } : {}),
    ...(body.reason ? { reason: body.reason } : {}),
    ...(body.reverseCommissions != null ? { reverseCommissions: body.reverseCommissions } : {}),
    idempotencyKey: `refund_${body.paymentId}_${Date.now()}`,
  });
  return c.json({ success: true, data: result });
});

// ─── Connect onboarding (trainers) ───────────────────────────────────────────

const onboardSchema = z.object({
  trainerProfileId: z.string(),
  refreshUrl: z.string().url(),
  returnUrl: z.string().url(),
  country: z.string().length(2).optional(),
});

payments.post("/connect/onboard", async (c) => {
  const tenant = tenantCtx(c);
  const body = onboardSchema.parse(await c.req.json());
  const profile = await prisma.trainerProfile.findFirst({
    where: {
      id: body.trainerProfileId,
      user: { memberships: { some: { tenantId: tenant.tenantId } } },
    },
    include: { user: true },
  });
  if (!profile) return c.json({ success: false, error: { code: "NOT_FOUND" } }, 404);

  let accountId = profile.stripeConnectAccountId;
  if (!accountId) {
    accountId = await createConnectAccount({
      email: profile.user.email,
      ...(body.country ? { country: body.country } : {}),
      metadata: { trainerProfileId: profile.id },
    });
    await prisma.trainerProfile.update({
      where: { id: profile.id },
      data: { stripeConnectAccountId: accountId },
    });
  }
  const url = await createAccountLink(accountId, body.refreshUrl, body.returnUrl);
  return c.json({ success: true, data: { accountId, url } });
});

payments.get("/connect/:trainerProfileId/status", async (c) => {
  const tenant = tenantCtx(c);
  const id = c.req.param("trainerProfileId");
  const exists = await prisma.trainerProfile.findFirst({
    where: {
      id,
      user: { memberships: { some: { tenantId: tenant.tenantId } } },
    },
    select: { id: true },
  });
  if (!exists) return c.json({ success: false, error: { code: "NOT_FOUND" } }, 404);
  const status = await syncTrainerConnectStatus(id);
  if (!status) return c.json({ success: false, error: { code: "NO_ACCOUNT" } }, 404);
  return c.json({ success: true, data: status });
});

payments.post("/connect/:trainerProfileId/dashboard", async (c) => {
  const tenant = tenantCtx(c);
  const id = c.req.param("trainerProfileId");
  const profile = await prisma.trainerProfile.findFirst({
    where: {
      id,
      user: { memberships: { some: { tenantId: tenant.tenantId } } },
    },
    select: { stripeConnectAccountId: true },
  });
  if (!profile?.stripeConnectAccountId)
    return c.json({ success: false, error: { code: "NO_ACCOUNT" } }, 404);
  const url = await createDashboardLoginLink(profile.stripeConnectAccountId);
  return c.json({ success: true, data: { url } });
});

payments.get("/connect/account/:accountId/status", async (c) => {
  const tenant = tenantCtx(c);
  const accountId = c.req.param("accountId");
  // Only allow status lookups for Connect accounts owned by a trainer in
  // this tenant. Without this guard, any authenticated user could probe the
  // status of arbitrary platform-owned Connect accounts.
  const owned = await prisma.trainerProfile.findFirst({
    where: {
      stripeConnectAccountId: accountId,
      user: { memberships: { some: { tenantId: tenant.tenantId } } },
    },
    select: { id: true },
  });
  if (!owned) return c.json({ success: false, error: { code: "NOT_FOUND" } }, 404);
  const status = await getConnectAccountStatus(accountId);
  return c.json({ success: true, data: status });
});

// ─── Payouts ─────────────────────────────────────────────────────────────────

const payoutBatchSchema = z.object({
  currency: z.string().length(3).optional(),
  dryRun: z.boolean().optional(),
});

payments.post("/payouts/run", async (c) => {
  const tenant = tenantCtx(c);
  const body = payoutBatchSchema.parse(await c.req.json().catch(() => ({})));
  const report = await runEnterprisePayoutBatch({
    tenantId: tenant.tenantId,
    ...(body.currency ? { currency: body.currency } : {}),
    ...(body.dryRun ? { dryRun: body.dryRun } : {}),
  });
  return c.json({ success: true, data: report });
});

// ─── Analytics ───────────────────────────────────────────────────────────────

payments.get("/analytics/revenue", async (c) => {
  const tenant = tenantCtx(c);
  const start = new Date(c.req.query("start") ?? new Date(Date.now() - 30 * 86400_000));
  const end = new Date(c.req.query("end") ?? new Date());
  const currency = c.req.query("currency") ?? tenant.currency;
  const summary = await tenantRevenueSummary({ tenantId: tenant.tenantId, start, end, currency });
  return c.json({ success: true, data: summary });
});

payments.get("/analytics/top-trainers", async (c) => {
  const tenant = tenantCtx(c);
  const start = new Date(c.req.query("start") ?? new Date(Date.now() - 30 * 86400_000));
  const end = new Date(c.req.query("end") ?? new Date());
  const limit = Math.min(50, parseInt(c.req.query("limit") ?? "10"));
  const top = await topTrainerEarners(tenant.tenantId, { start, end, limit });
  return c.json({ success: true, data: top });
});

// ─── Reconciliation ──────────────────────────────────────────────────────────

payments.get("/ledger/reconcile", async (c) => {
  const tenant = tenantCtx(c);
  const report = await reconcileTenant(tenant.tenantId);
  // Serialize bigint balances for JSON.
  const serialized = {
    ...report,
    totalDebits: report.totalDebits.toString(),
    totalCredits: report.totalCredits.toString(),
    accountBalances: report.accountBalances.map((a) => ({
      ...a,
      storedBalance: a.storedBalance.toString(),
      computedBalance: a.computedBalance.toString(),
      drift: a.drift.toString(),
    })),
    drift: report.drift.map((d) => ({ ...d, drift: d.drift.toString() })),
  };
  return c.json({ success: true, data: serialized });
});

export default payments;
