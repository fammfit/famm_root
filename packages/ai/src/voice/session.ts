import { getSessionRedis } from "../session";

/**
 * Voice call session record kept in Redis for the lifetime of the call
 * plus a short window afterwards. Distinct from the conversational
 * `SessionState` because voice sessions are short-lived (one call) and
 * track Twilio identifiers + telephony metadata that the chat path does
 * not need.
 *
 * Keys are namespaced per (tenant, callSid) so two tenants cannot collide
 * even if Twilio recycled a CallSid (it doesn't, but defense-in-depth).
 */

export type VoiceDirection = "inbound" | "outbound";
export type VoiceIntent =
  | "receptionist"
  | "booking"
  | "reminder"
  | "waitlist_fulfillment"
  | "trainer_utilization"
  | "custom";

export interface VoiceSession {
  callSid: string;
  conversationId: string;
  tenantId: string;
  /** May be null until we resolve the caller against the user table. */
  userId: string | null;
  direction: VoiceDirection;
  intent: VoiceIntent;
  fromNumber: string;
  toNumber: string;
  /** Optional pre-call brief for outbound calls (e.g. waitlist details). */
  brief?: string;
  /** Tenant timezone for downstream rendering. */
  timezone: string;
  currency: string;
  startedAt: string;
  endedAt?: string;
  /** Number of streamed audio frames seen — useful for analytics & abuse detection. */
  framesIn: number;
  framesOut: number;
  /** Set when the assistant decided to escalate. */
  transferTarget?: string;
  transferReason?: string;
}

const TTL_SECONDS = 60 * 60 * 6; // 6 hours

function voiceKey(tenantId: string, callSid: string): string {
  return `ai:voice:${tenantId}:${callSid}`;
}

export async function saveVoiceSession(session: VoiceSession): Promise<void> {
  await getSessionRedis().set(
    voiceKey(session.tenantId, session.callSid),
    JSON.stringify(session),
    "EX",
    TTL_SECONDS
  );
}

export async function loadVoiceSession(
  tenantId: string,
  callSid: string
): Promise<VoiceSession | null> {
  const raw = await getSessionRedis().get(voiceKey(tenantId, callSid));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as VoiceSession;
    // Defense: refuse cross-tenant reads even if the caller passed the wrong key.
    if (parsed.tenantId !== tenantId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function deleteVoiceSession(
  tenantId: string,
  callSid: string
): Promise<void> {
  await getSessionRedis().del(voiceKey(tenantId, callSid));
}

export const VOICE_SESSION_LIMITS = {
  ttlSeconds: TTL_SECONDS,
};
