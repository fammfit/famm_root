import { Redis, type RedisOptions } from "ioredis";

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

function buildRedis(): Redis {
  const url = process.env["REDIS_URL"];
  if (!url) {
    if (process.env["NODE_ENV"] === "production") {
      throw new Error("REDIS_URL must be set in production");
    }
    return new Redis("redis://localhost:6379", {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
  }
  // Refuse to talk to Redis over plaintext in production unless the operator
  // explicitly opts out (e.g. private VPC where TLS termination is upstream).
  const isTls = url.startsWith("rediss://");
  if (
    process.env["NODE_ENV"] === "production" &&
    !isTls &&
    process.env["REDIS_ALLOW_PLAINTEXT"] !== "1"
  ) {
    throw new Error(
      "Production Redis URL must use rediss:// (TLS). Set REDIS_ALLOW_PLAINTEXT=1 only on a trusted private network."
    );
  }
  const opts: RedisOptions = {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  };
  if (isTls) opts.tls = {};
  return new Redis(url, opts);
}

export const redis = globalForRedis.redis ?? buildRedis();

if (process.env["NODE_ENV"] !== "production") {
  globalForRedis.redis = redis;
}
