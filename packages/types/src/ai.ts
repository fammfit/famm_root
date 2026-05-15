export type AiRole = "user" | "assistant" | "system" | "tool";
export type AiChannel = "web" | "sms" | "voice";

export interface AiMessage {
  id: string;
  conversationId: string;
  role: AiRole;
  content: string;
  toolCalls?: AiToolCall[];
  toolResults?: AiToolResult[];
  inputTokens?: number;
  outputTokens?: number;
  createdAt: string;
}

export interface AiConversation {
  id: string;
  tenantId: string;
  userId: string;
  channel: AiChannel;
  messages: AiMessage[];
  summary?: string;
  metadata?: Record<string, unknown>;
  startedAt: string;
  endedAt?: string;
}

export interface AiMemory {
  id: string;
  tenantId: string;
  userId: string;
  content: string;
  memoryType: string;
  importance: number;
  expiresAt?: string;
  createdAt: string;
}

export interface AiToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AiToolResult {
  toolCallId: string;
  content: string;
  isError?: boolean;
}

export interface StreamChunk {
  type: "text" | "tool_call" | "done" | "error";
  content?: string;
  toolCall?: AiToolCall;
  error?: string;
}
