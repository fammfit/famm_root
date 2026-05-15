export type UserRole =
  | "SUPER_ADMIN"
  | "TENANT_OWNER"
  | "TENANT_ADMIN"
  | "TRAINER_LEAD"
  | "TRAINER"
  | "STAFF"
  | "CLIENT";

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
