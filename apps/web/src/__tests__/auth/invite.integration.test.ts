import { describe, it, expect, beforeEach } from "vitest";
import { createInvite, getInviteByToken, acceptInvite, revokeInvite } from "@/lib/auth/invite";
import { prisma } from "@/lib/db";
import { createTestTenant, createTestUser, createTestMembership } from "../setup/factories";

describe("Invite flow", () => {
  let tenantId: string;
  let adminUserId: string;
  let inviteeEmail: string;

  beforeEach(async () => {
    const tenant = await createTestTenant();
    tenantId = tenant.id;
    const admin = await createTestUser(tenantId, { role: "TENANT_ADMIN" });
    adminUserId = admin.id;
    await createTestMembership(adminUserId, tenantId, "TENANT_ADMIN");
    inviteeEmail = `invitee-${Date.now()}@test.example`;
  });

  it("creates an invite and returns a raw token", async () => {
    const result = await createInvite({
      tenantId,
      invitedByUserId: adminUserId,
      invitedByRole: "TENANT_ADMIN",
      email: inviteeEmail,
      role: "CLIENT",
    });
    expect(typeof result.token).toBe("string");
    expect(result.token.length).toBeGreaterThan(32);
    expect(typeof result.inviteId).toBe("string");
  });

  it("prevents assigning a role equal to or higher than assigner", async () => {
    await expect(
      createInvite({
        tenantId,
        invitedByUserId: adminUserId,
        invitedByRole: "TENANT_ADMIN",
        email: inviteeEmail,
        role: "TENANT_ADMIN",
      })
    ).rejects.toThrow();
  });

  it("retrieves invite by token with tenant and inviter info", async () => {
    const { token } = await createInvite({
      tenantId,
      invitedByUserId: adminUserId,
      invitedByRole: "TENANT_ADMIN",
      email: inviteeEmail,
      role: "CLIENT",
    });

    const invite = await getInviteByToken(token);
    expect(invite.email).toBe(inviteeEmail.toLowerCase());
    expect(invite.tenant.id).toBe(tenantId);
    expect(invite.inviter.email).toBeTruthy();
  });

  it("throws for an expired invite", async () => {
    const { token } = await createInvite({
      tenantId,
      invitedByUserId: adminUserId,
      invitedByRole: "TENANT_ADMIN",
      email: inviteeEmail,
      role: "CLIENT",
    });
    await prisma.inviteToken.updateMany({
      where: { tenantId, email: inviteeEmail.toLowerCase() },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(getInviteByToken(token)).rejects.toThrow("INVITE_EXPIRED");
  });

  it("accepts an invite and creates tenant membership", async () => {
    const { token } = await createInvite({
      tenantId,
      invitedByUserId: adminUserId,
      invitedByRole: "TENANT_ADMIN",
      email: inviteeEmail,
      role: "TRAINER",
    });

    const invitee = await createTestUser(tenantId, { email: inviteeEmail, role: "TRAINER" });
    const { tenantId: resultTenantId, role } = await acceptInvite({
      rawToken: token,
      userId: invitee.id,
      userEmail: inviteeEmail,
    });

    expect(resultTenantId).toBe(tenantId);
    expect(role).toBe("TRAINER");

    const membership = await prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId: invitee.id } },
    });
    expect(membership).not.toBeNull();
    expect(membership!.role).toBe("TRAINER");

    const inviteRecord = await prisma.inviteToken.findFirst({
      where: { tenantId, email: inviteeEmail.toLowerCase() },
    });
    expect(inviteRecord!.acceptedAt).not.toBeNull();
  });

  it("rejects accepting an already-accepted invite", async () => {
    const { token } = await createInvite({
      tenantId,
      invitedByUserId: adminUserId,
      invitedByRole: "TENANT_ADMIN",
      email: inviteeEmail,
      role: "CLIENT",
    });
    const invitee = await createTestUser(tenantId, { email: inviteeEmail });
    await acceptInvite({ rawToken: token, userId: invitee.id, userEmail: inviteeEmail });
    await expect(
      acceptInvite({ rawToken: token, userId: invitee.id, userEmail: inviteeEmail })
    ).rejects.toThrow("INVITE_ALREADY_ACCEPTED");
  });

  it("revokes a pending invite", async () => {
    const { inviteId } = await createInvite({
      tenantId,
      invitedByUserId: adminUserId,
      invitedByRole: "TENANT_ADMIN",
      email: inviteeEmail,
      role: "CLIENT",
    });

    await revokeInvite(inviteId, adminUserId);

    const record = await prisma.inviteToken.findUnique({ where: { id: inviteId } });
    expect(record!.revokedAt).not.toBeNull();
    expect(record!.revokedBy).toBe(adminUserId);
  });

  it("revokes existing pending invites when creating a new one for same email", async () => {
    const { inviteId: firstId } = await createInvite({
      tenantId,
      invitedByUserId: adminUserId,
      invitedByRole: "TENANT_ADMIN",
      email: inviteeEmail,
      role: "CLIENT",
    });

    await createInvite({
      tenantId,
      invitedByUserId: adminUserId,
      invitedByRole: "TENANT_ADMIN",
      email: inviteeEmail,
      role: "STAFF",
    });

    const firstRecord = await prisma.inviteToken.findUnique({ where: { id: firstId } });
    expect(firstRecord!.revokedAt).not.toBeNull();
  });
});
