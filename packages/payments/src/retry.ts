import { prisma } from "@famm/db";
import { getStripeClient } from "./client";
import { MAX_RETRY_ATTEMPTS, RETRY_SCHEDULE_MINUTES } from "./config";

/**
 * Schedule the next retry attempt for a failed payment, following the
 * configured backoff schedule. Returns null if max attempts reached.
 */
export async function scheduleRetry(
  paymentId: string,
  opts: { failureCode?: string; failureMessage?: string } = {}
): Promise<string | null> {
  const previous = await prisma.paymentRetryAttempt.count({ where: { paymentId } });
  if (previous >= MAX_RETRY_ATTEMPTS) {
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: "FAILED" },
    });
    return null;
  }
  const delayMinutes = RETRY_SCHEDULE_MINUTES[previous]!;
  const scheduledAt = new Date(Date.now() + delayMinutes * 60_000);
  const attempt = await prisma.paymentRetryAttempt.create({
    data: {
      paymentId,
      attemptNumber: previous + 1,
      status: "SCHEDULED",
      scheduledAt,
      failureCode: opts.failureCode ?? null,
      failureMessage: opts.failureMessage ?? null,
    },
  });
  return attempt.id;
}

/**
 * Returns due attempts whose `scheduledAt <= now` and not yet attempted.
 * Caller is expected to lock/claim each before processing.
 */
export async function dueAttempts(
  limit = 50
): Promise<Array<{ id: string; paymentId: string; attemptNumber: number }>> {
  const rows = await prisma.paymentRetryAttempt.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
    take: limit,
    orderBy: { scheduledAt: "asc" },
    select: { id: true, paymentId: true, attemptNumber: true },
  });
  return rows;
}

/**
 * Process a single retry attempt: triggers Stripe to confirm the
 * PaymentIntent with the default payment method, then records the result.
 */
export async function processAttempt(
  attemptId: string
): Promise<"succeeded" | "failed" | "abandoned"> {
  const stripe = getStripeClient();
  const attempt = await prisma.paymentRetryAttempt.update({
    where: { id: attemptId },
    data: { status: "IN_PROGRESS", attemptedAt: new Date() },
    include: { payment: true },
  });
  const payment = attempt.payment;
  if (!payment.stripePaymentIntentId) {
    await prisma.paymentRetryAttempt.update({
      where: { id: attemptId },
      data: { status: "ABANDONED", failureMessage: "No PaymentIntent" },
    });
    return "abandoned";
  }

  try {
    const intent = await stripe.paymentIntents.confirm(
      payment.stripePaymentIntentId,
      {},
      {
        idempotencyKey: `retry_${attempt.id}`,
      }
    );
    if (intent.status === "succeeded") {
      await prisma.$transaction([
        prisma.paymentRetryAttempt.update({
          where: { id: attemptId },
          data: { status: "SUCCEEDED" },
        }),
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: "SUCCEEDED", succeededAt: new Date() },
        }),
      ]);
      return "succeeded";
    }
    if (intent.status === "requires_action") {
      // Customer must complete authentication — abandon auto-retry.
      await prisma.paymentRetryAttempt.update({
        where: { id: attemptId },
        data: { status: "ABANDONED", failureMessage: "requires_action" },
      });
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "REQUIRES_ACTION" },
      });
      return "abandoned";
    }
    // Still failing — schedule next attempt.
    await prisma.paymentRetryAttempt.update({
      where: { id: attemptId },
      data: {
        status: "FAILED",
        failureCode: intent.last_payment_error?.code ?? null,
        failureMessage: intent.last_payment_error?.message ?? null,
      },
    });
    await scheduleRetry(payment.id, {
      ...(intent.last_payment_error?.code ? { failureCode: intent.last_payment_error.code } : {}),
      ...(intent.last_payment_error?.message
        ? { failureMessage: intent.last_payment_error.message }
        : {}),
    });
    return "failed";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.paymentRetryAttempt.update({
      where: { id: attemptId },
      data: { status: "FAILED", failureMessage: message },
    });
    await scheduleRetry(payment.id, { failureMessage: message });
    return "failed";
  }
}

/**
 * Drain all due retry attempts. Intended to be called from a cron worker.
 */
export async function runRetryWorker(
  opts: { batchSize?: number } = {}
): Promise<{ processed: number; succeeded: number; failed: number; abandoned: number }> {
  const attempts = await dueAttempts(opts.batchSize ?? 50);
  const counts = { processed: 0, succeeded: 0, failed: 0, abandoned: 0 };
  for (const a of attempts) {
    const result = await processAttempt(a.id);
    counts.processed++;
    counts[result]++;
  }
  return counts;
}
