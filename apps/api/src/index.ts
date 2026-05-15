import { serve } from "@hono/node-server";
import app from "./app";
import { attachAiWebSocket } from "./lib/ws";
import { attachVoiceWebSocket } from "./lib/voice-ws";
import { paymentsAdapter } from "./routes/ai";
import { buildTwilioClientFromEnv } from "./routes/voice";

const port = parseInt(process.env["PORT"] ?? "4000");

console.warn(`[api] Starting on port ${port} (${process.env["NODE_ENV"] ?? "development"})`);

const server = serve({ fetch: app.fetch, port }, () => {
  console.warn(`[api] Listening at http://localhost:${port}`);
});

// WebSocket upgrades share the Node HTTP server so we keep a single port.
const httpServer = server as unknown as import("node:http").Server;

attachAiWebSocket({ server: httpServer, paymentsClient: paymentsAdapter });

// Voice WS bridge. The Twilio client and escalation target are optional —
// if Twilio creds aren't set in this environment, transfers will close the
// call with a clear reason instead of attempting a REST update.
const twilio = buildTwilioClientFromEnv();
attachVoiceWebSocket({
  server: httpServer,
  paymentsClient: paymentsAdapter,
  ...(twilio ? { twilio } : {}),
  ...(process.env["PUBLIC_API_URL"] ? { publicApiUrl: process.env["PUBLIC_API_URL"] } : {}),
  ...(process.env["VOICE_ESCALATION_TARGET"]
    ? { escalationTarget: process.env["VOICE_ESCALATION_TARGET"] }
    : {}),
});
