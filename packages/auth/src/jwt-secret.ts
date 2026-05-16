/**
 * Shared JWT secret loader. Fails fast at module load if JWT_SECRET is missing,
 * so that no service can ever fall back to a predictable default in production.
 *
 * Tests that need a deterministic secret should set JWT_SECRET in the test
 * harness (e.g. vitest setup) before importing modules that depend on it.
 */

const DEV_FALLBACK = "dev-secret-change-in-production";

function loadSecret(): string {
  const fromEnv = process.env["JWT_SECRET"];
  if (!fromEnv) {
    throw new Error(
      "JWT_SECRET is required. Set it to a 256-bit random value " +
        "(generate with `openssl rand -hex 32`). Refusing to start with a default."
    );
  }
  if (fromEnv === DEV_FALLBACK || fromEnv.length < 32) {
    if (process.env["NODE_ENV"] === "production") {
      throw new Error("JWT_SECRET is too weak for production. Use a 32+ byte random value.");
    }
  }
  return fromEnv;
}

let cached: Uint8Array | null = null;

export function getJwtSecret(): Uint8Array {
  if (!cached) cached = new TextEncoder().encode(loadSecret());
  return cached;
}

export const JWT_ISSUER = "famm";
export const JWT_AUDIENCE_WEB = "famm:web";
export const JWT_AUDIENCE_API = "famm:api";
export const JWT_AUDIENCE_VOICE = "famm:voice";
