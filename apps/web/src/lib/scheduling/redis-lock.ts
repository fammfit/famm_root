/**
 * Distributed locking using Redis SET NX PX.
 *
 * Single-node Redlock-style: sufficient for this architecture since we run
 * a single Redis primary.  For multi-node deployments, replace with the
 * official `redlock` package.
 *
 * Release uses a Lua script for atomic check-and-delete, preventing a
 * process from releasing a lock it no longer owns (e.g. after TTL expiry).
 */
import { redis } from "@/lib/redis";
import { randomUUID } from "crypto";

const RELEASE_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

export class RedisLock {
  private readonly keyPrefix: string;

  constructor(keyPrefix = "lock") {
    this.keyPrefix = keyPrefix;
  }

  private key(resource: string): string {
    return `${this.keyPrefix}:${resource}`;
  }

  /**
   * Try to acquire the lock.
   * @returns The lock token (needed to release) or null if lock is held.
   */
  async acquire(resource: string, ttlMs: number): Promise<string | null> {
    const token = randomUUID();
    const result = await redis.set(this.key(resource), token, "NX", "PX", ttlMs);
    return result === "OK" ? token : null;
  }

  /**
   * Release a lock.  No-op if the token doesn't match (lock expired / taken).
   */
  async release(resource: string, token: string): Promise<void> {
    await redis.eval(RELEASE_SCRIPT, 1, this.key(resource), token);
  }

  /**
   * Extend a lock's TTL if the token still matches.
   * @returns true if the lock was extended, false if it expired or was taken.
   */
  async extend(resource: string, token: string, ttlMs: number): Promise<boolean> {
    const current = await redis.get(this.key(resource));
    if (current !== token) return false;
    await redis.pexpire(this.key(resource), ttlMs);
    return true;
  }

  /**
   * Execute `fn` while holding the lock.  Retries with exponential backoff.
   *
   * @throws LOCK_ACQUISITION_FAILED if all retries are exhausted.
   */
  async withLock<T>(
    resource: string,
    fn: () => Promise<T>,
    options: {
      ttlMs?: number;
      retries?: number;
      retryBaseMs?: number;
    } = {}
  ): Promise<T> {
    const { ttlMs = 5_000, retries = 5, retryBaseMs = 50 } = options;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const token = await this.acquire(resource, ttlMs);
      if (token) {
        try {
          return await fn();
        } finally {
          await this.release(resource, token);
        }
      }
      if (attempt < retries) {
        const jitter = Math.random() * retryBaseMs;
        await sleep(retryBaseMs * 2 ** attempt + jitter);
      }
    }
    throw Object.assign(new Error("Lock acquisition failed"), {
      code: "LOCK_ACQUISITION_FAILED",
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Shared singleton — one lock client for the whole app. */
export const schedulingLock = new RedisLock("sched");
