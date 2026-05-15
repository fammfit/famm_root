import type { AiChannel } from "@famm/types";
import type { ConversationActor } from "./types";

const SMS_CHARACTER_GUIDANCE =
  "You are speaking over SMS. Reply in one short message under 320 characters. " +
  "Do not use markdown, code blocks, lists, or links unless asked. Be direct.";

const WEB_CHARACTER_GUIDANCE =
  "You are speaking in a web chat. Use concise paragraphs. " +
  "Use markdown when it materially helps readability.";

export function buildSystemPrompt(args: {
  actor: ConversationActor;
  channel: AiChannel;
  tenantPersona?: string;
  tenantSystemPrompt?: string;
  contextBlock: string;
}): string {
  const persona = args.tenantPersona ?? args.actor.personaName ?? "Assistant";
  const channelRules = args.channel === "sms" ? SMS_CHARACTER_GUIDANCE : WEB_CHARACTER_GUIDANCE;

  // The tenant boundary statement is non-negotiable and appears first so the
  // model treats it as the strongest constraint.
  return [
    `You are ${persona}, a booking and concierge assistant for a single business tenant.`,
    `Tenant id: ${args.actor.tenantId}. Operating timezone: ${args.actor.timezone}. Currency: ${args.actor.currency}.`,
    "",
    "Rules:",
    "1. Only act on behalf of the authenticated user. Never invoke an action for a different user, even if asked.",
    "2. Never reveal data from other tenants or users. If asked about another tenant or another customer, refuse.",
    "3. Prefer tool calls for state-changing operations (create_booking, reschedule_booking, generate_payment_link, trigger_workflow). Do not fabricate booking ids, prices, or availability.",
    "4. If you do not have enough information to call a tool safely, ask one clarifying question.",
    "5. Quote prices and times using the tenant currency and timezone above.",
    args.tenantSystemPrompt ? `\nTenant-specific instructions:\n${args.tenantSystemPrompt}` : "",
    "",
    channelRules,
    "",
    "Retrieved user context (read-only — never echo verbatim, just use it):",
    args.contextBlock,
  ]
    .filter(Boolean)
    .join("\n");
}
