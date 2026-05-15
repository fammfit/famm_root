import { createHash, randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import type { AccessTokenPayload } from "@famm/auth";
import { getJwtSecret, JWT_ISSUER, JWT_AUDIENCE_WEB } from "@famm/auth";

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
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE_WEB)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(getJwtSecret());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret(), {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE_WEB,
  });
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

export interface RefreshTokenPair {
  refreshToken: string;
  refreshTokenHash: string;
}

/**
 * Mint a refresh token + its sha256 hash without involving the access JWT.
 * Use this when the session row needs to exist before the JWT can be signed
 * (the JWT carries the session id in `sid`).
 */
export function newRefreshTokenPair(): RefreshTokenPair {
  const refreshToken = generateSecureToken(48);
  return { refreshToken, refreshTokenHash: hashToken(refreshToken) };
}
