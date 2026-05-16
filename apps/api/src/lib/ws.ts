import type { Server as HttpServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { jwtVerify } from "jose";
import { processMessage, type PaymentsClient } from "@famm/ai";
import { prisma } from "@famm/db";
import type { JwtPayload } from "@famm/types";
import { getJwtSecret, JWT_ISSUER, JWT_AUDIENCE_WEB, JWT_AUDIENCE_API } from "@famm/auth";

/**
 * WebSocket architecture:
 *
 *   - One WSS attached to the existing HTTP server at /ws/ai.
 *   - The client must present a JWT via the `Sec-WebSocket-Protocol`
 *     subprotocol header (`bearer.<token>`). Query-string tokens are
 *     rejected because they leak to proxy logs / referrers.
 *   - The connection is bound to a single (tenant, user, conversation).
 *     Frames from one socket cannot influence another user's session.
 *   - Inbound frames are JSON: `{type: "user_message", content: string}`.
 *   - Outbound frames mirror the StreamChunk shape from @famm/types.
 */

interface SocketState {
  user: JwtPayload;
  conversationId: string;
  tenantId: string;
  timezone: string;
  currency: string;
}

export function attachAiWebSocket(args: {
  server: HttpServer;
  paymentsClient?: PaymentsClient;
}): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  args.server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname !== "/ws/ai") return;

    void (async () => {
      try {
        const token = extractToken(req.headers);
        if (!token) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
        const { payload } = await jwtVerify(token, getJwtSecret(), {
          issuer: JWT_ISSUER,
          audience: [JWT_AUDIENCE_WEB, JWT_AUDIENCE_API],
        });
        const user = payload as unknown as JwtPayload;

        const tenantSettings = await prisma.tenantSettings.findUnique({
          where: { tenantId: user.tenantId },
          select: { timezone: true, currency: true, aiEnabled: true },
        });
        if (tenantSettings?.aiEnabled === false) {
          socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
          socket.destroy();
          return;
        }

        const conversationId =
          url.searchParams.get("conversationId") ?? `web_${user.sub}_${Date.now()}`;

        wss.handleUpgrade(req, socket, head, (ws) => {
          const state: SocketState = {
            user,
            conversationId,
            tenantId: user.tenantId,
            timezone: tenantSettings?.timezone ?? "UTC",
            currency: tenantSettings?.currency ?? "USD",
          };
          bindConnection(ws, state, args.paymentsClient);
        });
      } catch (err) {
        console.warn("[ws] auth failed:", err);
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
      }
    })();
  });

  return wss;
}

function extractToken(headers: Record<string, string | string[] | undefined>): string | null {
  // Header-only: query-string tokens leak via proxy access logs, browser
  // history, and APM tooling.
  const proto = headers["sec-websocket-protocol"];
  const raw = Array.isArray(proto) ? proto[0] : proto;
  if (!raw) return null;
  // Subprotocols can be comma-separated.
  const candidates = raw.split(",").map((s) => s.trim());
  for (const c of candidates) {
    if (c.startsWith("bearer.")) return c.slice("bearer.".length);
  }
  return null;
}

function bindConnection(ws: WebSocket, state: SocketState, payments?: PaymentsClient): void {
  const send = (obj: unknown) => {
    try {
      ws.send(JSON.stringify(obj));
    } catch {
      // Socket closed mid-write — nothing to do.
    }
  };

  send({ type: "session", conversationId: state.conversationId });

  ws.on("message", async (raw) => {
    let parsed: { type?: string; content?: string };
    try {
      parsed = JSON.parse(raw.toString()) as typeof parsed;
    } catch {
      send({ type: "error", error: "invalid_json" });
      return;
    }
    if (parsed.type !== "user_message" || typeof parsed.content !== "string") {
      send({ type: "error", error: "expected user_message frame" });
      return;
    }

    try {
      await processMessage(
        {
          channel: "web",
          actor: {
            tenantId: state.tenantId,
            userId: state.user.sub,
            timezone: state.timezone,
            currency: state.currency,
          },
          sessionKey: state.conversationId,
          message: parsed.content,
          onChunk: (chunk) => send(chunk),
        },
        payments ? { paymentsClient: payments } : {}
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      send({ type: "error", error: message });
    }
  });

  ws.on("close", () => {
    // Nothing to clean up — session state lives in Redis with TTL.
  });
}
