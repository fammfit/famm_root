import { type NextRequest } from "next/server";
import { Redis } from "ioredis";
import { getRequestContext } from "@/lib/request-context";
import { tenantChannel } from "@/lib/booking/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-Sent Events stream of realtime booking events scoped to the caller's
 * tenant. The WebSocket transport — see `useRealtime.ts` — speaks the same
 * JSON envelope, so the client can prefer WS and fall back to SSE without
 * any wire-level changes.
 *
 * Each connection opens a dedicated ioredis subscriber because the shared
 * client cannot be used for SUBSCRIBE.
 */
export async function GET(request: NextRequest) {
  let ctx;
  try {
    ctx = getRequestContext();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  const sub = new Redis(
    process.env["REDIS_URL"] ?? "redis://localhost:6379",
    { lazyConnect: true, maxRetriesPerRequest: null }
  );
  const channel = tenantChannel(ctx.tenantId);

  let closed = false;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string, event?: string) => {
        if (closed) return;
        try {
          let chunk = "";
          if (event) chunk += `event: ${event}\n`;
          chunk += `data: ${data}\n\n`;
          controller.enqueue(encoder.encode(chunk));
        } catch {
          /* controller closed */
        }
      };

      send(": ok");
      send(JSON.stringify({ type: "HELLO", tenantId: ctx.tenantId }));

      try {
        await sub.connect();
        await sub.subscribe(channel);
      } catch {
        send(JSON.stringify({ type: "ERROR", message: "subscribe failed" }));
        try {
          controller.close();
        } catch {
          /* noop */
        }
        return;
      }

      sub.on("message", (_ch: string, message: string) => send(message));

      heartbeat = setInterval(() => send(`: ping ${Date.now()}`), 25_000);

      const close = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        sub.unsubscribe(channel).catch(() => undefined);
        sub.disconnect();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      request.signal.addEventListener("abort", close);
    },
    cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      sub.disconnect();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
