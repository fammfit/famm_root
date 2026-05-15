import { serve } from "@hono/node-server";
import app from "./app";
import { attachAiWebSocket } from "./lib/ws";
import { paymentsAdapter } from "./routes/ai";

const port = parseInt(process.env["PORT"] ?? "4000");

console.warn(`[api] Starting on port ${port} (${process.env["NODE_ENV"] ?? "development"})`);

const server = serve({ fetch: app.fetch, port }, () => {
  console.warn(`[api] Listening at http://localhost:${port}`);
});

// WebSocket upgrades share the Node HTTP server so we keep a single port.
attachAiWebSocket({ server: server as unknown as import("node:http").Server, paymentsClient: paymentsAdapter });
