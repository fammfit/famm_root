import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const ledgerAccount = {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  };
  const ledgerEntry = {
    create: vi.fn(),
    aggregate: vi.fn(),
  };
  const $transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({ ledgerAccount, ledgerEntry })
  );
  return { ledgerAccount, ledgerEntry, $transaction };
});

vi.mock("@famm/db", () => ({
  prisma: {
    ledgerAccount: mocks.ledgerAccount,
    ledgerEntry: mocks.ledgerEntry,
    $transaction: mocks.$transaction,
  },
}));

import { LedgerImbalanceError } from "../errors";
import { postTransaction, recordPaymentSucceeded } from "../ledger";

describe("postTransaction", () => {
  beforeEach(() => {
    mocks.ledgerAccount.findUnique.mockReset();
    mocks.ledgerAccount.create.mockReset();
    mocks.ledgerAccount.update.mockReset();
    mocks.ledgerEntry.create.mockReset();
    mocks.$transaction.mockClear();
  });

  it("rejects imbalanced transactions", async () => {
    await expect(
      postTransaction({
        tenantId: "t1",
        transactionId: "tx_1",
        currency: "USD",
        lines: [
          { accountType: "CASH", entryType: "DEBIT", amount: 1000 },
          { accountType: "PLATFORM_REVENUE", entryType: "CREDIT", amount: 500 },
        ],
      })
    ).rejects.toThrow(LedgerImbalanceError);
  });

  it("noops on empty transactions", async () => {
    await postTransaction({
      tenantId: "t1",
      transactionId: "tx_empty",
      currency: "USD",
      lines: [],
    });
    expect(mocks.$transaction).not.toHaveBeenCalled();
  });

  it("writes entries and updates balances for balanced transactions", async () => {
    mocks.ledgerAccount.findUnique.mockResolvedValue(null);
    mocks.ledgerAccount.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ ...data, id: `acc_${String(data["type"])}` })
    );
    mocks.ledgerEntry.create.mockResolvedValue({});
    mocks.ledgerAccount.update.mockResolvedValue({});

    await postTransaction({
      tenantId: "t1",
      transactionId: "tx_2",
      currency: "USD",
      paymentId: "pay_1",
      lines: [
        { accountType: "CASH", entryType: "DEBIT", amount: 1000 },
        { accountType: "PLATFORM_REVENUE", entryType: "CREDIT", amount: 1000 },
      ],
    });

    expect(mocks.ledgerEntry.create).toHaveBeenCalledTimes(2);
    expect(mocks.ledgerAccount.update).toHaveBeenCalledTimes(2);
  });
});

describe("recordPaymentSucceeded", () => {
  beforeEach(() => {
    mocks.ledgerAccount.findUnique.mockReset();
    mocks.ledgerAccount.create.mockReset();
    mocks.ledgerAccount.update.mockReset();
    mocks.ledgerEntry.create.mockReset();
  });

  it("produces a balanced ledger transaction", async () => {
    mocks.ledgerAccount.findUnique.mockResolvedValue(null);
    mocks.ledgerAccount.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        ...data,
        id: `acc_${String(data["type"])}_${String(data["ownerId"] ?? "")}`,
      })
    );
    mocks.ledgerEntry.create.mockResolvedValue({});
    mocks.ledgerAccount.update.mockResolvedValue({});

    await recordPaymentSucceeded({
      tenantId: "t1",
      paymentId: "pay_1",
      currency: "USD",
      grossAmount: 10000,
      stripeFeeAmount: 320,
      allocations: [
        { role: "PLATFORM", beneficiaryId: null, amount: 1500 },
        { role: "TRAINER", beneficiaryId: "trainer_1", amount: 6680 },
        { role: "LEAD_TRAINER", beneficiaryId: "lead_1", amount: 1500 },
      ],
    });

    // 1 cash debit + 1 stripe fee credit + 3 payable/revenue credits = 5 entries
    expect(mocks.ledgerEntry.create).toHaveBeenCalledTimes(5);
  });
});
