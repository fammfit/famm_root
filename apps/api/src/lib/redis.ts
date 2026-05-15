import { Redis, type RedisOptions } from "ioredis";

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (_redis) return _redis;

  const url = process.env["REDIS_URL"];
  if (!url) {
    if (process.env["NODE_ENV"] === "production") {
      throw new Error("REDIS_URL must be set in production");
    }
    _redis = new Redis("redis://localhost:6379", {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });
  } else {
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
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    };
    if (isTls) opts.tls = {};
    _redis = new Redis(url, opts);
  }

  _redis.on("error", (err: Error) => {
    // Avoid emitting full stack trace; ioredis includes the URL in some
    // diagnostic strings which can leak the password segment.
    console.error("[redis] Connection error:", err.message);
  });
  return _redis;
}
