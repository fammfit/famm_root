import { describe, it, expect, beforeEach } from "vitest";
import { assertMembership, getTenantMembers } from "@/lib/tenant/query-helpers";
import { assertSameTenant } from "@/lib/rbac/access-control";
import { createTestTenant, createTestUser, createTestMembership } from "../setup/factories";
import type { AuthContext } from "@/lib/rbac/access-control";

describe("Tenant isolation", () => {
  let tenantA: { id: string };
  let tenantB: { id: string };
  let userInA: { id: string };
  let userInB: { id: string };

  beforeEach(async () => {
    tenantA = await createTestTenant();
    tenantB = await createTestTenant();
    userInA = await createTestUser(tenantA.id, { role: "CLIENT" });
    userInB = await createTestUser(tenantB.id, { role: "CLIENT" });
    await createTestMembership(userInA.id, tenantA.id, "CLIENT");
    await createTestMembership(userInB.id, tenantB.id, "CLIENT");
  });

  it("assertMembership passes for member of correct tenant", async () => {
    await expect(assertMembership(userInA.id, tenantA.id)).resolves.not.toThrow();
  });

  it("assertMembership throws for user trying to access different tenant", async () => {
    await expect(assertMembership(userInA.id, tenantB.id)).rejects.toThrow();
  });

  it("getTenantMembers only returns members of the queried tenant", async () => {
    const result = await getTenantMembers(tenantA.id, { page: 1, limit: 50 });
    const ids = result.members.map((m: { userId: string }) => m.userId);
    expect(ids).toContain(userInA.id);
    expect(ids).not.toContain(userInB.id);
  });

  it("assertSameTenant passes when tenantId matches context", () => {
    const ctx: AuthContext = {
      userId: userInA.id,
      tenantId: tenantA.id,
      userEmail: "a@test.example",
      userRole: "CLIENT",
      sessionId: "sess_test",
      extraPermissions: [],
    };
    expect(() => assertSameTenant(ctx, tenantA.id)).not.toThrow();
  });

  it("assertSameTenant throws when tenantId does not match", () => {
    const ctx: AuthContext = {
      userId: userInA.id,
      tenantId: tenantA.id,
      userEmail: "a@test.example",
      userRole: "CLIENT",
      sessionId: "sess_test",
      extraPermissions: [],
    };
    expect(() => assertSameTenant(ctx, tenantB.id)).toThrow();
  });

  it("SUPER_ADMIN bypasses assertSameTenant", () => {
    const ctx: AuthContext = {
      userId: "super_admin_user",
      tenantId: "system",
      userEmail: "sa@famm.io",
      userRole: "SUPER_ADMIN",
      sessionId: "sess_sa",
      extraPermissions: [],
    };
    expect(() => assertSameTenant(ctx, tenantA.id)).not.toThrow();
    expect(() => assertSameTenant(ctx, tenantB.id)).not.toThrow();
  });

  it("magic links are rejected when verifying against a different tenant", async () => {
    const { createMagicLink, verifyMagicLink } = await import("@/lib/auth/magic-link");
    const email = `cross-tenant-${Date.now()}@test.example`;
    const { token } = await createMagicLink({ email, tenantId: tenantA.id });
    // Verifying against tenant B should fail with INVALID_TOKEN (tenantId mismatch)
    await expect(
      verifyMagicLink({ token, email, tenantId: tenantB.id })
    ).rejects.toThrow("INVALID_TOKEN");
  });
});
