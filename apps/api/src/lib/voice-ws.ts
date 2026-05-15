import type { Server as HttpServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { jwtVerify } from "jose";
import {
  VoiceOrchestrator,
  TwilioVoiceClient,
  buildTransferTwiml,
  buildVoiceInstructions,
  loadVoiceSession,
  saveVoiceSession,
  deleteVoiceSession,
  formatContextBlock,
  loadUserContext,
  type VoiceSink,
  type VoiceSession,
  type WorkflowEvent,
  type PaymentsClient,
} from "@famm/ai";
import { prisma } from "@famm/db";

/**
 * Twilio Media Streams ↔ VoiceOrchestrator WebSocket bridge.
 *
 * Lifecycle:
 *   1. Twilio dials our wss:// URL after the `<Connect><Stream>` TwiML.
 *      The URL carries a short-lived JWT we minted in the inbound webhook —
 *      this lets us bind the socket to (tenantId, callSid) before any frame
 *      arrives.
 *   2. Twilio sends a `start` frame with the CallSid and custom Parameters.
 *      We load the matching VoiceSession from Redis, build a VoiceSink, and
 *      spin up an orchestrator.
 *   3. `media` frames flow into orchestrator.pushAudio. Outbound audio is
 *      written back through the sink.
 *   4. On `stop` or socket close, we tear down the orchestrator and
 *      finalize the conversation row.
 */

const JWT_SECRET = new TextEncoder().encode(
  process.env["JWT_SECRET"] ?? "dev-secret-change-in-production"
);

interface VoiceTokenPayload {
  tenantId: string;
  callSid: string;
}

export interface AttachVoiceWebSocketArgs {
  server: HttpServer;
  paymentsClient?: PaymentsClient;
  publishEvent?: (event: WorkflowEvent) => Promise<void>;
  twilio?: TwilioVoiceClient;
  /** Public HTTPS base for transfer TwiML URLs. */
  publicApiUrl?: string;
  /** Fallback escalation target if the tenant has none configured. */
  escalationTarget?: string;
}

export function attachVoiceWebSocket(args: AttachVoiceWebSocketArgs): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  args.server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname !== "/voice/stream") return;

    void (async () => {
      try {
        const token = url.searchParams.get("token");
        if (!token) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const claims = payload as unknown as VoiceTokenPayload;
        if (!claims.tenantId || !claims.callSid) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
        wss.handleUpgrade(req, socket, head, (ws) => {
          bindVoiceSocket(ws, claims, args);
        });
      } catch (err) {
        console.warn("[voice-ws] auth failed:", err);
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
      }
    })();
  });

  return wss;
}

type TwilioFrame =
  | { event: "connected"; protocol: string; version: string }
  | {
      event: "start";
      sequenceNumber: string;
      start: {
        streamSid: string;
        accountSid: string;
        callSid: string;
        tracks: string[];
        customParameters?: Record<string, string>;
        mediaFormat?: { encoding: string; sampleRate: number; channels: number };
      };
    }
  | {
      event: "media";
      sequenceNumber: string;
      media: {
        track: string;
        chunk: string;
        timestamp: string;
        payload: string;
      };
      streamSid: string;
    }
  | {
      event: "mark";
      sequenceNumber: string;
      streamSid: string;
      mark: { name: string };
    }
  | { event: "stop"; sequenceNumber: string; streamSid: string };

function bindVoiceSocket(
  ws: WebSocket,
  claims: VoiceTokenPayload,
  args: AttachVoiceWebSocketArgs
): void {
  let orchestrator: VoiceOrchestrator | null = null;
  let streamSid: string | null = null;
  let session: VoiceSession | null = null;
  let teardownStarted = false;

  const sendTwilio = (obj: Record<string, unknown>): void => {
    try {
      ws.send(JSON.stringify(obj));
    } catch {
      /* socket gone */
    }
  };

  const teardown = async (reason: string): Promise<void> => {
    if (teardownStarted) return;
    teardownStarted = true;
    try {
      orchestrator?.hangup(reason);
    } catch {
      /* noop */
    }
    try {
      ws.close();
    } catch {
      /* noop */
    }
    if (session) {
      const endedAt = new Date();
      await Promise.allSettled([
        prisma.aiConversation
          .update({
            where: { id: session.conversationId },
            data: { endedAt, summary: `Voice call ended: ${reason}` },
          })
          .catch(() => null),
        deleteVoiceSession(session.tenantId, session.callSid),
      ]);
    }
  };

  ws.on("message", async (raw) => {
    let frame: TwilioFrame;
    try {
      frame = JSON.parse(raw.toString()) as TwilioFrame;
    } catch {
      return;
    }

    switch (frame.event) {
      case "connected":
        return;

      case "start": {
        if (frame.start.callSid !== claims.callSid) {
          // Token was minted for a different call — refuse to bridge.
          console.warn("[voice-ws] callSid mismatch", {
            expected: claims.callSid,
            got: frame.start.callSid,
          });
          await teardown("callsid_mismatch");
          return;
        }
        streamSid = frame.start.streamSid;
        const loaded = await loadVoiceSession(claims.tenantId, claims.callSid);
        if (!loaded) {
          console.warn("[voice-ws] no session for callSid", claims);
          await teardown("session_missing");
          return;
        }
        session = loaded;

        try {
          orchestrator = await startOrchestrator({
            session,
            streamSid,
            sendTwilio,
            args,
            teardown,
          });
          orchestrator.start();
        } catch (err) {
          console.error("[voice-ws] orchestrator startup failed", err);
          await teardown("startup_failed");
        }
        return;
      }

      case "media":
        if (!orchestrator) return;
        // Only inbound caller track is relevant — outbound is what we send.
        if (frame.media.track && frame.media.track !== "inbound") return;
        orchestrator.pushAudio(frame.media.payload);
        if (session) {
          session.framesIn += 1;
        }
        return;

      case "mark":
        orchestrator?.onMarkReceived(frame.mark.name);
        return;

      case "stop":
        await teardown("twilio_stop");
        return;

      default:
        return;
    }
  });

  ws.on("close", () => {
    void teardown("socket_close");
  });
  ws.on("error", (err) => {
    console.warn("[voice-ws] socket error", err);
    void teardown("socket_error");
  });
}

async function startOrchestrator(args: {
  session: VoiceSession;
  streamSid: string;
  sendTwilio: (obj: Record<string, unknown>) => void;
  args: AttachVoiceWebSocketArgs;
  teardown: (reason: string) => Promise<void>;
}): Promise<VoiceOrchestrator> {
  const { session, streamSid, sendTwilio, args: deps, teardown } = args;

  const tenantSettings = await prisma.tenantSettings.findUnique({
    where: { tenantId: session.tenantId },
    select: {
      aiEnabled: true,
      aiPersonaName: true,
      aiSystemPrompt: true,
      timezone: true,
      currency: true,
    },
  });
  if (tenantSettings?.aiEnabled === false) {
    await teardown("ai_disabled");
    throw new Error("AI disabled for tenant");
  }

  // Personalization is best-effort — if we couldn't resolve the caller to a
  // user, the context block falls back to a generic "there" salutation.
  let contextBlock = "Caller is not a recognized user. Verify identity before acting.";
  if (session.userId) {
    const ctx = await loadUserContext({
      tenantId: session.tenantId,
      userId: session.userId,
      timezone: session.timezone,
      currency: session.currency,
    });
    contextBlock = formatContextBlock(ctx);
  }

  const instructions = buildVoiceInstructions({
    tenantId: session.tenantId,
    userId: session.userId ?? "unknown",
    timezone: session.timezone,
    currency: session.currency,
    ...(tenantSettings?.aiPersonaName
      ? { personaName: tenantSettings.aiPersonaName }
      : {}),
    ...(tenantSettings?.aiSystemPrompt
      ? { tenantSystemPrompt: tenantSettings.aiSystemPrompt }
      : {}),
    contextBlock,
  });

  const greeting = pickGreeting(session, tenantSettings?.aiPersonaName ?? undefined);

  const sink: VoiceSink = {
    sendAudio: (audioB64) => {
      sendTwilio({
        event: "media",
        streamSid,
        media: { payload: audioB64 },
      });
      session.framesOut += 1;
    },
    clearPlayback: () => {
      sendTwilio({ event: "clear", streamSid });
    },
    mark: (name) => {
      sendTwilio({
        event: "mark",
        streamSid,
        mark: { name },
      });
    },
    close: (reason) => {
      void teardown(reason);
    },
    transfer: async (target, reason) => {
      if (!deps.twilio || !deps.publicApiUrl) {
        throw new Error("transfer not configured");
      }
      const transferUrl = new URL("/api/voice/transfer", deps.publicApiUrl);
      transferUrl.searchParams.set("target", target);
      transferUrl.searchParams.set("callSid", session.callSid);
      transferUrl.searchParams.set("tenantId", session.tenantId);
      transferUrl.searchParams.set("reason", reason);
      await deps.twilio.updateCall(session.callSid, transferUrl.toString());
      session.transferTarget = target;
      session.transferReason = reason;
      await saveVoiceSession(session);
    },
    ...(deps.publishEvent
      ? {
          emitEvent: async (e: { type: string; payload: Record<string, unknown> }) =>
            deps.publishEvent!({
              tenantId: session.tenantId,
              userId: session.userId ?? "system",
              type: e.type,
              payload: e.payload,
            }),
        }
      : {}),
  };

  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  return new VoiceOrchestrator({
    session,
    greeting,
    instructions,
    ...(session.brief ? { brief: session.brief } : {}),
    sink,
    deps: {
      actor: {
        tenantId: session.tenantId,
        userId: session.userId ?? "system",
        timezone: session.timezone,
        currency: session.currency,
      },
      openAiApiKey: apiKey,
      ...(deps.paymentsClient ? { paymentsClient: deps.paymentsClient } : {}),
      ...(deps.publishEvent
        ? {
            publishEvent: async (e) =>
              deps.publishEvent!({
                tenantId: session.tenantId,
                userId: session.userId ?? "system",
                type: e.type,
                payload: e.payload,
              }),
          }
        : {}),
      ...(deps.escalationTarget ? { escalationTarget: deps.escalationTarget } : {}),
    },
  });
}

function pickGreeting(session: VoiceSession, persona: string | undefined): string {
  const name = persona ?? "the team";
  switch (session.intent) {
    case "reminder":
      return `Hi, this is ${name} calling about your upcoming appointment. Do you have a quick moment?`;
    case "waitlist_fulfillment":
      return `Hi, this is ${name} — a spot just opened up that matches your waitlist request. Are you still interested?`;
    case "trainer_utilization":
      return `Hi, this is ${name} checking in about your schedule for next week.`;
    case "booking":
      return `Hi, this is ${name}. I can help with bookings — what would you like to do?`;
    case "receptionist":
    case "custom":
    default:
      return `Hi, this is ${name}. How can I help you today?`;
  }
}

/**
 * Re-export for the voice route — keeps the call-to-WS contract in one place.
 */
export { buildTransferTwiml };
