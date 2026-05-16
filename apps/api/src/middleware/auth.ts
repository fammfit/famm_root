import type { MiddlewareHandler } from "hono";
import { jwtVerify } from "jose";
import type { JwtPayload } from "@famm/types";
import { getJwtSecret, JWT_ISSUER, JWT_AUDIENCE_WEB, JWT_AUDIENCE_API } from "@famm/auth";

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return c.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Missing token" } },
      401
    );
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: JWT_ISSUER,
      // Web tokens (issued by the Next.js app) are scoped to "famm:web"; some
      // backend-to-backend calls use "famm:api". Accept either.
      audience: [JWT_AUDIENCE_WEB, JWT_AUDIENCE_API],
    });
    c.set("user", payload as unknown as JwtPayload);
    await next();
    return;
  } catch {
    return c.json(
      { success: false, error: { code: "TOKEN_EXPIRED", message: "Invalid or expired token" } },
      401
    );
  }
};
