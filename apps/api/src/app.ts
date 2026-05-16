import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { timeout } from "hono/timeout";
import { rateLimiter } from "hono/rate-limiter";

import healthRoutes from "./routes/health";
import webhookRoutes from "./routes/webhooks";
import paymentRoutes from "./routes/payments";
import aiRoutes from "./routes/ai";
import smsRoutes from "./routes/sms";
import voiceRoutes, { voicePlaceRouter } from "./routes/voice";
import { authMiddleware } from "./middleware/auth";
import { tenantMiddleware } from "./middleware/tenant";

const app = new Hono();

// Global middleware
app.use("*", logger());
app.use("*", secureHeaders());
app.use("*", timeout(30_000));
// CORS: in production CORS_ORIGINS must be set explicitly. In dev we default
// to localhost. Origins are matched exactly — no wildcards, no fallback to
// "first allowed origin" for unmatched requests (which would silently echo
// localhost back to attackers in misconfigured prod).
const corsAllowedOrigins = (() => {
  const fromEnv = process.env["CORS_ORIGINS"];
  if (fromEnv)
    return fromEnv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  if (process.env["NODE_ENV"] === "production") {
    throw new Error("CORS_ORIGINS must be set in production");
  }
  return ["http://localhost:3000"];
})();

app.use(
  "*",
  cors({
    origin: (origin) => (corsAllowedOrigins.includes(origin) ? origin : null),
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    exposeHeaders: ["X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
  })
);

const ipFromCtx = (c: { req: { header: (n: string) => string | undefined } }) =>
  c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? c.req.header("x-real-ip") ?? "unknown";

// Tight rate limit on auth endpoints.
app.use(
  "/api/v1/auth/*",
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-6",
    keyGenerator: ipFromCtx,
  })
);

// Broader rate limit on every authenticated API call so payments, AI, and
// other expensive endpoints are not unbounded. The auth-specific limit
// above still applies on top of this for /api/v1/auth/*.
app.use(
  "/api/v1/*",
  rateLimiter({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: "draft-6",
    keyGenerator: ipFromCtx,
  })
);

// Even tighter cap for payment-intent / checkout creation: each one consumes
// Stripe API quota and could be abused.
app.use(
  "/api/v1/payments/*",
  rateLimiter({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: "draft-6",
    keyGenerator: ipFromCtx,
  })
);

// Routes
app.route("/api/health", healthRoutes);

// Stripe webhooks: must be outside auth so the raw signature is verified by
// the Stripe webhook secret rather than by user-side JWT.
app.route("/api/webhooks", webhookRoutes);

// Twilio SMS webhook: outside auth — request authenticity is verified by
// the Twilio signature, and the user is resolved by phone number lookup.
app.route("/api/sms", smsRoutes);

// Twilio Voice webhooks: outside auth for the same reason as SMS — Twilio
// is authenticated by signature, callers are resolved by phone number, and
// the realtime WS upgrade is gated by a short-lived JWT.
app.route("/api/voice", voiceRoutes);

// Protected routes: apply auth + tenant context
app.use("/api/v1/*", authMiddleware, tenantMiddleware);

app.route("/api/v1/payments", paymentRoutes);
app.route("/api/v1/ai", aiRoutes);
// Operator endpoint to place outbound voice calls — auth + tenant required.
app.route("/api/v1/voice", voicePlaceRouter);

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

// Error handler. In production we strip stack traces from logs because they
// can include file paths, query fragments, and other sensitive data that
// downstream log aggregators may not be permitted to retain.
app.onError((err, c) => {
  if (process.env["NODE_ENV"] === "production") {
    const name = err instanceof Error ? err.name : "Error";
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[api] Unhandled error: ${name}: ${message}`);
  } else {
    console.error("[api] Unhandled error:", err);
  }
  return c.json(
    {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
    },
    500
  );
});

export default app;
