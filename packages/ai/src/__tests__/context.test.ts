import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@famm/db", () => {
  const findUnique = vi.fn();
  const findMany = vi.fn();
  return {
    prisma: {
      user: { findUnique },
      aiMemory: { findMany },
      booking: { findMany },
      $queryRawUnsafe: vi.fn(),
    },
    __mocks: { findUnique, findMany },
  };
});

vi.mock("../embeddings", () => ({
  embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  embedBatch: vi.fn(),
}));

import { formatContextBlock, loadUserContext } from "../context";
import * as dbMod from "@famm/db";

const dbMocks = (
  dbMod as unknown as { __mocks: Record<string, ReturnType<typeof vi.fn>> }
).__mocks;
const prisma = (dbMod as unknown as { prisma: { aiMemory: any; booking: any; user: any } }).prisma;

const actor = { tenantId: "t1", userId: "u1", timezone: "UTC", currency: "USD" };

beforeEach(() => {
  Object.values(dbMocks).forEach((fn) => fn.mockReset());
});

describe("loadUserContext", () => {
  it("scopes memory and booking queries to the actor's tenant and user", async () => {
    prisma.user.findUnique.mockResolvedValue({
      firstName: "Alice",
      lastName: "Smith",
      timezone: "UTC",
    });
    prisma.aiMemory.findMany.mockResolvedValue([
      { content: "prefers evenings", memoryType: "preference", importance: 0.8 },
    ]);
    prisma.booking.findMany.mockResolvedValue([]);

    await loadUserContext(actor);

    expect(prisma.aiMemory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: "t1", userId: "u1" }),
      })
    );
    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: "t1", clientId: "u1" }),
      })
    );
  });
});

describe("formatContextBlock", () => {
  it("includes memories, bookings, and the user's name", () => {
    const block = formatContextBlock({
      profile: { name: "Alice Smith", timezone: "UTC" },
      memories: [{ content: "loves yoga", memoryType: "preference", importance: 1 }],
      recentBookings: [
        {
          id: "b1",
          serviceName: "Yoga 1:1",
          trainerName: "Maya Coach",
          startAt: "2026-05-20T10:00:00Z",
          status: "CONFIRMED",
        },
      ],
    });
    expect(block).toContain("Alice Smith");
    expect(block).toContain("loves yoga");
    expect(block).toContain("Yoga 1:1");
    expect(block).toContain("Maya Coach");
    expect(block).toContain("b1");
  });

  it("handles empty context gracefully", () => {
    const block = formatContextBlock({
      profile: { name: "there", timezone: "UTC" },
      memories: [],
      recentBookings: [],
    });
    expect(block).toBe("User: there (timezone: UTC).");
  });
});
