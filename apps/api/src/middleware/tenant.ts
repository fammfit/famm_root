import type { MiddlewareHandler } from "hono";
import type { JwtPayload } from "@famm/types";
import { prisma } from "@famm/db";
import { getRedis } from "../lib/redis";

const CACHE_TTL = 300;

export const tenantMiddleware: MiddlewareHandler = async (c, next) => {
  const user = c.get("user") as JwtPayload | undefined;

  if (!user?.tenantId) {
    return c.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "No tenant context" } },
      401
    );
  }

  const redis = getRedis();
  const cacheKey = `tenant:id:${user.tenantId}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      c.set("tenant", JSON.parse(cached));
      return next();
    }
  } catch {
    // Cache miss is fine
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    include: { settings: true },
  });

  if (!tenant) {
    return c.json(
      { success: false, error: { code: "TENANT_NOT_FOUND", message: "Tenant not found" } },
      404
    );
  }

  if (tenant.status === "SUSPENDED") {
    return c.json(
      { success: false, error: { code: "TENANT_SUSPENDED", message: "Tenant suspended" } },
      403
    );
  }

  const ctx = {
    tenantId: tenant.id,
    slug: tenant.slug,
    plan: tenant.plan,
    timezone: tenant.settings?.timezone ?? "UTC",
    currency: tenant.settings?.currency ?? "USD",
  };

  c.set("tenant", ctx);

  try {
    await redis.set(cacheKey, JSON.stringify(ctx), "EX", CACHE_TTL);
  } catch {
    // Non-fatal
  }

  await next();
};
