"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { ChatClient, sendViaSse } from "../../lib/chat-client";
import type { StreamChunk } from "@famm/types";

interface Msg {
  id: string;
  role: "user" | "assistant" | "tool";
  text: string;
  pending?: boolean;
  toolName?: string;
}

interface Props {
  apiUrl: string;
  token: string;
  initialConversationId?: string;
}

export default function ChatWindow({ apiUrl, token, initialConversationId }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [transport, setTransport] = useState<"ws" | "sse">("ws");
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const clientRef = useRef<ChatClient | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const c = new ChatClient({
      apiUrl,
      token,
      ...(conversationId ? { conversationId } : {}),
      onSession: (id) => {
        setConnected(true);
        setConversationId(id);
      },
      onChunk: handleChunk,
      onClose: () => setConnected(false),
    });
    try {
      c.connect();
      clientRef.current = c;
    } catch {
      setTransport("sse");
    }
    return () => c.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl, token]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  function handleChunk(chunk: StreamChunk): void {
    if (chunk.type === "text" && chunk.content) {
      setMessages((prev) => appendAssistantText(prev, chunk.content!));
    } else if (chunk.type === "tool_call" && chunk.toolCall) {
      setMessages((prev) => [
        ...prev,
        {
          id: `tool_${chunk.toolCall!.id || Date.now()}`,
          role: "tool",
          text: `Running ${chunk.toolCall!.name}…`,
          toolName: chunk.toolCall!.name,
        },
      ]);
    } else if (chunk.type === "done") {
      setBusy(false);
      setMessages((prev) => prev.map((m) => ({ ...m, pending: false })));
    } else if (chunk.type === "error") {
      setBusy(false);
      setMessages((prev) => [
        ...prev,
        { id: `err_${Date.now()}`, role: "assistant", text: `Error: ${chunk.error}` },
      ]);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    setMessages((prev) => [
      ...prev,
      { id: `u_${Date.now()}`, role: "user", text },
      { id: `a_${Date.now()}`, role: "assistant", text: "", pending: true },
    ]);

    if (transport === "ws" && connected && clientRef.current) {
      try {
        clientRef.current.send(text);
      } catch {
        setTransport("sse");
        await sendViaSse({
          apiUrl,
          token,
          ...(conversationId ? { conversationId } : {}),
          message: text,
          onChunk: handleChunk,
        });
      }
    } else {
      await sendViaSse({
        apiUrl,
        token,
        ...(conversationId ? { conversationId } : {}),
        message: text,
        onChunk: handleChunk,
      });
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-500 text-center mt-12">
            Ask me to book a session, reschedule, or find a trainer.
          </p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} />
        ))}
      </div>
      <form
        className="flex border-t bg-white p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          className="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Type a message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
        />
        <button
          type="submit"
          className="ml-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:bg-blue-300"
          disabled={busy || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  const isTool = msg.role === "tool";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap",
          isUser && "bg-blue-600 text-white",
          !isUser && !isTool && "bg-gray-100 text-gray-900",
          isTool && "bg-amber-50 text-amber-900 text-xs italic"
        )}
      >
        {msg.text || (msg.pending ? "…" : "")}
      </div>
    </div>
  );
}

function appendAssistantText(prev: Msg[], chunk: string): Msg[] {
  const next = [...prev];
  for (let i = next.length - 1; i >= 0; i--) {
    if (next[i]?.role === "assistant" && next[i]?.pending) {
      next[i] = { ...next[i]!, text: (next[i]!.text || "") + chunk };
      return next;
    }
  }
  next.push({ id: `a_${Date.now()}`, role: "assistant", text: chunk, pending: true });
  return next;
}
