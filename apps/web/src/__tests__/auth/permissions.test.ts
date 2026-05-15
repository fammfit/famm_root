import { describe, it, expect } from "vitest";
import { can, canAny, canAll, isHigherRole, canAssignRole, getRoleLevel } from "@famm/auth";

describe("can()", () => {
  it("grants CLIENT booking:read:own", () => {
    expect(can("CLIENT", "booking:read:own")).toBe(true);
  });

  it("denies CLIENT booking:read:all", () => {
    expect(can("CLIENT", "booking:read:all")).toBe(false);
  });

  it("grants TRAINER_LEAD all TRAINER permissions", () => {
    expect(can("TRAINER_LEAD", "booking:read:all")).toBe(true);
    expect(can("TRAINER_LEAD", "trainer:manage")).toBe(true);
  });

  it("grants TENANT_ADMIN most admin permissions", () => {
    expect(can("TENANT_ADMIN", "user:update:role")).toBe(true);
    expect(can("TENANT_ADMIN", "tenant:settings")).toBe(true);
  });

  it("denies TENANT_ADMIN tenant:delete (owner-only)", () => {
    expect(can("TENANT_ADMIN", "tenant:delete")).toBe(false);
  });

  it("grants TENANT_OWNER all permissions", () => {
    expect(can("TENANT_OWNER", "tenant:delete")).toBe(true);
    expect(can("TENANT_OWNER", "tenant:billing")).toBe(true);
  });

  it("grants SUPER_ADMIN everything", () => {
    expect(can("SUPER_ADMIN", "tenant:delete")).toBe(true);
    expect(can("SUPER_ADMIN", "audit:read")).toBe(true);
  });

  it("respects extraPermissions", () => {
    expect(can("CLIENT", "booking:read:all", ["booking:read:all"])).toBe(true);
  });
});

describe("canAny()", () => {
  it("returns true if any permission matches", () => {
    expect(canAny("CLIENT", ["booking:read:own", "booking:read:all"])).toBe(true);
  });

  it("returns false if none match", () => {
    expect(canAny("CLIENT", ["tenant:delete", "tenant:billing"])).toBe(false);
  });
});

describe("canAll()", () => {
  it("returns true only if all permissions match", () => {
    expect(canAll("TRAINER", ["booking:read:own", "booking:read:all"])).toBe(true);
    expect(canAll("CLIENT", ["booking:read:own", "booking:read:all"])).toBe(false);
  });
});

describe("getRoleLevel()", () => {
  it("returns correct numeric levels", () => {
    expect(getRoleLevel("CLIENT")).toBe(10);
    expect(getRoleLevel("SUPER_ADMIN")).toBe(100);
    expect(getRoleLevel("TENANT_OWNER")).toBeGreaterThan(getRoleLevel("TENANT_ADMIN"));
  });
});

describe("isHigherRole()", () => {
  it("correctly compares role levels", () => {
    expect(isHigherRole("TENANT_ADMIN", "CLIENT")).toBe(true);
    expect(isHigherRole("CLIENT", "TRAINER")).toBe(false);
    expect(isHigherRole("TRAINER", "TRAINER")).toBe(false);
  });
});

describe("canAssignRole()", () => {
  it("allows assigning strictly lower roles", () => {
    expect(canAssignRole("TENANT_ADMIN", "TRAINER")).toBe(true);
    expect(canAssignRole("TENANT_ADMIN", "CLIENT")).toBe(true);
  });

  it("prevents assigning equal or higher roles", () => {
    expect(canAssignRole("TENANT_ADMIN", "TENANT_ADMIN")).toBe(false);
    expect(canAssignRole("TENANT_ADMIN", "TENANT_OWNER")).toBe(false);
    expect(canAssignRole("TRAINER", "TRAINER_LEAD")).toBe(false);
  });

  it("allows SUPER_ADMIN to assign any role including TENANT_OWNER", () => {
    expect(canAssignRole("SUPER_ADMIN", "TENANT_OWNER")).toBe(true);
  });
});
