# Payments and Revenue-Sharing System

Production-grade payments built on Stripe Connect. This document covers
architecture, configuration, and deployment.

## Components

| Layer   | Path                                      | Purpose                                                                                                                |
| ------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Models  | `packages/db/prisma/schema.prisma`        | Products, Prices, Customers, Subscriptions, Payments, Refunds, Commissions, Payouts, Ledger, Retry, StripeWebhookEvent |
| Engine  | `packages/payments/src/`                  | Checkout, webhooks, commissions, ledger, refunds, payouts, retry, analytics                                            |
| API     | `apps/api/src/routes/payments.ts`         | REST endpoints under `/api/v1/payments`                                                                                |
| Webhook | `apps/api/src/routes/webhooks.ts`         | `POST /api/webhooks/stripe` (no auth, signature-verified)                                                              |
| Worker  | `apps/api/src/workers/payments-worker.ts` | Retry scheduler, payout batcher, reconciliation                                                                        |

## Money handling

All amounts are stored in **minor units** (cents) as integers. Helpers
in `packages/payments/src/money.ts`:

- `toMinor(major, currency)` / `toMajor(minor, currency)` — currency-aware
- `allocate(total, weights)` — largest-remainder allocation that guarantees
  the sum of allocated parts equals the total (no rounding leakage)
- `isZeroDecimal(currency)` — JPY, KRW, etc.

## Revenue splits & commissions

`packages/payments/src/commission.ts` exposes a pure function
`computeCommissions()` that takes a `SplitRule` (basis points for platform,
tenant, trainer, lead trainer) and returns balanced beneficiary allocations.

Resolution order at runtime (`resolveSplitRule`):

1. `RevenueSplitRule` rows that target a specific trainer (priority desc)
2. `RevenueSplitRule` rows that target a tenant globally
3. Built-in defaults (`DEFAULT_PLATFORM_FEE_BPS`, `DEFAULT_LEAD_TRAINER_BPS`)

Parent/child trainer hierarchy uses `TrainerProfile.leadTrainerId`. When a
child trainer earns, the lead share is automatically routed.

Residue (when basis points sum < 10,000) defaults to the platform.

## Double-entry ledger

`packages/payments/src/ledger.ts` writes balanced ledger entries on:

- **Payment success** — `recordPaymentSucceeded()` posts CASH debit + the
  matching CREDIT lines for each beneficiary (and STRIPE_FEE if any).
- **Refund** — `recordRefund()` posts CASH credit + DEBITs to reverse
  each beneficiary's accrual.
- **Payout** — `recordPayout()` debits the trainer/tenant payable account
  and credits CASH.

Reconciliation (`reconcileTenant`) recomputes balances from entries and
flags any drift. Run it daily; alert on non-empty drift.

## Webhook idempotency

`StripeWebhookEvent` rows are upserted by Stripe's event ID before any
handler runs. Replays return `"duplicate"` immediately. Handler failures
are persisted (`failedAt`, `errorMessage`) and the route returns 500 so
Stripe will retry exponentially.

## Failed payment recovery

Schedule (`RETRY_SCHEDULE_MINUTES` in `config.ts`):

- Attempt 1: 1h after failure
- Attempt 2: 24h
- Attempt 3: 3d
- Attempt 4: 5d
- After 4 failed attempts the payment is marked FAILED.

The worker (`runRetryWorker`) claims due attempts every minute, calls
`stripe.paymentIntents.confirm()` with an idempotency key tied to the
attempt ID, then either marks SUCCEEDED, ABANDONED (3DS required), or
schedules the next retry.

## Tiered & dynamic pricing

- `computeTieredPrice(qty, tiers, mode)` — graduated and volume modes
  matching Stripe's tier semantics
- `DynamicPricingEngine` — composable hooks (surge, peak-hours, loyalty)
  evaluated in priority order, clamped to configured bounds

Hook contract: pure functions returning `{ factor?, delta?, reason }`.
Examples ship as `surgePricingHook`, `peakHoursHook`,
`loyaltyDiscountHook(bps)`.

## Stripe Connect topology

- **Platform account** — owns the application; sets webhook endpoint.
- **Connected accounts** — Stripe Express accounts per trainer
  (`TrainerProfile.stripeConnectAccountId`) and per enterprise tenant
  (`Tenant.stripeAccountId`).
- **Charge model** — Destination charges. The platform creates the
  PaymentIntent / Checkout Session with
  `transfer_data.destination = <connected_account>` and
  `application_fee_amount = platform + tenant share`. Stripe holds the
  trainer share on the connected account until payout.
- **Payouts** — `Transfer` API used to move accrued commissions in batch
  to connected accounts (`runEnterprisePayoutBatch`).

## Required environment variables

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional
PAYMENTS_RETRY_INTERVAL_MS=60000
PAYMENTS_PAYOUT_INTERVAL_MS=3600000
PAYMENTS_RECONCILE_INTERVAL_MS=86400000
```

## Setup checklist

1. **Database migration**

   ```bash
   npm run -w @famm/db db:migrate
   ```

2. **Create a webhook in Stripe Dashboard** pointing to:

   ```
   https://api.your-domain.com/api/webhooks/stripe
   ```

   Subscribe to at minimum:

   ```
   checkout.session.completed
   payment_intent.succeeded
   payment_intent.payment_failed
   charge.refunded
   customer.subscription.created
   customer.subscription.updated
   customer.subscription.deleted
   invoice.payment_succeeded
   invoice.payment_failed
   account.updated
   payout.paid
   payout.failed
   ```

   Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

3. **Enable Connect** in your Stripe account. Configure branding and
   onboarding flow under Settings → Connect.

4. **Seed `RevenueSplitRule`** rows for each tenant. Without overrides
   the platform default (15% platform, 65% trainer, 15% lead trainer,
   5% residue) applies.

5. **Deploy the worker** as a separate process. Use 1 replica per cluster
   or a leader election (e.g., Redis lock, k8s Lease) if you scale out.

## Sample worker manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: famm-payments-worker
spec:
  replicas: 1
  strategy: { type: Recreate }
  selector:
    matchLabels: { app: famm-payments-worker }
  template:
    metadata:
      labels: { app: famm-payments-worker }
    spec:
      containers:
        - name: worker
          image: famm/api:latest
          command: ["node", "dist/workers/payments-worker.js"]
          envFrom:
            - secretRef: { name: famm-secrets }
          resources:
            requests: { cpu: 100m, memory: 256Mi }
            limits: { cpu: 500m, memory: 512Mi }
```

## Observability

- Surface `StripeWebhookEvent.failedAt` and `errorMessage` on a dashboard.
- Alert on `LedgerImbalanceError` (caught by `reconcileTenant`).
- Alert on payout `status = FAILED`.
- Track retry success rate (`PaymentRetryAttempt.status = SUCCEEDED` /
  total) to tune the schedule.

## Testing

- Unit tests: `npm run -w @famm/payments test`
- Stripe local CLI:

  ```bash
  stripe listen --forward-to localhost:4000/api/webhooks/stripe
  stripe trigger payment_intent.succeeded
  stripe trigger payment_intent.payment_failed
  stripe trigger charge.refunded
  ```

- Connect test mode: use test bank `000123456789` for Express onboarding
  and `4000000000000077` for charges that succeed but get
  `application_fee` reversal.

## Security notes

- Webhook signature verification is enforced; do not bypass even in
  development.
- All Stripe API calls use `maxNetworkRetries: 3` and pass idempotency
  keys for any non-GET operation that mutates state.
- Connected account IDs are stored, never customer card numbers — Stripe
  Elements / Checkout handle PCI scope.
- Stripe webhook payloads are kept in `StripeWebhookEvent` and may
  contain PII — apply your data retention policy.
