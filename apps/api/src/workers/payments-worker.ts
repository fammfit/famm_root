/**
 * Background worker for payment-related periodic jobs.
 *
 * Run as a separate process from the API:
 *   tsx apps/api/src/workers/payments-worker.ts
 *
 * In Kubernetes, deploy as a `Deployment` with replicas=1 (or use a leader
 * lock if you scale out) so that scheduled jobs don't double-run.
 */
import { reconcileTenant, runEnterprisePayoutBatch, runRetryWorker } from "@famm/payments";
import { prisma } from "@famm/db";

const RETRY_INTERVAL_MS = parseInt(process.env["PAYMENTS_RETRY_INTERVAL_MS"] ?? "60000");
const PAYOUT_INTERVAL_MS = parseInt(
  process.env["PAYMENTS_PAYOUT_INTERVAL_MS"] ?? `${60 * 60 * 1000}`
);
const RECONCILE_INTERVAL_MS = parseInt(
  process.env["PAYMENTS_RECONCILE_INTERVAL_MS"] ?? `${24 * 60 * 60 * 1000}`
);

async function tickRetries() {
  try {
    const result = await runRetryWorker();
    if (result.processed > 0) {
      console.warn("[payments-worker] retry batch", result);
    }
  } catch (err) {
    console.error("[payments-worker] retry batch failed", err);
  }
}

async function tickPayouts() {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    });
    for (const t of tenants) {
      const report = await runEnterprisePayoutBatch({ tenantId: t.id });
      if (report.total > 0) {
        console.warn(`[payments-worker] payouts ${t.id}`, {
          total: report.total,
          count: report.payouts.length,
        });
      }
    }
  } catch (err) {
    console.error("[payments-worker] payout batch failed", err);
  }
}

async function tickReconcile() {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    });
    for (const t of tenants) {
      const r = await reconcileTenant(t.id);
      if (!r.balanced || r.drift.length > 0) {
        console.error(`[payments-worker] LEDGER DRIFT for tenant ${t.id}`, r.drift);
      }
    }
  } catch (err) {
    console.error("[payments-worker] reconcile failed", err);
  }
}

function startLoop(name: string, interval: number, fn: () => Promise<void>) {
  console.warn(`[payments-worker] starting ${name} loop every ${interval}ms`);
  const run = async () => {
    await fn();
    setTimeout(run, interval).unref();
  };
  void run();
}

if (require.main === module) {
  startLoop("retry", RETRY_INTERVAL_MS, tickRetries);
  startLoop("payouts", PAYOUT_INTERVAL_MS, tickPayouts);
  startLoop("reconcile", RECONCILE_INTERVAL_MS, tickReconcile);
}
