import type { MiddlewareHandler } from "hono";
import { jwtVerify } from "jose";
import type { JwtPayload } from "@famm/types";

const JWT_SECRET = new TextEncoder().encode(
  process.env["JWT_SECRET"] ?? "dev-secret-change-in-production"
);

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
    const { payload } = await jwtVerify(token, JWT_SECRET);
    c.set("user", payload as unknown as JwtPayload);
    await next();
  } catch {
    return c.json(
      { success: false, error: { code: "TOKEN_EXPIRED", message: "Invalid or expired token" } },
      401
    );
  }
};
