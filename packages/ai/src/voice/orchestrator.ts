import type OpenAI from "openai";
import type { AiToolCall, AiToolResult } from "@famm/types";
import { OPENAI_TOOLS, executeAction, type ActionContext } from "../actions";
import { buildSystemPrompt } from "../prompts";
import {
  RealtimeClient,
  type RealtimeEvent,
  type RealtimeTool,
  type RealtimeClientOptions,
} from "./realtime";
import {
  initialContext,
  transition,
  type VoiceContext,
  type VoiceEffect,
  type VoiceEvent,
} from "./state";
import type { VoiceSession } from "./session";

/**
 * Realtime voice orchestrator.
 *
 * One instance per active call. It owns:
 *   1. the FSM (state.ts) describing where the call is
 *   2. the OpenAI Realtime socket (realtime.ts) producing audio + tool calls
 *   3. a tiny event surface that the Twilio WebSocket handler drives
 *
 * The orchestrator never reaches out to Twilio directly. Instead it emits
 * `VoiceSink` callbacks (`sendAudio`, `clearPlayback`, `transfer`, ...)
 * that the transport layer (apps/api/src/lib/voice-ws.ts) translates into
 * Media-Streams frames. Keeping that boundary clean lets us reuse the
 * orchestrator for outbound calls or for tests with a synthetic transport.
 */

export interface VoiceSink {
  /** Send a base64 µ-law audio chunk back to Twilio. */
  sendAudio(audioB64: string): void;
  /** Tell Twilio to discard any audio it has buffered for playback. */
  clearPlayback(): void;
  /** Send a `mark` event Twilio echoes when playback reaches it. */
  mark(name: string): void;
  /** End the call (orchestrator decided to hang up). */
  close(reason: string): void;
  /** Initiate a warm transfer to a human. */
  transfer(target: string, reason: string): Promise<void>;
  /** Emit a workflow event (NATS / audit log). */
  emitEvent?(event: { type: string; payload: Record<string, unknown> }): Promise<void>;
}

export interface VoiceOrchestratorDeps extends ActionContext {
  /** OpenAI API key for Realtime auth. */
  openAiApiKey: string;
  /** Model id override. */
  realtimeModel?: string;
  /** Fallback escalation target (E.164) if the tenant has not set one. */
  escalationTarget?: string;
  /** Optional Realtime socket factory (for tests). */
  realtimeSocketFactory?: RealtimeClientOptions["socketFactory"];
}

export interface VoiceOrchestratorArgs {
  session: VoiceSession;
  /** Greeting played at the top of the call. */
  greeting: string;
  /** Per-call instructions, derived from system prompt + telephony rules. */
  instructions: string;
  /** Optional structured brief injected as an assistant memory before audio. */
  brief?: string;
  sink: VoiceSink;
  deps: VoiceOrchestratorDeps;
}

const VOICE_GUIDANCE = [
  "You are speaking over a phone call. Keep replies short (1-2 sentences).",
  "Pause naturally so the caller can interrupt. If interrupted, stop and listen.",
  "Never read URLs, payment ids, or long codes — send them by SMS instead.",
  "Confirm dates, times, and totals out loud before invoking any state-changing tool.",
  "If you cannot complete the request safely, offer to transfer to a human.",
].join(" ");

export class VoiceOrchestrator {
  private ctx: VoiceContext = initialContext();
  private readonly client: RealtimeClient;
  /** Snapshot of the response epoch at the moment a given response started. */
  private readonly responseEpochs = new Map<string, number>();
  private streamStarted = false;
  private toolsInFlight = 0;

  constructor(private readonly args: VoiceOrchestratorArgs) {
    const tools = realtimeToolsFromChat(OPENAI_TOOLS);

    const clientOpts: RealtimeClientOptions = {
      apiKey: args.deps.openAiApiKey,
      ...(args.deps.realtimeModel ? { model: args.deps.realtimeModel } : {}),
      ...(args.deps.realtimeSocketFactory
        ? { socketFactory: args.deps.realtimeSocketFactory }
        : {}),
      config: {
        instructions: `${args.instructions}\n\n${VOICE_GUIDANCE}`,
        voice: "alloy",
        tools,
        temperature: 0.6,
        maxResponseTokens: 400,
      },
    };
    this.client = new RealtimeClient(clientOpts);
    this.client.on((event) => this.onRealtimeEvent(event));
  }

  /** Call once when the Twilio `start` frame arrives. */
  start(): void {
    this.client.connect();
    this.streamStarted = true;
    this.dispatch({ type: "stream_connected" });
  }

  /** Forward an inbound µ-law audio frame from Twilio. */
  pushAudio(audioB64: string): void {
    if (!this.streamStarted) return;
    this.client.appendAudio(audioB64);
  }

  /** Called from Twilio `mark` echo so we know when greeting playback finished. */
  onMarkReceived(name: string): void {
    if (name === "greeting_done") {
      this.dispatch({ type: "greeting_done" });
    }
  }

  /** External hangup signal (Twilio `stop`, socket close, etc). */
  hangup(reason = "remote_hangup"): void {
    this.dispatch({ type: "hangup" });
    try {
      this.client.close();
    } catch {
      /* noop */
    }
    this.args.sink.close(reason);
  }

  /** Force barge-in (admin/supervisor button). */
  interrupt(): void {
    this.dispatch({ type: "interrupt" });
  }

  // ── private ──────────────────────────────────────────────────────────────

  private dispatch(event: VoiceEvent): void {
    const { next, effects } = transition(this.ctx, event);
    this.ctx = next;
    for (const effect of effects) this.applyEffect(effect);
  }

  private applyEffect(effect: VoiceEffect): void {
    switch (effect.type) {
      case "send_greeting":
        this.sendGreeting();
        return;
      case "cancel_response":
        try {
          this.client.cancelResponse();
        } catch {
          /* noop */
        }
        return;
      case "clear_playback":
        this.args.sink.clearPlayback();
        return;
      case "begin_response":
        // Server-VAD has already triggered the response; nothing extra to do
        // here except let the FSM track the state.
        return;
      case "emit_event":
        void this.args.sink.emitEvent?.({
          type: effect.eventType,
          payload: effect.payload,
        });
        return;
      case "transfer":
        void this.doTransfer(effect.reason);
        return;
      case "close_call":
        try {
          this.client.close();
        } catch {
          /* noop */
        }
        this.args.sink.close(effect.reason);
        return;
      default: {
        const _exhaustive: never = effect;
        void _exhaustive;
        return;
      }
    }
  }

  private async doTransfer(reason: string): Promise<void> {
    const target = this.args.session.transferTarget ?? this.args.deps.escalationTarget;
    if (!target) {
      this.args.sink.close(`transfer_no_target:${reason}`);
      return;
    }
    try {
      await this.args.sink.transfer(target, reason);
    } catch (err) {
      this.args.sink.close(
        `transfer_failed:${err instanceof Error ? err.message : "unknown"}`
      );
    }
  }

  private sendGreeting(): void {
    // Inject the greeting as an assistant turn and request a response so the
    // model speaks it in its own voice. For outbound calls we additionally
    // prime the model with a structured brief.
    if (this.args.brief) {
      this.client.sendUserText(
        `[Operator brief — for your awareness only, do not read aloud:] ${this.args.brief}`
      );
    }
    this.client.requestResponse(
      `Begin the call by saying: ${JSON.stringify(this.args.greeting)}. ` +
        "Then wait for the caller's response."
    );
    // Schedule a synthetic mark — Twilio will echo it after the audio plays.
    this.args.sink.mark("greeting_done");
  }

  private onRealtimeEvent(event: RealtimeEvent): void {
    switch (event.type) {
      case "ready":
        return;
      case "user_speech_started":
        this.dispatch({ type: "user_speech_started" });
        return;
      case "user_speech_stopped":
        return;
      case "user_audio_committed":
        this.dispatch({ type: "user_speech_committed" });
        return;
      case "user_transcript":
        // Could be persisted to AiMessage as a partial user message; left to
        // the transport layer which has DB access.
        void this.args.sink.emitEvent?.({
          type: "ai.voice.user_transcript",
          payload: { itemId: event.itemId, text: event.text },
        });
        return;
      case "assistant_response_started":
        this.responseEpochs.set(event.responseId, this.ctx.responseEpoch);
        this.dispatch({ type: "assistant_response_started" });
        return;
      case "assistant_audio_delta": {
        // Drop audio belonging to an interrupted response — its epoch will
        // be older than the current one.
        const epoch = this.responseEpochs.get(event.responseId);
        if (epoch != null && epoch !== this.ctx.responseEpoch) return;
        this.args.sink.sendAudio(event.audioB64);
        return;
      }
      case "assistant_text_delta":
        return;
      case "assistant_response_done":
        this.responseEpochs.delete(event.responseId);
        this.dispatch({ type: "assistant_response_done" });
        return;
      case "tool_call":
        void this.handleToolCall(event.callId, event.name, event.arguments);
        return;
      case "error":
        this.dispatch({ type: "error", error: event.error });
        return;
      case "closed":
        this.dispatch({ type: "hangup" });
        this.args.sink.close(`realtime_closed:${event.code}`);
        return;
      default: {
        const _exhaustive: never = event;
        void _exhaustive;
        return;
      }
    }
  }

  private async handleToolCall(
    callId: string,
    name: string,
    args: Record<string, unknown>
  ): Promise<void> {
    this.toolsInFlight += 1;
    this.dispatch({ type: "tool_call_started", name, callId });

    // The escalate workflow is special: instead of returning a regular
    // tool-result we bridge the call to a human.
    if (name === "trigger_workflow" && args["workflow"] === "escalate_to_human") {
      const reason = typeof args["payload"] === "object" && args["payload"] !== null
        ? String(
            (args["payload"] as Record<string, unknown>)["reason"] ?? "agent_requested"
          )
        : "agent_requested";
      const result: AiToolResult = {
        toolCallId: callId,
        content: JSON.stringify({ status: "transferring" }),
      };
      this.client.submitToolResult(callId, result.content);
      this.dispatch({ type: "tool_call_finished", callId });
      this.dispatch({ type: "escalate", reason });
      this.toolsInFlight -= 1;
      return;
    }

    const call: AiToolCall = { id: callId, name, arguments: args };
    const result = await executeAction(call, this.args.deps);
    this.client.submitToolResult(callId, result.content);
    this.dispatch({ type: "tool_call_finished", callId });
    this.toolsInFlight -= 1;
  }
}

/**
 * Convert chat-completions tool defs (the surface used by SMS/web) into the
 * shape the Realtime API expects. The only difference is that Realtime
 * pulls `name` / `description` / `parameters` up to the top level instead
 * of nesting them under `function`.
 */
function realtimeToolsFromChat(
  tools: OpenAI.Chat.ChatCompletionTool[]
): RealtimeTool[] {
  return tools.map((t) => ({
    type: "function",
    name: t.function.name,
    ...(t.function.description ? { description: t.function.description } : {}),
    parameters: (t.function.parameters ?? {}) as Record<string, unknown>,
  }));
}

/**
 * Helper: build the system prompt used to initialize the realtime session.
 * Wraps the standard prompt builder so callers don't need to import both
 * modules just to set up a call.
 */
export function buildVoiceInstructions(args: {
  tenantId: string;
  userId: string;
  timezone: string;
  currency: string;
  personaName?: string;
  tenantSystemPrompt?: string;
  contextBlock: string;
}): string {
  return buildSystemPrompt({
    actor: {
      tenantId: args.tenantId,
      userId: args.userId,
      timezone: args.timezone,
      currency: args.currency,
      ...(args.personaName ? { personaName: args.personaName } : {}),
    },
    channel: "voice",
    ...(args.personaName ? { tenantPersona: args.personaName } : {}),
    ...(args.tenantSystemPrompt ? { tenantSystemPrompt: args.tenantSystemPrompt } : {}),
    contextBlock: args.contextBlock,
  });
}
