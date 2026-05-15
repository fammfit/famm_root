import { Redis } from "ioredis";

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(process.env["REDIS_URL"] ?? "redis://localhost:6379", {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    _redis.on("error", (err: Error) => {
      console.error("[redis] Connection error:", err.message);
    });
  }
  return _redis;
}
