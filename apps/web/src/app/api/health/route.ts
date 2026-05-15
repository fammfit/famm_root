import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";

export async function GET() {
  const checks = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    redis.ping(),
  ]);

  const db = checks[0]?.status === "fulfilled";
  const cache = checks[1]?.status === "fulfilled";
  const healthy = db && cache;

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      version: process.env["npm_package_version"] ?? "0.0.1",
      timestamp: new Date().toISOString(),
      checks: {
        database: db ? "ok" : "error",
        cache: cache ? "ok" : "error",
      },
    },
    { status: healthy ? 200 : 503 }
  );
}
