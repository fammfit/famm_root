import type { UserRole, AuthMethod } from "@famm/types";

export interface SessionData {
  sessionId: string;
  userId: string;
  tenantId: string | null;
  email: string;
  role: UserRole;
  authMethod: AuthMethod;
  deviceId?: string;
  deviceName?: string;
  ipAddress?: string;
  extraPermissions: string[];
  createdAt: string;
  expiresAt: string;
}

export interface AccessTokenPayload {
  sub: string;        // userId
  email: string;
  tenantId: string | null;
  role: UserRole;
  sid: string;        // sessionId — for revocation checks
  iat: number;
  exp: number;
}

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
export const ACCESS_TOKEN_TTL = "15m";
export const MAGIC_LINK_TTL_MINUTES = 15;
export const SMS_OTP_TTL_MINUTES = 10;
export const SMS_OTP_MAX_ATTEMPTS = 5;
export const INVITE_TTL_DAYS = 7;
export const OTP_LENGTH = 6;
