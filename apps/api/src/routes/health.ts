import { Hono } from "hono";
import { prisma } from "@famm/db";
import { getRedis } from "../lib/redis";

const health = new Hono();

health.get("/", async (c) => {
  const checks = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    getRedis().ping(),
  ]);

  const db = checks[0]?.status === "fulfilled";
  const cache = checks[1]?.status === "fulfilled";
  const healthy = db && cache;

  return c.json(
    {
      status: healthy ? "healthy" : "degraded",
      version: process.env["npm_package_version"] ?? "0.0.1",
      timestamp: new Date().toISOString(),
      checks: {
        database: db ? "ok" : "error",
        cache: cache ? "ok" : "error",
      },
    },
    healthy ? 200 : 503
  );
});

export default health;
