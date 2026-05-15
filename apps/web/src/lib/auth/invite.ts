import { prisma } from "@/lib/db";
import { generateSecureToken, hashToken } from "./tokens";
import type { UserRole } from "@famm/types";
import { INVITE_TTL_DAYS } from "@famm/auth";
import { canAssignRole } from "@famm/auth";

export interface CreateInviteParams {
  tenantId: string;
  email: string;
  role: UserRole;
  invitedByUserId: string;
  invitedByRole: UserRole;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface InviteResult {
  inviteId: string;
  token: string; // Raw token for email link
  expiresAt: Date;
}

export async function createInvite(
  params: CreateInviteParams
): Promise<InviteResult> {
  // Prevent privilege escalation — can only invite roles below your own
  if (!canAssignRole(params.invitedByRole, params.role)) {
    throw new Error("INSUFFICIENT_PERMISSION_FOR_ROLE");
  }

  // Check tenant exists and is active
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.tenantId },
  });
  if (!tenant) throw new Error("TENANT_NOT_FOUND");
  if (tenant.status === "SUSPENDED") throw new Error("TENANT_SUSPENDED");

  // Check if user is already a member
  const existingUser = await prisma.user.findUnique({
    where: { email: params.email.toLowerCase() },
  });
  if (existingUser) {
    const membership = await prisma.tenantMembership.findUnique({
      where: {
        tenantId_userId: { tenantId: params.tenantId, userId: existingUser.id },
      },
    });
    if (membership) throw new Error("ALREADY_A_MEMBER");
  }

  // Revoke any existing pending invite for same email+tenant
  await prisma.inviteToken.updateMany({
    where: {
      tenantId: params.tenantId,
      email: params.email.toLowerCase(),
      acceptedAt: null,
      revokedAt: null,
    },
    data: { revokedAt: new Date(), revokedBy: params.invitedByUserId },
  });

  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  const invite = await prisma.inviteToken.create({
    data: {
      tenantId: params.tenantId,
      email: params.email.toLowerCase(),
      role: params.role,
      tokenHash,
      invitedBy: params.invitedByUserId,
      message: params.message,
      metadata: params.metadata ?? {},
      expiresAt,
    },
  });

  return { inviteId: invite.id, token: rawToken, expiresAt };
}

export async function getInviteByToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);

  const invite = await prisma.inviteToken.findUnique({
    where: { tokenHash },
    include: {
      tenant: { select: { id: true, name: true, slug: true } },
      inviter: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  if (!invite) throw new Error("INVALID_INVITE");
  if (invite.revokedAt) throw new Error("INVITE_REVOKED");
  if (invite.acceptedAt) throw new Error("INVITE_ALREADY_ACCEPTED");
  if (invite.expiresAt < new Date()) throw new Error("INVITE_EXPIRED");

  return invite;
}

export interface AcceptInviteParams {
  rawToken: string;
  userId: string;
  userEmail: string;
}

export async function acceptInvite({
  rawToken,
  userId,
  userEmail,
}: AcceptInviteParams): Promise<{ tenantId: string; role: UserRole }> {
  const tokenHash = hashToken(rawToken);

  const invite = await prisma.inviteToken.findUnique({
    where: { tokenHash },
  });

  if (!invite) throw new Error("INVALID_INVITE");
  if (invite.revokedAt) throw new Error("INVITE_REVOKED");
  if (invite.acceptedAt) throw new Error("INVITE_ALREADY_ACCEPTED");
  if (invite.expiresAt < new Date()) throw new Error("INVITE_EXPIRED");
  if (invite.email !== userEmail.toLowerCase()) throw new Error("EMAIL_MISMATCH");

  const { tenantId, role } = await prisma.$transaction(async (tx) => {
    // Mark invite accepted
    await tx.inviteToken.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    // Create or update membership
    const membership = await tx.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId: invite.tenantId, userId } },
      create: {
        tenantId: invite.tenantId,
        userId,
        role: invite.role,
        invitedBy: invite.invitedBy,
        invitedAt: invite.createdAt,
      },
      update: { role: invite.role },
    });

    return { tenantId: membership.tenantId, role: membership.role };
  });

  return { tenantId, role };
}

export async function revokeInvite(
  inviteId: string,
  revokedBy: string
): Promise<void> {
  await prisma.inviteToken.update({
    where: { id: inviteId, acceptedAt: null, revokedAt: null },
    data: { revokedAt: new Date(), revokedBy },
  });
}

export function buildInviteUrl(
  baseUrl: string,
  token: string
): string {
  return `${baseUrl}/invite/${token}`;
}
