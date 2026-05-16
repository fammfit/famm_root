import {
  prisma,
  type LedgerAccountType,
  type LedgerEntryType,
  type Prisma,
  type PrismaClient,
} from "@famm/db";
import { LedgerImbalanceError } from "./errors";
import type { Cents } from "./money";

type Tx = Prisma.TransactionClient | PrismaClient;

export interface LedgerLine {
  accountType: LedgerAccountType;
  ownerType?: "trainer" | "tenant" | "platform" | null;
  ownerId?: string | null;
  entryType: LedgerEntryType;
  amount: Cents;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface LedgerTransactionInput {
  tenantId: string;
  transactionId: string;
  currency: string;
  paymentId?: string;
  refundId?: string;
  payoutId?: string;
  lines: LedgerLine[];
}

/**
 * Resolve (or lazily create) a ledger account. Uniqueness is enforced by
 * `(tenantId, type, ownerId, currency)` at the schema level.
 */
export async function getOrCreateAccount(
  tx: Tx,
  params: {
    tenantId: string;
    type: LedgerAccountType;
    ownerType?: string | null;
    ownerId?: string | null;
    currency: string;
    name?: string;
  }
) {
  const ownerId = params.ownerId ?? null;
  const existing = await tx.ledgerAccount.findUnique({
    where: {
      tenantId_type_ownerId_currency: {
        tenantId: params.tenantId,
        type: params.type,
        ownerId: ownerId as unknown as string, // composite key allows null in pg
        currency: params.currency,
      },
    },
  });
  if (existing) return existing;

  return tx.ledgerAccount.create({
    data: {
      tenantId: params.tenantId,
      type: params.type,
      ownerType: params.ownerType ?? null,
      ownerId: ownerId,
      currency: params.currency,
      name: params.name ?? `${params.type}${params.ownerId ? `:${params.ownerId}` : ""}`,
    },
  });
}

/**
 * Post a balanced ledger transaction. Validates debits = credits, persists
 * entries, and updates running account balances atomically.
 *
 * Sign convention: account balances are stored such that a CREDIT increases
 * the balance and a DEBIT decreases it (suitable for liability/revenue
 * accounts which dominate this system). Callers compose lines accordingly.
 */
export async function postTransaction(input: LedgerTransactionInput): Promise<void> {
  const totalDebits = input.lines
    .filter((l) => l.entryType === "DEBIT")
    .reduce((s, l) => s + BigInt(l.amount), 0n);
  const totalCredits = input.lines
    .filter((l) => l.entryType === "CREDIT")
    .reduce((s, l) => s + BigInt(l.amount), 0n);

  if (totalDebits !== totalCredits) {
    throw new LedgerImbalanceError(input.transactionId, totalDebits, totalCredits);
  }
  if (totalDebits === 0n) return;

  await prisma.$transaction(async (tx) => {
    for (const line of input.lines) {
      const account = await getOrCreateAccount(tx, {
        tenantId: input.tenantId,
        type: line.accountType,
        ownerType: line.ownerType ?? null,
        ownerId: line.ownerId ?? null,
        currency: input.currency,
      });

      const delta = line.entryType === "CREDIT" ? BigInt(line.amount) : -BigInt(line.amount);

      await tx.ledgerEntry.create({
        data: {
          tenantId: input.tenantId,
          accountId: account.id,
          entryType: line.entryType,
          amount: BigInt(line.amount),
          currency: input.currency,
          transactionId: input.transactionId,
          ...(input.paymentId ? { paymentId: input.paymentId } : {}),
          ...(input.refundId ? { refundId: input.refundId } : {}),
          ...(input.payoutId ? { payoutId: input.payoutId } : {}),
          description: line.description ?? null,
          ...(line.metadata != null ? { metadata: line.metadata as Prisma.InputJsonValue } : {}),
        },
      });

      await tx.ledgerAccount.update({
        where: { id: account.id },
        data: { balance: { increment: delta } },
      });
    }
  });
}

// ─── High-level posting helpers ──────────────────────────────────────────────

export interface PaymentPostingInput {
  tenantId: string;
  paymentId: string;
  currency: string;
  grossAmount: Cents;
  stripeFeeAmount: Cents;
  allocations: Array<{
    role: "PLATFORM" | "TENANT" | "TRAINER" | "LEAD_TRAINER";
    beneficiaryId: string | null;
    amount: Cents;
  }>;
}

export async function recordPaymentSucceeded(input: PaymentPostingInput): Promise<void> {
  const txId = `pay_${input.paymentId}`;
  const lines: LedgerLine[] = [
    // Customer paid in: debit cash for gross
    {
      accountType: "CASH",
      entryType: "DEBIT",
      amount: input.grossAmount,
      description: "Customer payment received",
    },
  ];

  if (input.stripeFeeAmount > 0) {
    lines.push({
      accountType: "STRIPE_FEE",
      entryType: "CREDIT",
      amount: input.stripeFeeAmount,
      description: "Stripe processing fee",
    });
  }

  for (const a of input.allocations) {
    if (a.amount <= 0) continue;
    switch (a.role) {
      case "PLATFORM":
        lines.push({
          accountType: "PLATFORM_REVENUE",
          entryType: "CREDIT",
          amount: a.amount,
          description: "Platform revenue",
        });
        break;
      case "TENANT":
        lines.push({
          accountType: "TENANT_PAYABLE",
          ownerType: "tenant",
          ownerId: input.tenantId,
          entryType: "CREDIT",
          amount: a.amount,
          description: "Tenant payable",
        });
        break;
      case "TRAINER":
        lines.push({
          accountType: "TRAINER_PAYABLE",
          ownerType: "trainer",
          ownerId: a.beneficiaryId,
          entryType: "CREDIT",
          amount: a.amount,
          description: "Trainer payable",
        });
        break;
      case "LEAD_TRAINER":
        lines.push({
          accountType: "LEAD_TRAINER_PAYABLE",
          ownerType: "trainer",
          ownerId: a.beneficiaryId,
          entryType: "CREDIT",
          amount: a.amount,
          description: "Lead trainer payable",
        });
        break;
    }
  }

  await postTransaction({
    tenantId: input.tenantId,
    transactionId: txId,
    currency: input.currency,
    paymentId: input.paymentId,
    lines,
  });
}

export interface RefundPostingInput {
  tenantId: string;
  paymentId: string;
  refundId: string;
  currency: string;
  refundAmount: Cents;
  reversals: Array<{
    role: "PLATFORM" | "TENANT" | "TRAINER" | "LEAD_TRAINER";
    beneficiaryId: string | null;
    /** positive minor units to reverse */
    amount: Cents;
  }>;
}

export async function recordRefund(input: RefundPostingInput): Promise<void> {
  const txId = `ref_${input.refundId}`;
  const lines: LedgerLine[] = [
    {
      accountType: "CASH",
      entryType: "CREDIT",
      amount: input.refundAmount,
      description: "Refund paid to customer",
    },
  ];
  for (const r of input.reversals) {
    if (r.amount <= 0) continue;
    switch (r.role) {
      case "PLATFORM":
        lines.push({
          accountType: "PLATFORM_REVENUE",
          entryType: "DEBIT",
          amount: r.amount,
          description: "Reverse platform revenue",
        });
        break;
      case "TENANT":
        lines.push({
          accountType: "TENANT_PAYABLE",
          ownerType: "tenant",
          ownerId: input.tenantId,
          entryType: "DEBIT",
          amount: r.amount,
        });
        break;
      case "TRAINER":
        lines.push({
          accountType: "TRAINER_PAYABLE",
          ownerType: "trainer",
          ownerId: r.beneficiaryId,
          entryType: "DEBIT",
          amount: r.amount,
        });
        break;
      case "LEAD_TRAINER":
        lines.push({
          accountType: "LEAD_TRAINER_PAYABLE",
          ownerType: "trainer",
          ownerId: r.beneficiaryId,
          entryType: "DEBIT",
          amount: r.amount,
        });
        break;
    }
  }
  await postTransaction({
    tenantId: input.tenantId,
    transactionId: txId,
    currency: input.currency,
    paymentId: input.paymentId,
    refundId: input.refundId,
    lines,
  });
}

export interface PayoutPostingInput {
  tenantId: string;
  payoutId: string;
  currency: string;
  amount: Cents;
  destinationType: "trainer" | "tenant";
  destinationId: string;
}

export async function recordPayout(input: PayoutPostingInput): Promise<void> {
  const accountType = input.destinationType === "trainer" ? "TRAINER_PAYABLE" : "TENANT_PAYABLE";
  await postTransaction({
    tenantId: input.tenantId,
    transactionId: `out_${input.payoutId}`,
    currency: input.currency,
    payoutId: input.payoutId,
    lines: [
      {
        accountType,
        ownerType: input.destinationType,
        ownerId: input.destinationId,
        entryType: "DEBIT",
        amount: input.amount,
        description: "Payout disbursed",
      },
      { accountType: "CASH", entryType: "CREDIT", amount: input.amount, description: "Cash out" },
    ],
  });
}

// ─── Reconciliation ──────────────────────────────────────────────────────────

export interface ReconciliationReport {
  tenantId: string;
  asOf: Date;
  totalDebits: bigint;
  totalCredits: bigint;
  balanced: boolean;
  accountBalances: Array<{
    accountId: string;
    type: LedgerAccountType;
    ownerId: string | null;
    storedBalance: bigint;
    computedBalance: bigint;
    drift: bigint;
  }>;
  drift: Array<{ accountId: string; drift: bigint }>;
}

/**
 * Recompute every account balance from its entries and compare to the stored
 * running balance. Any drift indicates a bug or a write that bypassed the
 * postTransaction helper.
 */
export async function reconcileTenant(tenantId: string): Promise<ReconciliationReport> {
  const accounts = await prisma.ledgerAccount.findMany({ where: { tenantId } });
  const accountBalances: ReconciliationReport["accountBalances"] = [];
  let totalDebits = 0n;
  let totalCredits = 0n;

  for (const acc of accounts) {
    const debits = await prisma.ledgerEntry.aggregate({
      where: { accountId: acc.id, entryType: "DEBIT" },
      _sum: { amount: true },
    });
    const credits = await prisma.ledgerEntry.aggregate({
      where: { accountId: acc.id, entryType: "CREDIT" },
      _sum: { amount: true },
    });
    const d = debits._sum.amount ?? 0n;
    const c = credits._sum.amount ?? 0n;
    const computed = c - d;
    totalDebits += d;
    totalCredits += c;
    accountBalances.push({
      accountId: acc.id,
      type: acc.type,
      ownerId: acc.ownerId,
      storedBalance: acc.balance,
      computedBalance: computed,
      drift: acc.balance - computed,
    });
  }

  return {
    tenantId,
    asOf: new Date(),
    totalDebits,
    totalCredits,
    balanced: totalDebits === totalCredits,
    accountBalances,
    drift: accountBalances
      .filter((a) => a.drift !== 0n)
      .map((a) => ({ accountId: a.accountId, drift: a.drift })),
  };
}
