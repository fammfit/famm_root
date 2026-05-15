import { describe, expect, it } from "vitest";
import { initialContext, transition } from "../voice/state";
import type { VoiceContext, VoiceEffect } from "../voice/state";

function run(ctx: VoiceContext, events: Parameters<typeof transition>[1][]): {
  ctx: VoiceContext;
  effects: VoiceEffect[];
} {
  let cur = ctx;
  const allEffects: VoiceEffect[] = [];
  for (const e of events) {
    const r = transition(cur, e);
    cur = r.next;
    allEffects.push(...r.effects);
  }
  return { ctx: cur, effects: allEffects };
}

describe("voice state machine", () => {
  it("walks through the happy path", () => {
    const result = run(initialContext(), [
      { type: "stream_connected" },
      { type: "greeting_done" },
      { type: "user_speech_started" },
      { type: "user_speech_committed" },
      { type: "assistant_response_started" },
      { type: "assistant_response_done" },
    ]);

    expect(result.ctx.state).toBe("listening");
    // The greeting effect should have been emitted exactly once at the
    // start of the call.
    expect(result.effects.filter((e) => e.type === "send_greeting")).toHaveLength(1);
  });

  it("treats user_speech_started during a response as a barge-in", () => {
    let ctx = initialContext();
    ctx = transition(ctx, { type: "stream_connected" }).next;
    ctx = transition(ctx, { type: "greeting_done" }).next;
    ctx = transition(ctx, { type: "user_speech_started" }).next;
    ctx = transition(ctx, { type: "user_speech_committed" }).next;
    ctx = transition(ctx, { type: "assistant_response_started" }).next;

    expect(ctx.state).toBe("responding");
    const initialEpoch = ctx.responseEpoch;

    const r = transition(ctx, { type: "user_speech_started" });
    expect(r.next.state).toBe("listening");
    expect(r.next.responseEpoch).toBe(initialEpoch + 1);
    expect(r.next.interruptCount).toBe(1);
    expect(r.effects.some((e) => e.type === "cancel_response")).toBe(true);
    expect(r.effects.some((e) => e.type === "clear_playback")).toBe(true);
  });

  it("returns to responding only after all pending tools finish", () => {
    let ctx = initialContext();
    ctx = transition(ctx, { type: "stream_connected" }).next;
    ctx = transition(ctx, { type: "greeting_done" }).next;
    ctx = transition(ctx, { type: "user_speech_committed" }).next;

    ctx = transition(ctx, { type: "tool_call_started", name: "x", callId: "c1" }).next;
    ctx = transition(ctx, { type: "tool_call_started", name: "y", callId: "c2" }).next;
    expect(ctx.state).toBe("tool_running");
    expect(ctx.pendingTools.size).toBe(2);

    ctx = transition(ctx, { type: "tool_call_finished", callId: "c1" }).next;
    expect(ctx.state).toBe("tool_running");

    ctx = transition(ctx, { type: "tool_call_finished", callId: "c2" }).next;
    expect(ctx.state).toBe("responding");
  });

  it("hangup transitions from any active state and emits close_call", () => {
    let ctx = initialContext();
    ctx = transition(ctx, { type: "stream_connected" }).next;
    const r = transition(ctx, { type: "hangup" });
    expect(r.next.state).toBe("ended");
    expect(r.effects.some((e) => e.type === "close_call")).toBe(true);
  });

  it("escalate cancels in-flight response and emits transfer", () => {
    let ctx = initialContext();
    ctx = transition(ctx, { type: "stream_connected" }).next;
    const r = transition(ctx, { type: "escalate", reason: "complex_complaint" });
    expect(r.next.state).toBe("transferring");
    expect(r.next.transferReason).toBe("complex_complaint");
    expect(r.effects.some((e) => e.type === "cancel_response")).toBe(true);
    const transfer = r.effects.find((e) => e.type === "transfer");
    expect(transfer && transfer.type === "transfer" && transfer.reason).toBe("complex_complaint");
  });

  it("ignores events that don't apply to the current state", () => {
    const ctx = initialContext();
    const r = transition(ctx, { type: "user_speech_committed" });
    expect(r.next.state).toBe("idle");
    expect(r.effects).toEqual([]);
  });
});
