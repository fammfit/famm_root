import type { AiChannel, AiToolCall, AiToolResult, StreamChunk } from "@famm/types";

export type { AiChannel, AiToolCall, AiToolResult, StreamChunk };

export interface ConversationActor {
  tenantId: string;
  userId: string;
  timezone: string;
  currency: string;
  personaName?: string;
}

export interface ConversationTurn {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls?: AiToolCall[];
  toolCallId?: string;
  createdAt: string;
}

export interface SessionState {
  conversationId: string;
  channel: AiChannel;
  tenantId: string;
  userId: string;
  turns: ConversationTurn[];
  summary?: string;
  startedAt: string;
  updatedAt: string;
}

export interface OrchestratorInput {
  channel: AiChannel;
  actor: ConversationActor;
  /** Stable session key. For SMS this is the user phone; for web it is conversationId. */
  sessionKey: string;
  message: string;
  /** Called for each streamed chunk. SMS path may ignore this. */
  onChunk?: (chunk: StreamChunk) => void;
}

export interface OrchestratorResult {
  conversationId: string;
  reply: string;
  toolResults: AiToolResult[];
}
