import { describe, expect, it, beforeEach } from "vitest";
import Redis from "ioredis-mock";
import {
  appendTurn,
  loadOrCreate,
  loadSession,
  saveSession,
  setSessionRedis,
  SESSION_LIMITS,
} from "../session";

beforeEach(() => {
  const r = new Redis();
  setSessionRedis(r as unknown as import("ioredis").Redis);
});

describe("session store", () => {
  const args = {
    tenantId: "t1",
    userId: "u1",
    channel: "web" as const,
    key: "conv-1",
    conversationId: "conv-1",
  };

  it("creates a new session when none exists", async () => {
    const s = await loadOrCreate(args);
    expect(s.tenantId).toBe("t1");
    expect(s.turns).toHaveLength(0);
  });

  it("persists and reloads a session", async () => {
    let s = await loadOrCreate(args);
    s = appendTurn(s, { role: "user", content: "hi", createdAt: new Date().toISOString() });
    await saveSession(s);

    const loaded = await loadSession({
      tenantId: "t1",
      userId: "u1",
      channel: "web",
      key: "conv-1",
    });
    expect(loaded?.turns).toHaveLength(1);
    expect(loaded?.turns[0]?.content).toBe("hi");
  });

  it("refuses to return a session that belongs to a different user", async () => {
    let s = await loadOrCreate(args);
    s = appendTurn(s, { role: "user", content: "secret", createdAt: new Date().toISOString() });
    await saveSession(s);

    // Same conversation key, different userId → must not leak.
    const leak = await loadSession({
      tenantId: "t1",
      userId: "u2",
      channel: "web",
      key: "conv-1",
    });
    expect(leak).toBeNull();
  });

  it("trims the turn window once the cap is hit", async () => {
    let s = await loadOrCreate(args);
    for (let i = 0; i < SESSION_LIMITS.maxTurns + 5; i++) {
      s = appendTurn(s, {
        role: "user",
        content: `msg ${i}`,
        createdAt: new Date().toISOString(),
      });
    }
    expect(s.turns).toHaveLength(SESSION_LIMITS.maxTurns);
    expect(s.turns[0]?.content).toBe("msg 5");
  });
});
