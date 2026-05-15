import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/auth/tokens";
import bcrypt from "bcryptjs";
import type { UserRole } from "@famm/db";

let _counter = 0;
const uid = () => `test-${Date.now()}-${++_counter}`;

export async function createTestTenant(overrides: { name?: string; slug?: string } = {}) {
  const id = uid();
  const tenant = await prisma.tenant.create({
    data: {
      id,
      name: overrides.name ?? `Test Tenant ${id}`,
      slug: overrides.slug ?? `test-tenant-${id}`,
      plan: "FREE",
    },
  });
  await prisma.tenantSettings.create({
    data: {
      tenantId: tenant.id,
      timezone: "UTC",
      currency: "USD",
      locale: "en-US",
    },
  });
  return tenant;
}

export async function createTestUser(
  _tenantId: string,
  overrides: { email?: string; role?: UserRole; name?: string } = {}
) {
  const id = uid();
  const nameParts = (overrides.name ?? `Test User`).split(" ");
  const firstName = nameParts[0] ?? "Test";
  const lastName = nameParts.slice(1).join(" ") || id;
  return prisma.user.create({
    data: {
      id,
      email: overrides.email ?? `user-${id}@test.example`,
      firstName,
      lastName,
    },
  });
}

export async function createTestMembership(userId: string, tenantId: string, role: UserRole = "CLIENT") {
  return prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    update: { role },
    create: { userId, tenantId, role },
  });
}

export async function createTestSession(
  userId: string,
  tenantId: string | null,
  email = "test@example.com",
  role: UserRole = "CLIENT"
) {
  const { createSession } = await import("@/lib/auth/session");
  const { generateSecureToken, hashToken } = await import("@/lib/auth/tokens");
  const refreshTokenHash = hashToken(generateSecureToken());
  return createSession({
    userId,
    tenantId,
    email,
    role,
    authMethod: "MAGIC_LINK",
    refreshTokenHash,
    extraPermissions: [],
  });
}

export async function createTestMagicLink(email: string, tenantId: string) {
  const { generateSecureToken, hashToken } = await import("@/lib/auth/tokens");
  const token = generateSecureToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await prisma.magicLinkToken.create({
    data: { email, tenantId, tokenHash, expiresAt },
  });
  return token;
}
