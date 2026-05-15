import { createHash, randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import type { AccessTokenPayload } from "@famm/auth";
import type { UserRole } from "@famm/types";

const JWT_SECRET = new TextEncoder().encode(
  process.env["JWT_SECRET"] ?? "dev-secret-change-in-production"
);

export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function generateOtp(length = 6): string {
  // Cryptographically secure numeric OTP
  const max = Math.pow(10, length);
  const bytes = randomBytes(4);
  const num = bytes.readUInt32BE(0) % max;
  return num.toString().padStart(length, "0");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function signAccessToken(
  payload: Omit<AccessTokenPayload, "iat" | "exp">
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(JWT_SECRET);
}

export async function verifyAccessToken(
  token: string
): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return payload as unknown as AccessTokenPayload;
}

export interface TokenBundle {
  accessToken: string;
  refreshToken: string;
  refreshTokenHash: string;
}

export async function issueTokenBundle(
  payload: Omit<AccessTokenPayload, "iat" | "exp">
): Promise<TokenBundle> {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(payload),
    Promise.resolve(generateSecureToken(48)),
  ]);
  return {
    accessToken,
    refreshToken,
    refreshTokenHash: hashToken(refreshToken),
  };
}
