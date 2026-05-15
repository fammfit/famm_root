import { prisma } from "./db";
import { redis } from "./redis";
import type { TenantContext } from "@famm/shared";

const TENANT_CACHE_TTL = 300;

export async function getTenantBySlug(
  slug: string
): Promise<TenantContext | null> {
  const cacheKey = `tenant:slug:${slug}`;

  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) return JSON.parse(cached) as TenantContext;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: { settings: true },
  });

  if (!tenant) return null;

  const ctx: TenantContext = {
    tenantId: tenant.id,
    slug: tenant.slug,
    plan: tenant.plan,
    timezone: tenant.settings?.timezone ?? "UTC",
    currency: tenant.settings?.currency ?? "USD",
  };

  await redis
    .set(cacheKey, JSON.stringify(ctx), "EX", TENANT_CACHE_TTL)
    .catch(() => null);

  return ctx;
}

export async function getTenantById(
  tenantId: string
): Promise<TenantContext | null> {
  const cacheKey = `tenant:id:${tenantId}`;

  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) return JSON.parse(cached) as TenantContext;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { settings: true },
  });

  if (!tenant) return null;

  const ctx: TenantContext = {
    tenantId: tenant.id,
    slug: tenant.slug,
    plan: tenant.plan,
    timezone: tenant.settings?.timezone ?? "UTC",
    currency: tenant.settings?.currency ?? "USD",
  };

  await redis
    .set(cacheKey, JSON.stringify(ctx), "EX", TENANT_CACHE_TTL)
    .catch(() => null);

  return ctx;
}

export function invalidateTenantCache(
  tenantId: string,
  slug: string
): Promise<void> {
  return redis
    .del(`tenant:id:${tenantId}`, `tenant:slug:${slug}`)
    .then(() => undefined)
    .catch(() => undefined);
}
