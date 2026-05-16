import type { UserRole } from "@famm/types";

// Numeric level for hierarchy comparisons (used to prevent privilege escalation)
export const ROLE_LEVELS: Record<UserRole, number> = {
  CLIENT: 10,
  STAFF: 20,
  TRAINER: 30,
  TRAINER_LEAD: 40,
  TENANT_ADMIN: 60,
  TENANT_OWNER: 80,
  SUPER_ADMIN: 100,
};

export type Permission =
  // Bookings
  | "booking:create"
  | "booking:read:own"
  | "booking:read:all"
  | "booking:update"
  | "booking:cancel:own"
  | "booking:cancel:any"
  // Users
  | "user:invite"
  | "user:read:own"
  | "user:read:all"
  | "user:update:profile"
  | "user:update:role"
  | "user:deactivate"
  | "user:sessions:revoke"
  // Tenant
  | "tenant:read"
  | "tenant:settings:update"
  | "tenant:billing"
  | "tenant:members:manage"
  | "tenant:suspend"
  | "tenant:create"
  | "tenant:delete"
  // Services
  | "service:read"
  | "service:create"
  | "service:update"
  | "service:delete"
  // Trainers
  | "trainer:assign"
  | "trainer:commission"
  | "trainer:hierarchy:manage"
  // AI
  | "ai:chat"
  | "ai:configure"
  // Reports
  | "reports:own"
  | "reports:team"
  | "reports:revenue"
  // Audit
  | "audit:read"
  | "invites:create"
  | "invites:revoke"
  // Scheduling
  | "availability:read"
  | "availability:write"
  | "member:delete"
  // Platform (super-admin only)
  | "platform:admin";

// Explicit role → permission grant table.
// We don't use hierarchy inheritance to stay predictable and auditable.
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  CLIENT: [
    "booking:create",
    "booking:read:own",
    "booking:cancel:own",
    "user:read:own",
    "user:update:profile",
    "tenant:read",
    "service:read",
    "ai:chat",
    "reports:own",
  ],

  STAFF: [
    "booking:create",
    "booking:read:own",
    "booking:cancel:own",
    "user:read:own",
    "user:update:profile",
    "tenant:read",
    "service:read",
    "service:create",
    "service:update",
    "ai:chat",
    "reports:own",
    "invites:create",
  ],

  TRAINER: [
    "booking:create",
    "booking:read:own",
    "booking:update",
    "booking:cancel:own",
    "user:read:own",
    "user:update:profile",
    "tenant:read",
    "service:read",
    "availability:read",
    "availability:write",
    "ai:chat",
    "reports:own",
    "trainer:commission",
  ],

  TRAINER_LEAD: [
    "booking:create",
    "booking:read:own",
    "booking:read:all",
    "booking:update",
    "booking:cancel:own",
    "booking:cancel:any",
    "user:invite",
    "user:read:own",
    "user:read:all",
    "user:update:profile",
    "tenant:read",
    "service:read",
    "availability:read",
    "availability:write",
    "member:delete",
    "trainer:assign",
    "trainer:commission",
    "trainer:hierarchy:manage",
    "ai:chat",
    "reports:own",
    "reports:team",
    "invites:create",
  ],

  TENANT_ADMIN: [
    "booking:create",
    "booking:read:own",
    "booking:read:all",
    "booking:update",
    "booking:cancel:own",
    "booking:cancel:any",
    "user:invite",
    "user:read:own",
    "user:read:all",
    "user:update:profile",
    "user:update:role",
    "user:deactivate",
    "user:sessions:revoke",
    "tenant:read",
    "tenant:members:manage",
    "service:read",
    "service:create",
    "service:update",
    "service:delete",
    "availability:read",
    "availability:write",
    "member:delete",
    "trainer:assign",
    "trainer:commission",
    "trainer:hierarchy:manage",
    "ai:chat",
    "ai:configure",
    "reports:own",
    "reports:team",
    "reports:revenue",
    "audit:read",
    "invites:create",
    "invites:revoke",
  ],

  TENANT_OWNER: [
    "booking:create",
    "booking:read:own",
    "booking:read:all",
    "booking:update",
    "booking:cancel:own",
    "booking:cancel:any",
    "user:invite",
    "user:read:own",
    "user:read:all",
    "user:update:profile",
    "user:update:role",
    "user:deactivate",
    "user:sessions:revoke",
    "tenant:read",
    "tenant:settings:update",
    "tenant:billing",
    "tenant:members:manage",
    "tenant:delete",
    "service:read",
    "service:create",
    "service:update",
    "service:delete",
    "availability:read",
    "availability:write",
    "member:delete",
    "trainer:assign",
    "trainer:commission",
    "trainer:hierarchy:manage",
    "ai:chat",
    "ai:configure",
    "reports:own",
    "reports:team",
    "reports:revenue",
    "audit:read",
    "invites:create",
    "invites:revoke",
  ],

  SUPER_ADMIN: [
    // Super admins get all permissions
    "booking:create",
    "booking:read:own",
    "booking:read:all",
    "booking:update",
    "booking:cancel:own",
    "booking:cancel:any",
    "user:invite",
    "user:read:own",
    "user:read:all",
    "user:update:profile",
    "user:update:role",
    "user:deactivate",
    "user:sessions:revoke",
    "tenant:read",
    "tenant:settings:update",
    "tenant:billing",
    "tenant:members:manage",
    "tenant:suspend",
    "tenant:create",
    "tenant:delete",
    "service:read",
    "service:create",
    "service:update",
    "service:delete",
    "trainer:assign",
    "trainer:commission",
    "trainer:hierarchy:manage",
    "ai:chat",
    "ai:configure",
    "reports:own",
    "reports:team",
    "reports:revenue",
    "audit:read",
    "invites:create",
    "invites:revoke",
    "availability:read",
    "availability:write",
    "member:delete",
    "platform:admin",
  ],
};

// Build reverse lookup: permission → allowed roles
const _permissionRoles = new Map<Permission, Set<UserRole>>();
for (const [role, perms] of Object.entries(ROLE_PERMISSIONS) as [UserRole, Permission[]][]) {
  for (const perm of perms) {
    if (!_permissionRoles.has(perm)) _permissionRoles.set(perm, new Set());
    _permissionRoles.get(perm)!.add(role);
  }
}

export function can(
  role: UserRole,
  permission: Permission,
  extraPermissions: string[] = []
): boolean {
  // Extra permissions are explicitly granted overrides stored on the membership
  if (extraPermissions.includes(permission)) return true;
  return _permissionRoles.get(permission)?.has(role) ?? false;
}

export function canAny(
  role: UserRole,
  permissions: Permission[],
  extraPermissions: string[] = []
): boolean {
  return permissions.some((p) => can(role, p, extraPermissions));
}

export function canAll(
  role: UserRole,
  permissions: Permission[],
  extraPermissions: string[] = []
): boolean {
  return permissions.every((p) => can(role, p, extraPermissions));
}

export function getRoleLevel(role: UserRole): number {
  return ROLE_LEVELS[role];
}

export function isHigherRole(a: UserRole, b: UserRole): boolean {
  return ROLE_LEVELS[a] > ROLE_LEVELS[b];
}

export function canAssignRole(assignerRole: UserRole, targetRole: UserRole): boolean {
  // Can only assign roles strictly below your own level
  return ROLE_LEVELS[assignerRole] > ROLE_LEVELS[targetRole];
}
