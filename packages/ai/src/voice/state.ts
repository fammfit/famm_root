/**
 * Voice call state machine.
 *
 * The realtime audio bridge funnels every event (stream frames, model
 * deltas, tool outcomes, hangups) through this single state object. Keeping
 * the FSM declarative and side-effect free makes it easy to unit-test —
 * effects (sending bytes to Twilio, calling tools, emitting NATS events)
 * live in the orchestrator.
 *
 * State transitions roughly mirror the call lifecycle:
 *
 *   idle → connecting → greeting → listening
 *                                ↘  responding ⇄ tool_running
 *                                ↘  transferring
 *                                ↘  ended
 *
 * The `responding` ↔ `listening` cycle is the inner loop driven by VAD on
 * either side. Interrupt (barge-in) is a transition from `responding` back
 * to `listening` with side effects to cancel the upstream model response
 * and clear the downstream playback buffer.
 */

export type VoiceState =
  | "idle"
  | "connecting"
  | "greeting"
  | "listening"
  | "responding"
  | "tool_running"
  | "transferring"
  | "ended";

export type VoiceEvent =
  | { type: "stream_connected" }
  | { type: "greeting_done" }
  | { type: "user_speech_started" }
  | { type: "user_speech_committed" }
  | { type: "assistant_response_started" }
  | { type: "assistant_response_done" }
  | { type: "tool_call_started"; name: string; callId: string }
  | { type: "tool_call_finished"; callId: string }
  | { type: "interrupt" }
  | { type: "escalate"; reason?: string }
  | { type: "hangup" }
  | { type: "error"; error: string };

export interface VoiceContext {
  state: VoiceState;
  /** Monotonic counter — useful to invalidate stale audio sent after barge-in. */
  responseEpoch: number;
  /** Active tool call ids awaiting results. */
  pendingTools: Set<string>;
  /** Number of consecutive interrupts (used as a crude liveness signal). */
  interruptCount: number;
  /** Timestamp when the call entered the current state, ms since epoch. */
  enteredAt: number;
  /** Reason for transferring, if any. */
  transferReason?: string;
}

export interface VoiceTransition {
  /** Resulting machine state. */
  next: VoiceContext;
  /** Externally-visible effects the orchestrator should apply. */
  effects: VoiceEffect[];
}

export type VoiceEffect =
  | { type: "send_greeting" }
  | { type: "cancel_response" }
  | { type: "clear_playback" }
  | { type: "begin_response" }
  | { type: "emit_event"; eventType: string; payload: Record<string, unknown> }
  | { type: "transfer"; reason: string }
  | { type: "close_call"; reason: string };

export function initialContext(): VoiceContext {
  return {
    state: "idle",
    responseEpoch: 0,
    pendingTools: new Set(),
    interruptCount: 0,
    enteredAt: Date.now(),
  };
}

/**
 * Apply a single event. Pure-ish: the only mutation is bumping the
 * monotonic counters and copying `pendingTools` into a new Set when needed.
 * Effects are values, not callbacks, so tests can assert the exact effects
 * emitted on every transition.
 */
export function transition(ctx: VoiceContext, event: VoiceEvent): VoiceTransition {
  switch (event.type) {
    case "stream_connected":
      if (ctx.state !== "idle" && ctx.state !== "connecting") return same(ctx);
      return move(ctx, "greeting", [{ type: "send_greeting" }]);

    case "greeting_done":
      if (ctx.state !== "greeting") return same(ctx);
      return move(ctx, "listening", []);

    case "user_speech_started":
      // Barge-in if we're mid-response. Otherwise just record activity.
      if (ctx.state === "responding") {
        return move(
          {
            ...ctx,
            responseEpoch: ctx.responseEpoch + 1,
            interruptCount: ctx.interruptCount + 1,
          },
          "listening",
          [{ type: "cancel_response" }, { type: "clear_playback" }]
        );
      }
      return same(ctx);

    case "user_speech_committed":
      if (ctx.state !== "listening" && ctx.state !== "greeting") return same(ctx);
      return move(ctx, "responding", [{ type: "begin_response" }]);

    case "assistant_response_started":
      if (ctx.state === "listening" || ctx.state === "tool_running") {
        return move(ctx, "responding", []);
      }
      return same(ctx);

    case "assistant_response_done":
      if (ctx.state === "responding") return move(ctx, "listening", []);
      return same(ctx);

    case "tool_call_started": {
      const pendingTools = new Set(ctx.pendingTools);
      pendingTools.add(event.callId);
      return move({ ...ctx, pendingTools }, "tool_running", [
        {
          type: "emit_event",
          eventType: "ai.voice.tool_call_started",
          payload: { name: event.name, callId: event.callId },
        },
      ]);
    }

    case "tool_call_finished": {
      const pendingTools = new Set(ctx.pendingTools);
      pendingTools.delete(event.callId);
      const next: VoiceState = pendingTools.size > 0 ? "tool_running" : "responding";
      return move({ ...ctx, pendingTools }, next, [
        {
          type: "emit_event",
          eventType: "ai.voice.tool_call_finished",
          payload: { callId: event.callId },
        },
      ]);
    }

    case "interrupt":
      // Generic external interrupt (e.g. supervisor button). Always cancels
      // any in-flight response and returns to listening unless we're
      // already done.
      if (ctx.state === "ended" || ctx.state === "transferring") return same(ctx);
      return move(
        {
          ...ctx,
          responseEpoch: ctx.responseEpoch + 1,
          interruptCount: ctx.interruptCount + 1,
        },
        "listening",
        [{ type: "cancel_response" }, { type: "clear_playback" }]
      );

    case "escalate": {
      const reason = event.reason ?? "agent_requested";
      return move({ ...ctx, transferReason: reason }, "transferring", [
        { type: "cancel_response" },
        { type: "clear_playback" },
        { type: "transfer", reason },
        {
          type: "emit_event",
          eventType: "ai.voice.escalated",
          payload: { reason },
        },
      ]);
    }

    case "hangup":
      if (ctx.state === "ended") return same(ctx);
      return move(ctx, "ended", [
        { type: "close_call", reason: "hangup" },
        {
          type: "emit_event",
          eventType: "ai.voice.ended",
          payload: { reason: "hangup", state: ctx.state },
        },
      ]);

    case "error":
      return move(ctx, "ended", [
        { type: "close_call", reason: event.error },
        {
          type: "emit_event",
          eventType: "ai.voice.error",
          payload: { error: event.error, state: ctx.state },
        },
      ]);

    default:
      return same(ctx);
  }
}

function move(
  ctx: VoiceContext,
  next: VoiceState,
  effects: VoiceEffect[]
): VoiceTransition {
  if (ctx.state === next) {
    return { next: ctx, effects };
  }
  return {
    next: { ...ctx, state: next, enteredAt: Date.now() },
    effects,
  };
}

function same(ctx: VoiceContext): VoiceTransition {
  return { next: ctx, effects: [] };
}
