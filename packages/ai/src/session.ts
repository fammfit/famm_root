import { Redis } from "ioredis";
import type { AiChannel } from "@famm/types";
import type { ConversationTurn, SessionState } from "./types";

/**
 * Redis-backed conversation session store.
 *
 * Keys are scoped by tenant *and* user to guarantee per-user isolation —
 * a session for tenant A cannot be read by tenant B, and one user's history
 * cannot leak into another user's prompt even if they share a channel key.
 */

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days idle expiry
const MAX_TURNS_IN_WINDOW = 24;

let _redis: Redis | null = null;

export function getSessionRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(process.env["REDIS_URL"] ?? "redis://localhost:6379", {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
    });
  }
  return _redis;
}

/** For tests. */
export function setSessionRedis(r: Redis): void {
  _redis = r;
}

function sessionKey(args: {
  tenantId: string;
  userId: string;
  channel: AiChannel;
  key: string;
}): string {
  return `ai:session:${args.tenantId}:${args.userId}:${args.channel}:${args.key}`;
}

export async function loadSession(args: {
  tenantId: string;
  userId: string;
  channel: AiChannel;
  key: string;
}): Promise<SessionState | null> {
  const raw = await getSessionRedis().get(sessionKey(args));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionState;
    if (parsed.tenantId !== args.tenantId || parsed.userId !== args.userId) {
      // Defensive: refuse to return a session that does not match the requester.
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveSession(state: SessionState): Promise<void> {
  const key = sessionKey({
    tenantId: state.tenantId,
    userId: state.userId,
    channel: state.channel,
    // The session key suffix is implicit in callers; derive a deterministic
    // suffix from the conversation id so callers always recompute via
    // `loadOrCreate`. Saving uses the same composition.
    key: state.conversationId,
  });
  await getSessionRedis().set(key, JSON.stringify(state), "EX", SESSION_TTL_SECONDS);
}

export async function loadOrCreate(args: {
  tenantId: string;
  userId: string;
  channel: AiChannel;
  /** Stable per-channel identifier (phone number, conversation id, etc). */
  key: string;
  conversationId: string;
}): Promise<SessionState> {
  const existing = await loadSession({
    tenantId: args.tenantId,
    userId: args.userId,
    channel: args.channel,
    key: args.conversationId,
  });
  if (existing) return existing;

  const now = new Date().toISOString();
  return {
    conversationId: args.conversationId,
    channel: args.channel,
    tenantId: args.tenantId,
    userId: args.userId,
    turns: [],
    startedAt: now,
    updatedAt: now,
  };
}

export function appendTurn(state: SessionState, turn: ConversationTurn): SessionState {
  const turns = [...state.turns, turn];
  // Trim oldest turns when the window is exceeded. The summary field is
  // where compacted history lives; producing it is the caller's job.
  const trimmed = turns.length > MAX_TURNS_IN_WINDOW
    ? turns.slice(turns.length - MAX_TURNS_IN_WINDOW)
    : turns;
  return {
    ...state,
    turns: trimmed,
    updatedAt: new Date().toISOString(),
  };
}

export const SESSION_LIMITS = {
  ttlSeconds: SESSION_TTL_SECONDS,
  maxTurns: MAX_TURNS_IN_WINDOW,
};
