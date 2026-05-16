import { Prisma } from "@famm/db";
import { prisma } from "./db";

export interface AuditParams {
  tenantId: string;
  userId?: string;
  sessionId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

// Fire-and-forget audit write — never blocks the request path
export function writeAuditLog(params: AuditParams): void {
  void prisma.auditLog
    .create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        sessionId: params.sessionId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        before: params.before ? (params.before as object) : undefined,
        after: params.after ? (params.after as object) : undefined,
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        requestId: params.requestId,
      },
    })
    .catch((err: unknown) => {
      console.error("[audit] Failed to write audit log:", err);
    });
}

// Awaitable version for cases where you need confirmation
export async function writeAuditLogAsync(params: AuditParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId,
      sessionId: params.sessionId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      before: params.before ? (params.before as object) : undefined,
      after: params.after ? (params.after as object) : undefined,
      metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      requestId: params.requestId,
    },
  });
}
