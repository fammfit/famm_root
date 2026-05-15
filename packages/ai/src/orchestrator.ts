import { prisma } from "@famm/db";
import type OpenAI from "openai";
import type { StreamChunk, AiToolCall, AiToolResult } from "@famm/types";

import { getOpenAIClient, MODELS } from "./client";
import { appendTurn, loadOrCreate, loadSession, saveSession } from "./session";
import { loadUserContext, formatContextBlock } from "./context";
import { buildSystemPrompt } from "./prompts";
import { OPENAI_TOOLS, executeAction, type ActionContext } from "./actions";
import type {
  ConversationActor,
  OrchestratorInput,
  OrchestratorResult,
  SessionState,
} from "./types";

const MAX_TOOL_ROUNDS = 4;

/**
 * Shared orchestration entry point.
 *
 * Channel-agnostic: callers (SMS webhook, web SSE, WebSocket handler) all
 * funnel through this function. Per-channel formatting differences are
 * isolated to the system prompt — the action surface and state model are
 * identical across channels.
 */
export async function processMessage(
  input: OrchestratorInput,
  deps: Partial<ActionContext> = {}
): Promise<OrchestratorResult> {
  const { actor, channel, sessionKey, message } = input;

  const conversationId = await resolveConversationId({
    actor,
    channel,
    sessionKey,
  });

  let state = await loadOrCreate({
    tenantId: actor.tenantId,
    userId: actor.userId,
    channel,
    key: sessionKey,
    conversationId,
  });

  state = appendTurn(state, {
    role: "user",
    content: message,
    createdAt: new Date().toISOString(),
  });

  const userCtx = await loadUserContext(actor);
  const tenantSettings = await prisma.tenantSettings.findUnique({
    where: { tenantId: actor.tenantId },
    select: { aiEnabled: true, aiPersonaName: true, aiSystemPrompt: true },
  });

  if (tenantSettings && tenantSettings.aiEnabled === false) {
    throw new Error("AI is disabled for this tenant");
  }

  const systemPrompt = buildSystemPrompt({
    actor,
    channel,
    tenantPersona: tenantSettings?.aiPersonaName,
    ...(tenantSettings?.aiSystemPrompt ? { tenantSystemPrompt: tenantSettings.aiSystemPrompt } : {}),
    contextBlock: formatContextBlock(userCtx),
  });

  const actionCtx: ActionContext = {
    actor,
    ...(deps.paymentsClient ? { paymentsClient: deps.paymentsClient } : {}),
    ...(deps.publishEvent ? { publishEvent: deps.publishEvent } : {}),
  };

  const { reply, toolResults } = await runChatLoop({
    systemPrompt,
    state,
    actionCtx,
    onChunk: input.onChunk,
    channel,
  });

  state = appendTurn(state, {
    role: "assistant",
    content: reply,
    createdAt: new Date().toISOString(),
  });

  await saveSession(state);
  await persistTurn({ state, userMessage: message, assistantReply: reply, toolResults });

  return { conversationId, reply, toolResults };
}

async function resolveConversationId(args: {
  actor: ConversationActor;
  channel: OrchestratorInput["channel"];
  sessionKey: string;
}): Promise<string> {
  // For web, the caller typically passes a conversationId as sessionKey.
  // For SMS, the sessionKey is the phone number; reuse the active session if
  // any, or create a new conversation row.
  const existing = await loadSession({
    tenantId: args.actor.tenantId,
    userId: args.actor.userId,
    channel: args.channel,
    key: args.sessionKey,
  });
  if (existing) return existing.conversationId;

  const created = await prisma.aiConversation.create({
    data: {
      tenantId: args.actor.tenantId,
      userId: args.actor.userId,
      channel: args.channel,
      metadata: { sessionKey: args.sessionKey },
    },
    select: { id: true },
  });
  return created.id;
}

async function runChatLoop(args: {
  systemPrompt: string;
  state: SessionState;
  actionCtx: ActionContext;
  channel: OrchestratorInput["channel"];
  onChunk?: (c: StreamChunk) => void;
}): Promise<{ reply: string; toolResults: AiToolResult[] }> {
  const client = getOpenAIClient();
  const toolResults: AiToolResult[] = [];

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: args.systemPrompt },
    ...(args.state.summary
      ? [{ role: "system" as const, content: `Prior conversation summary: ${args.state.summary}` }]
      : []),
    ...args.state.turns.map(toOpenAiMessage),
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const stream = await client.chat.completions.create({
      model: args.channel === "sms" ? MODELS.GPT4O_MINI : MODELS.GPT4O,
      messages,
      tools: OPENAI_TOOLS,
      stream: true,
      temperature: 0.4,
      max_tokens: args.channel === "sms" ? 180 : 1024,
    });

    let textBuffer = "";
    const toolCallAccum = new Map<
      number,
      { id: string; name: string; argsText: string }
    >();

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        textBuffer += delta.content;
        args.onChunk?.({ type: "text", content: delta.content });
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const slot = toolCallAccum.get(tc.index) ?? {
            id: tc.id ?? "",
            name: tc.function?.name ?? "",
            argsText: "",
          };
          if (tc.id) slot.id = tc.id;
          if (tc.function?.name) slot.name = tc.function.name;
          if (tc.function?.arguments) slot.argsText += tc.function.arguments;
          toolCallAccum.set(tc.index, slot);
        }
      }
    }

    const pendingCalls: AiToolCall[] = [...toolCallAccum.values()].map((c) => ({
      id: c.id,
      name: c.name,
      arguments: safeJson(c.argsText),
    }));

    if (pendingCalls.length === 0) {
      args.onChunk?.({ type: "done" });
      return { reply: textBuffer, toolResults };
    }

    // Append the assistant message that requested the tools.
    messages.push({
      role: "assistant",
      content: textBuffer || null,
      tool_calls: pendingCalls.map((c) => ({
        id: c.id,
        type: "function",
        function: { name: c.name, arguments: JSON.stringify(c.arguments) },
      })),
    });

    // Execute tools server-side and feed results back.
    for (const call of pendingCalls) {
      args.onChunk?.({ type: "tool_call", toolCall: call });
      const result = await executeAction(call, args.actionCtx);
      toolResults.push(result);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result.content,
      });
    }
  }

  // Tool-call budget exhausted — fall back to a plain completion.
  args.onChunk?.({
    type: "error",
    error: "Reached tool-call budget without a final answer",
  });
  return { reply: "I'm having trouble completing that request. Please try again.", toolResults };
}

function toOpenAiMessage(t: SessionState["turns"][number]): OpenAI.Chat.ChatCompletionMessageParam {
  if (t.role === "tool") {
    return {
      role: "tool",
      tool_call_id: t.toolCallId ?? "unknown",
      content: t.content,
    };
  }
  if (t.role === "assistant" && t.toolCalls?.length) {
    return {
      role: "assistant",
      content: t.content || null,
      tool_calls: t.toolCalls.map((c) => ({
        id: c.id,
        type: "function",
        function: { name: c.name, arguments: JSON.stringify(c.arguments) },
      })),
    };
  }
  return { role: t.role, content: t.content } as OpenAI.Chat.ChatCompletionMessageParam;
}

function safeJson(text: string): Record<string, unknown> {
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function persistTurn(args: {
  state: SessionState;
  userMessage: string;
  assistantReply: string;
  toolResults: AiToolResult[];
}): Promise<void> {
  // Persist user + assistant messages so the conversation has a durable
  // record beyond the Redis session window. The Redis cache is for working
  // memory; Postgres is the source of truth.
  await prisma.aiMessage.createMany({
    data: [
      {
        conversationId: args.state.conversationId,
        role: "user",
        content: args.userMessage,
      },
      {
        conversationId: args.state.conversationId,
        role: "assistant",
        content: args.assistantReply,
        ...(args.toolResults.length
          ? {
              toolResults: args.toolResults.map((r) => ({
                toolCallId: r.toolCallId,
                content: r.content,
                isError: r.isError ?? false,
              })),
            }
          : {}),
      },
    ],
  });
}
