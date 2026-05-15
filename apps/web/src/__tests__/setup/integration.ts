import { beforeAll, afterAll, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";

beforeAll(async () => {
  // Verify DB and Redis connections
  await prisma.$connect();
  await redis.ping();
});

afterEach(async () => {
  // Clean up test data in reverse dependency order
  await prisma.$executeRawUnsafe(`
    DELETE FROM "AuditLog" WHERE "tenantId" LIKE 'test-%';
    DELETE FROM "InviteToken" WHERE "tenantId" LIKE 'test-%';
    DELETE FROM "MagicLinkToken" WHERE "tenantId" LIKE 'test-%';
    DELETE FROM "SmsOtp" WHERE "tenantId" LIKE 'test-%';
    DELETE FROM "Session" WHERE "tenantId" LIKE 'test-%';
    DELETE FROM "TenantMembership" WHERE "tenantId" LIKE 'test-%';
    DELETE FROM "User" WHERE "tenantId" LIKE 'test-%';
    DELETE FROM "TenantSettings" WHERE "tenantId" LIKE 'test-%';
    DELETE FROM "Tenant" WHERE id LIKE 'test-%';
  `);

  // Clean Redis test keys
  const keys = await redis.keys("*test-*");
  if (keys.length > 0) {
    await redis.del(...keys);
  }
});

afterAll(async () => {
  await prisma.$disconnect();
  await redis.quit();
});
