import type { StreamChunk } from "@famm/types";

export interface ChatClientOptions {
  apiUrl: string;
  token: string;
  conversationId?: string;
  onChunk: (chunk: StreamChunk) => void;
  onSession?: (conversationId: string) => void;
  onClose?: (reason?: string) => void;
}

/**
 * Realtime chat client.
 *
 * Prefers a WebSocket connection (bidirectional, lower latency). If the
 * environment does not allow WS upgrades (proxy, etc.) callers can fall
 * back to `sendViaSse`.
 */
export class ChatClient {
  private socket: WebSocket | null = null;
  private opts: ChatClientOptions;
  private opened = false;

  constructor(opts: ChatClientOptions) {
    this.opts = opts;
  }

  connect(): void {
    const wsUrl = new URL(this.opts.apiUrl.replace(/^http/, "ws") + "/ws/ai");
    wsUrl.searchParams.set("token", this.opts.token);
    if (this.opts.conversationId) {
      wsUrl.searchParams.set("conversationId", this.opts.conversationId);
    }
    const socket = new WebSocket(wsUrl.toString());
    this.socket = socket;

    socket.onopen = () => {
      this.opened = true;
    };
    socket.onmessage = (ev) => {
      let data: unknown;
      try {
        data = JSON.parse(ev.data as string);
      } catch {
        return;
      }
      if (isSessionFrame(data)) {
        this.opts.onSession?.(data.conversationId);
        return;
      }
      if (isStreamChunk(data)) {
        this.opts.onChunk(data);
      }
    };
    socket.onclose = (ev) => {
      this.opened = false;
      this.opts.onClose?.(ev.reason);
    };
    socket.onerror = () => {
      this.opts.onClose?.("socket_error");
    };
  }

  send(message: string): void {
    if (!this.socket || !this.opened) {
      throw new Error("Socket not open");
    }
    this.socket.send(JSON.stringify({ type: "user_message", content: message }));
  }

  close(): void {
    this.socket?.close();
  }
}

/**
 * SSE fallback. Returns a promise that resolves when the stream finishes.
 */
export async function sendViaSse(args: {
  apiUrl: string;
  token: string;
  conversationId?: string;
  message: string;
  onChunk: (chunk: StreamChunk) => void;
}): Promise<void> {
  const res = await fetch(`${args.apiUrl}/api/v1/ai/chat/stream`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${args.token}`,
    },
    body: JSON.stringify({
      message: args.message,
      conversationId: args.conversationId,
    }),
  });

  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        try {
          const parsed = JSON.parse(payload) as unknown;
          if (isStreamChunk(parsed)) args.onChunk(parsed);
        } catch {
          // Ignore malformed frames.
        }
      }
    }
  }
}

function isSessionFrame(data: unknown): data is { type: "session"; conversationId: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { type?: string }).type === "session" &&
    typeof (data as { conversationId?: unknown }).conversationId === "string"
  );
}

function isStreamChunk(data: unknown): data is StreamChunk {
  if (typeof data !== "object" || data === null) return false;
  const type = (data as { type?: string }).type;
  return type === "text" || type === "tool_call" || type === "done" || type === "error";
}
