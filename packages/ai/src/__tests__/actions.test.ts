import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock @famm/db before importing the module under test so the Prisma client
// in actions.ts resolves to our spy.
vi.mock("@famm/db", () => {
  const findFirst = vi.fn();
  const findMany = vi.fn();
  const findUnique = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  return {
    prisma: {
      service: { findFirst, findUnique },
      trainerProfile: { findFirst, findMany },
      booking: { findFirst, findMany, create, update, findUnique },
    },
    __mocks: { findFirst, findMany, create, update, findUnique },
  };
});

import { executeAction, _schemas } from "../actions";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import * as dbMod from "@famm/db";

const m = (dbMod as unknown as { __mocks: Record<string, ReturnType<typeof vi.fn>> }).__mocks;

const actor = {
  tenantId: "t1",
  userId: "u1",
  timezone: "UTC",
  currency: "USD",
};

beforeEach(() => {
  Object.values(m).forEach((fn) => fn.mockReset());
});

describe("action schemas", () => {
  it("validates create_booking arguments", () => {
    expect(() =>
      _schemas.createBooking.parse({ serviceId: "s1", startAt: "not-a-date" })
    ).toThrow();
    expect(
      _schemas.createBooking.parse({ serviceId: "s1", startAt: "2026-06-01T10:00:00Z" })
    ).toMatchObject({ serviceId: "s1" });
  });

  it("rejects negative amounts in generate_payment_link", () => {
    expect(() =>
      _schemas.generatePaymentLink.parse({ description: "x", amount: -1 })
    ).toThrow();
  });
});

describe("executeAction", () => {
  it("returns a validation error for malformed arguments", async () => {
    const result = await executeAction(
      { id: "c1", name: "create_booking", arguments: { serviceId: "s1" } },
      { actor }
    );
    expect(result.isError).toBe(true);
  });

  it("refuses to reschedule another user's booking", async () => {
    m.findFirst!.mockResolvedValueOnce(null); // no booking owned by u1

    const result = await executeAction(
      {
        id: "c2",
        name: "reschedule_booking",
        arguments: { bookingId: "b1", newStartAt: "2026-06-01T10:00:00Z" },
      },
      { actor }
    );
    expect(result.isError).toBe(true);
    expect(result.content).toContain("not yours");
  });

  it("publishes a workflow event for trigger_workflow", async () => {
    const publishEvent = vi.fn().mockResolvedValue(undefined);
    const result = await executeAction(
      {
        id: "c3",
        name: "trigger_workflow",
        arguments: { workflow: "send_intake_form", payload: { foo: "bar" } },
      },
      { actor, publishEvent }
    );
    expect(result.isError).toBeFalsy();
    expect(publishEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "t1",
        userId: "u1",
        type: "WORKFLOW_SEND_INTAKE_FORM",
        payload: { foo: "bar" },
      })
    );
  });

  it("rejects unknown tools", async () => {
    const result = await executeAction(
      { id: "x", name: "delete_everything", arguments: {} },
      { actor }
    );
    expect(result.isError).toBe(true);
    expect(result.content).toContain("Unknown tool");
  });
});
