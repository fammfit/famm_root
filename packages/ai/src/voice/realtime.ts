import { WebSocket } from "ws";

/**
 * Thin adapter for the OpenAI Realtime API over WebSocket.
 *
 * The Realtime endpoint accepts G.711 µ-law audio at 8 kHz natively, which
 * matches Twilio Media Streams exactly — so audio frames flow through this
 * bridge without resampling or transcoding. We send and receive JSON events;
 * binary audio is base64-encoded inside `input_audio_buffer.append` /
 * `response.audio.delta` events.
 *
 * This module deliberately does not pull from `openai` — the Realtime types
 * are still beta and we want the bridge to be a small, well-typed surface
 * that can be unit-tested without the SDK.
 */

const REALTIME_URL = "wss://api.openai.com/v1/realtime";
const DEFAULT_MODEL = "gpt-4o-realtime-preview-2024-12-17";

export interface RealtimeTool {
  type: "function";
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
}

export interface RealtimeSessionConfig {
  instructions: string;
  voice?: "alloy" | "ash" | "ballad" | "coral" | "echo" | "sage" | "shimmer" | "verse";
  /** Server-VAD threshold (0-1). Lower = more sensitive. */
  vadThreshold?: number;
  /** ms of silence before commit. */
  vadSilenceMs?: number;
  /** ms of audio prefix kept ahead of speech onset. */
  vadPrefixMs?: number;
  /** Tool surface exposed to the model. */
  tools?: RealtimeTool[];
  /** Optional temperature. */
  temperature?: number;
  /** Max output tokens per response. */
  maxResponseTokens?: number;
}

export interface RealtimeClientOptions {
  apiKey: string;
  model?: string;
  config: RealtimeSessionConfig;
  /** Optional logger (defaults to console.warn). */
  log?: (msg: string, meta?: Record<string, unknown>) => void;
  /** WebSocket factory (overridable for tests). */
  socketFactory?: (url: string, headers: Record<string, string>) => RealtimeSocket;
}

/**
 * Minimal duck-typed WebSocket interface so we can swap in a fake for tests.
 * Matches both `ws` and the standard `WebSocket`.
 */
export interface RealtimeSocket {
  send(data: string): void;
  close(): void;
  on(event: "open", listener: () => void): void;
  on(event: "message", listener: (data: Buffer | string) => void): void;
  on(event: "close", listener: (code: number, reason: Buffer) => void): void;
  on(event: "error", listener: (err: Error) => void): void;
}

/** Events emitted upward — already normalized from raw OpenAI payloads. */
export type RealtimeEvent =
  | { type: "ready" }
  | { type: "user_speech_started" }
  | { type: "user_speech_stopped" }
  | { type: "user_audio_committed"; itemId: string }
  | { type: "user_transcript"; itemId: string; text: string }
  | { type: "assistant_audio_delta"; responseId: string; audioB64: string }
  | { type: "assistant_text_delta"; responseId: string; text: string }
  | { type: "assistant_response_started"; responseId: string }
  | { type: "assistant_response_done"; responseId: string }
  | {
      type: "tool_call";
      callId: string;
      name: string;
      arguments: Record<string, unknown>;
    }
  | { type: "error"; error: string }
  | { type: "closed"; code: number };

export type RealtimeListener = (event: RealtimeEvent) => void;

export class RealtimeClient {
  private socket: RealtimeSocket | null = null;
  private readonly listeners = new Set<RealtimeListener>();
  private readonly toolArgBuffers = new Map<string, { name: string; argsText: string }>();
  private closed = false;

  constructor(private readonly opts: RealtimeClientOptions) {}

  on(listener: RealtimeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  connect(): void {
    if (this.socket) return;
    const model = this.opts.model ?? DEFAULT_MODEL;
    const url = `${REALTIME_URL}?model=${encodeURIComponent(model)}`;
    const headers = {
      Authorization: `Bearer ${this.opts.apiKey}`,
      "OpenAI-Beta": "realtime=v1",
    };

    const socket = this.opts.socketFactory
      ? this.opts.socketFactory(url, headers)
      : (new WebSocket(url, { headers }) as unknown as RealtimeSocket);

    this.socket = socket;
    socket.on("open", () => {
      this.sendSessionUpdate();
      this.emit({ type: "ready" });
    });
    socket.on("message", (data) => this.handleIncoming(data));
    socket.on("close", (code) => {
      this.closed = true;
      this.emit({ type: "closed", code });
    });
    socket.on("error", (err) => {
      this.emit({ type: "error", error: err.message });
    });
  }

  /** Append one frame of µ-law audio (base64) from Twilio. */
  appendAudio(audioB64: string): void {
    this.sendRaw({ type: "input_audio_buffer.append", audio: audioB64 });
  }

  /** Force a commit (rarely needed — server VAD usually handles it). */
  commitAudio(): void {
    this.sendRaw({ type: "input_audio_buffer.commit" });
  }

  /** Inject a text user turn (used by outbound greetings). */
  sendUserText(text: string): void {
    this.sendRaw({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    });
    this.requestResponse();
  }

  /** Ask the model to immediately generate a response. */
  requestResponse(instructions?: string): void {
    const response: Record<string, unknown> = {};
    if (instructions) response["instructions"] = instructions;
    this.sendRaw({ type: "response.create", response });
  }

  /** Cancel an in-flight response (barge-in / interrupt). */
  cancelResponse(): void {
    this.sendRaw({ type: "response.cancel" });
  }

  /** Return a tool-call result to the model so it can continue. */
  submitToolResult(callId: string, output: string): void {
    this.sendRaw({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output,
      },
    });
    // Tell the model to continue speaking now that the tool returned.
    this.requestResponse();
  }

  close(): void {
    if (!this.socket || this.closed) return;
    try {
      this.socket.close();
    } finally {
      this.socket = null;
      this.closed = true;
    }
  }

  // ── internals ─────────────────────────────────────────────────────────────

  private sendSessionUpdate(): void {
    const cfg = this.opts.config;
    const sessionPayload: Record<string, unknown> = {
      modalities: ["audio", "text"],
      instructions: cfg.instructions,
      voice: cfg.voice ?? "alloy",
      input_audio_format: "g711_ulaw",
      output_audio_format: "g711_ulaw",
      input_audio_transcription: { model: "whisper-1" },
      turn_detection: {
        type: "server_vad",
        threshold: cfg.vadThreshold ?? 0.5,
        prefix_padding_ms: cfg.vadPrefixMs ?? 300,
        silence_duration_ms: cfg.vadSilenceMs ?? 500,
      },
      temperature: cfg.temperature ?? 0.7,
    };
    if (cfg.maxResponseTokens != null) {
      sessionPayload["max_response_output_tokens"] = cfg.maxResponseTokens;
    }
    if (cfg.tools?.length) {
      sessionPayload["tools"] = cfg.tools;
      sessionPayload["tool_choice"] = "auto";
    }
    this.sendRaw({ type: "session.update", session: sessionPayload });
  }

  private sendRaw(payload: Record<string, unknown>): void {
    if (!this.socket || this.closed) return;
    try {
      this.socket.send(JSON.stringify(payload));
    } catch (err) {
      this.log("send failed", { error: (err as Error).message });
    }
  }

  private emit(event: RealtimeEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        this.log("listener threw", { error: (err as Error).message });
      }
    }
  }

  private handleIncoming(data: Buffer | string): void {
    let parsed: Record<string, unknown>;
    try {
      const text = typeof data === "string" ? data : data.toString("utf-8");
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return;
    }

    const type = parsed["type"];
    if (typeof type !== "string") return;

    switch (type) {
      case "input_audio_buffer.speech_started":
        this.emit({ type: "user_speech_started" });
        return;
      case "input_audio_buffer.speech_stopped":
        this.emit({ type: "user_speech_stopped" });
        return;
      case "input_audio_buffer.committed":
        this.emit({
          type: "user_audio_committed",
          itemId: String(parsed["item_id"] ?? ""),
        });
        return;
      case "conversation.item.input_audio_transcription.completed":
        this.emit({
          type: "user_transcript",
          itemId: String(parsed["item_id"] ?? ""),
          text: String(parsed["transcript"] ?? ""),
        });
        return;
      case "response.created":
        this.emit({
          type: "assistant_response_started",
          responseId: this.responseId(parsed),
        });
        return;
      case "response.audio.delta":
        this.emit({
          type: "assistant_audio_delta",
          responseId: String(parsed["response_id"] ?? ""),
          audioB64: String(parsed["delta"] ?? ""),
        });
        return;
      case "response.audio_transcript.delta":
        this.emit({
          type: "assistant_text_delta",
          responseId: String(parsed["response_id"] ?? ""),
          text: String(parsed["delta"] ?? ""),
        });
        return;
      case "response.function_call_arguments.delta": {
        const callId = String(parsed["call_id"] ?? "");
        const name = String(parsed["name"] ?? "");
        const slot = this.toolArgBuffers.get(callId) ?? { name, argsText: "" };
        if (name) slot.name = name;
        slot.argsText += String(parsed["delta"] ?? "");
        this.toolArgBuffers.set(callId, slot);
        return;
      }
      case "response.function_call_arguments.done": {
        const callId = String(parsed["call_id"] ?? "");
        const slot = this.toolArgBuffers.get(callId);
        const name = String(parsed["name"] ?? slot?.name ?? "");
        const argsText = String(parsed["arguments"] ?? slot?.argsText ?? "");
        this.toolArgBuffers.delete(callId);
        let args: Record<string, unknown> = {};
        try {
          args = argsText ? (JSON.parse(argsText) as Record<string, unknown>) : {};
        } catch {
          args = {};
        }
        this.emit({ type: "tool_call", callId, name, arguments: args });
        return;
      }
      case "response.done": {
        const response = parsed["response"] as { id?: string } | undefined;
        this.emit({
          type: "assistant_response_done",
          responseId: response?.id ?? "",
        });
        return;
      }
      case "error": {
        const err = parsed["error"] as { message?: string } | undefined;
        this.emit({ type: "error", error: err?.message ?? "realtime error" });
        return;
      }
      default:
        return;
    }
  }

  private responseId(payload: Record<string, unknown>): string {
    const r = payload["response"] as { id?: string } | undefined;
    return r?.id ?? "";
  }

  private log(msg: string, meta?: Record<string, unknown>): void {
    if (this.opts.log) this.opts.log(msg, meta);
    else console.warn(`[realtime] ${msg}`, meta ?? "");
  }
}
