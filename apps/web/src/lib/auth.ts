import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import type { JwtPayload } from "@famm/shared";
import { getJwtSecret, JWT_ISSUER, JWT_AUDIENCE_WEB } from "@famm/auth";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signAccessToken(payload: Omit<JwtPayload, "iat" | "exp">): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE_WEB)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(getJwtSecret());
}

export async function signRefreshToken(): Promise<string> {
  return nanoid(64);
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret(), {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE_WEB,
  });
  return payload as unknown as JwtPayload;
}
