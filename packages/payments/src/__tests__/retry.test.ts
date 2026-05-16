import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  payment: { update: vi.fn() },
  paymentRetryAttempt: { count: vi.fn(), create: vi.fn() },
}));

vi.mock("@famm/db", () => ({
  prisma: {
    payment: mocks.payment,
    paymentRetryAttempt: mocks.paymentRetryAttempt,
  },
}));
vi.mock("../client", () => ({
  getStripeClient: () => ({ paymentIntents: { confirm: vi.fn() } }),
}));

import { MAX_RETRY_ATTEMPTS, RETRY_SCHEDULE_MINUTES } from "../config";
import { scheduleRetry } from "../retry";

describe("scheduleRetry", () => {
  beforeEach(() => {
    mocks.payment.update.mockReset();
    mocks.paymentRetryAttempt.count.mockReset();
    mocks.paymentRetryAttempt.create.mockReset();
  });

  it("schedules first attempt at first interval", async () => {
    mocks.paymentRetryAttempt.count.mockResolvedValue(0);
    mocks.paymentRetryAttempt.create.mockResolvedValue({ id: "att_1" });
    const id = await scheduleRetry("pay_1", { failureCode: "card_declined" });
    expect(id).toBe("att_1");
    const args = mocks.paymentRetryAttempt.create.mock.calls[0]![0]!.data;
    const expectedMs = Date.now() + RETRY_SCHEDULE_MINUTES[0]! * 60_000;
    expect(Math.abs(args.scheduledAt.getTime() - expectedMs)).toBeLessThan(5000);
    expect(args.attemptNumber).toBe(1);
  });

  it("returns null and marks payment FAILED after max attempts", async () => {
    mocks.paymentRetryAttempt.count.mockResolvedValue(MAX_RETRY_ATTEMPTS);
    const id = await scheduleRetry("pay_1");
    expect(id).toBeNull();
    expect(mocks.payment.update).toHaveBeenCalledWith({
      where: { id: "pay_1" },
      data: { status: "FAILED" },
    });
    expect(mocks.paymentRetryAttempt.create).not.toHaveBeenCalled();
  });
});
