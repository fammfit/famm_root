export type UserRole =
  | "SUPER_ADMIN"
  | "TENANT_OWNER"
  | "TENANT_ADMIN"
  | "TRAINER_LEAD"
  | "TRAINER"
  | "STAFF"
  | "CLIENT";

export type UserStatus = "ACTIVE" | "INACTIVE" | "PENDING_VERIFICATION" | "SUSPENDED";

export type AuthMethod = "PASSWORD" | "MAGIC_LINK" | "SMS_OTP" | "OAUTH";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  timezone: string;
  status: UserStatus;
  isSuperAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId: string;
  isSuperAdmin: boolean;
}

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface TenantMembership {
  id: string;
  tenantId: string;
  userId: string;
  role: UserRole;
  joinedAt: string;
  permissions: string[];
}
