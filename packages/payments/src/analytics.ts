import { prisma, type Prisma } from "@famm/db";

export interface RevenueRange {
  tenantId: string;
  start: Date;
  end: Date;
  currency?: string;
}

export interface RevenueSummary {
  tenantId: string;
  start: Date;
  end: Date;
  currency: string;
  grossRevenue: number;
  refundedRevenue: number;
  netRevenue: number;
  platformRevenue: number;
  trainerEarnings: number;
  leadTrainerEarnings: number;
  paymentCount: number;
  refundCount: number;
  averageOrderValue: number;
  subscriptionMRR: number;
}

/**
 * Per-period revenue summary across the platform/tenant. Amounts are in
 * minor units (cents). Subscription MRR is the sum of normalized monthly
 * recurring price totals across ACTIVE subscriptions.
 */
export async function tenantRevenueSummary(range: RevenueRange): Promise<RevenueSummary> {
  const currency = range.currency ?? "USD";
  const where: Prisma.PaymentWhereInput = {
    tenantId: range.tenantId,
    currency,
    status: { in: ["SUCCEEDED", "REFUNDED", "PARTIALLY_REFUNDED"] },
    succeededAt: { gte: range.start, lte: range.end },
  };

  const [paymentAgg, refundAgg, commissionAgg, paymentCount, refundCount] = await Promise.all([
    prisma.payment.aggregate({ where, _sum: { amount: true, amountRefunded: true } }),
    prisma.refund.aggregate({
      where: {
        tenantId: range.tenantId,
        currency,
        status: "SUCCEEDED",
        createdAt: { gte: range.start, lte: range.end },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.commission.groupBy({
      by: ["role"],
      where: {
        tenantId: range.tenantId,
        currency,
        createdAt: { gte: range.start, lte: range.end },
      },
      _sum: { amount: true },
    }),
    prisma.payment.count({ where }),
    prisma.refund.count({
      where: {
        tenantId: range.tenantId,
        currency,
        status: "SUCCEEDED",
        createdAt: { gte: range.start, lte: range.end },
      },
    }),
  ]);

  const gross = paymentAgg._sum.amount ?? 0;
  const refunded = refundAgg._sum.amount ?? 0;
  const platform = commissionAgg.find((g) => g.role === "PLATFORM")?._sum.amount ?? 0;
  const trainer = commissionAgg.find((g) => g.role === "TRAINER")?._sum.amount ?? 0;
  const lead = commissionAgg.find((g) => g.role === "LEAD_TRAINER")?._sum.amount ?? 0;

  const mrr = await monthlyRecurringRevenue(range.tenantId, currency);

  return {
    tenantId: range.tenantId,
    start: range.start,
    end: range.end,
    currency,
    grossRevenue: gross,
    refundedRevenue: refunded,
    netRevenue: gross - refunded,
    platformRevenue: platform,
    trainerEarnings: trainer,
    leadTrainerEarnings: lead,
    paymentCount,
    refundCount,
    averageOrderValue: paymentCount > 0 ? Math.round(gross / paymentCount) : 0,
    subscriptionMRR: mrr,
  };
}

/**
 * Normalize each active subscription item to a monthly amount and sum.
 */
export async function monthlyRecurringRevenue(tenantId: string, currency = "USD"): Promise<number> {
  const subs = await prisma.subscription.findMany({
    where: { tenantId, status: { in: ["ACTIVE", "TRIALING"] } },
    include: { items: { include: { price: true } } },
  });
  let mrr = 0;
  for (const sub of subs) {
    for (const item of sub.items) {
      if (item.price.currency !== currency) continue;
      if (item.price.type !== "RECURRING") continue;
      const unit = item.price.unitAmount ?? 0;
      const qty = item.quantity;
      const monthly = normalizeToMonthly(
        unit * qty,
        item.price.interval ?? "MONTH",
        item.price.intervalCount ?? 1
      );
      mrr += monthly;
    }
  }
  return mrr;
}

function normalizeToMonthly(
  amount: number,
  interval: "DAY" | "WEEK" | "MONTH" | "YEAR",
  count: number
): number {
  switch (interval) {
    case "DAY":
      return Math.round((amount * 30) / count);
    case "WEEK":
      return Math.round((amount * 4.345) / count);
    case "MONTH":
      return Math.round(amount / count);
    case "YEAR":
      return Math.round(amount / (12 * count));
  }
}

/**
 * Top earners (trainers) over a date range.
 */
export async function topTrainerEarners(
  tenantId: string,
  range: { start: Date; end: Date; limit?: number; currency?: string }
): Promise<Array<{ trainerProfileId: string; earnings: number }>> {
  const grouped = await prisma.commission.groupBy({
    by: ["trainerProfileId"],
    where: {
      tenantId,
      currency: range.currency ?? "USD",
      role: { in: ["TRAINER", "LEAD_TRAINER"] },
      createdAt: { gte: range.start, lte: range.end },
      trainerProfileId: { not: null },
    },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: range.limit ?? 10,
  });
  return grouped
    .filter((g) => g.trainerProfileId)
    .map((g) => ({ trainerProfileId: g.trainerProfileId!, earnings: g._sum.amount ?? 0 }));
}
