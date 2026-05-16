"use client";

import { useEffect, useRef } from "react";

export type RealtimeEvent =
  | {
      type: "SLOT_UPDATED";
      serviceId: string;
      trainerId?: string;
      startAt: string;
      endAt: string;
      available: boolean;
    }
  | {
      type: "BOOKING_CREATED" | "BOOKING_CANCELLED" | "BOOKING_RESCHEDULED";
      bookingId: string;
      serviceId: string;
      startAt: string;
      endAt: string;
    }
  | {
      type: "WAITLIST_NOTIFIED";
      waitlistId: string;
      serviceId: string;
      startAt: string;
      endAt: string;
    };

interface UseRealtimeOptions {
  /** WebSocket URL, e.g. wss://example.com/realtime. Falls back to SSE if absent. */
  wsUrl?: string;
  /** Channel filter sent to the server after connect. */
  channels?: string[];
  /** Disable connection (e.g. while unauthenticated). */
  enabled?: boolean;
  onEvent: (event: RealtimeEvent) => void;
}

/**
 * Connects to a WebSocket realtime stream with exponential-backoff reconnect.
 * If `wsUrl` is omitted, falls back to a Server-Sent Events stream at
 * `/api/v1/realtime` — both are wire-compatible (JSON-encoded events).
 */
export function useRealtime({
  wsUrl,
  channels,
  enabled = true,
  onEvent,
}: UseRealtimeOptions): { connected: boolean } {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let attempt = 0;
    let cleanup: (() => void) | null = null;

    const dispatch = (raw: string) => {
      try {
        const parsed = JSON.parse(raw) as RealtimeEvent;
        if (parsed && typeof parsed.type === "string") {
          handlerRef.current(parsed);
        }
      } catch {
        // ignore malformed payloads
      }
    };

    const schedule = () => {
      if (cancelled) return;
      const delay = Math.min(30_000, 500 * 2 ** attempt) + Math.random() * 250;
      attempt += 1;
      const timer = setTimeout(connect, delay);
      cleanup = () => clearTimeout(timer);
    };

    const connect = () => {
      if (cancelled) return;
      if (wsUrl && typeof WebSocket !== "undefined") {
        const ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          attempt = 0;
          connectedRef.current = true;
          if (channels?.length) {
            ws.send(JSON.stringify({ type: "subscribe", channels }));
          }
        };
        ws.onmessage = (e: MessageEvent<string>) => dispatch(e.data);
        ws.onclose = () => {
          connectedRef.current = false;
          schedule();
        };
        ws.onerror = () => {
          ws.close();
        };
        cleanup = () => {
          ws.onclose = null;
          ws.onerror = null;
          ws.close();
        };
        return;
      }

      // SSE fallback
      const params = channels?.length
        ? `?channels=${encodeURIComponent(channels.join(","))}`
        : "";
      const es = new EventSource(`/api/v1/realtime${params}`);
      es.onopen = () => {
        attempt = 0;
        connectedRef.current = true;
      };
      es.onmessage = (e) => dispatch(e.data);
      es.onerror = () => {
        connectedRef.current = false;
        es.close();
        schedule();
      };
      cleanup = () => es.close();
    };

    connect();
    return () => {
      cancelled = true;
      cleanup?.();
      connectedRef.current = false;
    };
  }, [wsUrl, enabled, channels?.join(",")]);

  return { connected: connectedRef.current };
}
