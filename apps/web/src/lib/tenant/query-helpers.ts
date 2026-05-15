import { prisma } from "@/lib/db";
import type { Prisma } from "@famm/db";

// Wraps any Prisma findMany/findFirst with automatic tenantId injection.
// Use these instead of raw prisma calls in route handlers.

export function tenantWhere<T extends { tenantId?: string }>(
  tenantId: string,
  extra?: T
): T & { tenantId: string } {
  return { ...extra, tenantId } as T & { tenantId: string };
}

// Pre-built query helpers for common patterns

export async function getMembershipWithPermissions(
  userId: string,
  tenantId: string
) {
  return prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: {
      role: true,
      permissions: true,
      joinedAt: true,
    },
  });
}

export async function assertMembership(
  userId: string,
  tenantId: string
): Promise<{ role: string; permissions: string[] }> {
  const membership = await getMembershipWithPermissions(userId, tenantId);
  if (!membership) {
    throw Object.assign(new Error("Not a member of this tenant"), {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
  return membership;
}

export async function getTenantMembers(
  tenantId: string,
  options: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
  } = {}
) {
  const { page = 1, limit = 20, role, search } = options;
  const skip = (page - 1) * limit;

  const where: Prisma.TenantMembershipWhereInput = {
    tenantId,
    ...(role ? { role: role as never } : {}),
    ...(search
      ? {
          user: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const [members, total] = await prisma.$transaction([
    prisma.tenantMembership.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            status: true,
            phone: true,
            createdAt: true,
          },
        },
      },
      orderBy: { joinedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.tenantMembership.count({ where }),
  ]);

  return {
    members,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

export async function getAuditLogs(
  tenantId: string,
  options: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    resource?: string;
    from?: Date;
    to?: Date;
  } = {}
) {
  const { page = 1, limit = 50, userId, action, resource, from, to } = options;
  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {
    tenantId,
    ...(userId ? { userId } : {}),
    ...(action ? { action: { contains: action } } : {}),
    ...(resource ? { resource } : {}),
    ...(from || to
      ? {
          occurredAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}
