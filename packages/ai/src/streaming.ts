import type { StreamChunk } from "@famm/types";
import { getOpenAIClient, MODELS } from "./client";

interface StreamChatParams {
  tenantId: string;
  userId: string;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  systemPrompt?: string;
  tools?: OpenAI.Chat.ChatCompletionTool[];
  maxTokens?: number;
  onChunk?: (chunk: StreamChunk) => void;
}

import type OpenAI from "openai";

export async function streamChat({
  messages,
  systemPrompt,
  tools,
  maxTokens = 1024,
  onChunk,
}: StreamChatParams): Promise<string> {
  const client = getOpenAIClient();

  const systemMessages: OpenAI.Chat.ChatCompletionMessageParam[] = systemPrompt
    ? [{ role: "system", content: systemPrompt }]
    : [];

  const stream = await client.chat.completions.create({
    model: MODELS.GPT4O,
    messages: [
      ...systemMessages,
      ...messages,
    ] as OpenAI.Chat.ChatCompletionMessageParam[],
    stream: true,
    max_tokens: maxTokens,
    ...(tools?.length ? { tools } : {}),
  });

  let fullContent = "";

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    if (!delta) continue;

    if (delta.content) {
      fullContent += delta.content;
      onChunk?.({ type: "text", content: delta.content });
    }

    if (delta.tool_calls?.length) {
      const toolCall = delta.tool_calls[0];
      if (toolCall?.function?.name) {
        onChunk?.({
          type: "tool_call",
          toolCall: {
            id: toolCall.id ?? "",
            name: toolCall.function.name,
            arguments: {},
          },
        });
      }
    }
  }

  onChunk?.({ type: "done" });
  return fullContent;
}

export async function streamToResponse(
  params: StreamChatParams,
  writer: WritableStreamDefaultWriter<Uint8Array>
): Promise<void> {
  const encoder = new TextEncoder();

  await streamChat({
    ...params,
    onChunk: (chunk) => {
      const data = `data: ${JSON.stringify(chunk)}\n\n`;
      void writer.write(encoder.encode(data));
    },
  });

  await writer.close();
}
