import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { timeout } from "hono/timeout";
import { rateLimiter } from "hono/rate-limiter";

import healthRoutes from "./routes/health";
import { authMiddleware } from "./middleware/auth";
import { tenantMiddleware } from "./middleware/tenant";

const app = new Hono();

// Global middleware
app.use("*", logger());
app.use("*", secureHeaders());
app.use("*", timeout(30_000));
app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowed = (process.env["CORS_ORIGINS"] ?? "http://localhost:3000").split(",");
      return allowed.includes(origin) ? origin : allowed[0] ?? "";
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    exposeHeaders: ["X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
  })
);

// Rate limiting on public endpoints
app.use(
  "/api/v1/auth/*",
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-6",
    keyGenerator: (c) => c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "unknown",
  })
);

// Routes
app.route("/api/health", healthRoutes);

// Protected routes: apply auth + tenant context
app.use("/api/v1/*", authMiddleware, tenantMiddleware);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: { code: "NOT_FOUND", message: `Route ${c.req.method} ${c.req.path} not found` },
    },
    404
  );
});

// Error handler
app.onError((err, c) => {
  console.error("[api] Unhandled error:", err);
  return c.json(
    {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
    },
    500
  );
});

export default app;
