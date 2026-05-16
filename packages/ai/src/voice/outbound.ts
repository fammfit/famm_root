/**
 * Outbound voice orchestration.
 *
 * The platform places outbound calls for three workflows:
 *   • appointment reminders ("24-hour confirm" calls)
 *   • waitlist fulfillment ("a spot opened — would you like it?")
 *   • trainer utilization ("low-bookings nudge to a trainer")
 *
 * We dial via the Twilio REST API and point Twilio at our /voice/outbound
 * webhook, which returns `<Connect><Stream>` TwiML — so once the recipient
 * picks up, the same realtime bridge that powers inbound calls takes over.
 *
 * No Twilio SDK is used: a small `fetch` wrapper keeps deps minimal and
 * makes it trivial to mock in tests.
 */

import type { VoiceIntent } from "./session";

export interface TwilioClientOptions {
  accountSid: string;
  authToken: string;
  /** Caller-id used as `From`. Must be a verified Twilio number. */
  callerId: string;
  /** Override the REST base URL (used by tests). */
  baseUrl?: string;
  /** Override the HTTP fetcher (used by tests). */
  fetcher?: typeof fetch;
}

export interface PlaceCallInput {
  /** E.164 destination. */
  to: string;
  /** Public HTTPS URL for the Twilio `Url` webhook. */
  webhookUrl: string;
  /** Public HTTPS URL for the status callback. */
  statusCallbackUrl?: string;
  /** Optional record-the-call flag. */
  record?: boolean;
  /** Max ring time before giving up. */
  timeout?: number;
  /** Idempotency key — Twilio rejects duplicate Sids; we pass it as a `applicationSid`-style header. */
  idempotencyKey?: string;
  /** Free-form metadata persisted as the call's `friendly_name`. */
  label?: string;
}

export interface PlacedCall {
  sid: string;
  to: string;
  from: string;
  status: string;
}

export class TwilioVoiceClient {
  private readonly base: string;
  private readonly fetcher: typeof fetch;

  constructor(private readonly opts: TwilioClientOptions) {
    this.base =
      opts.baseUrl ??
      `https://api.twilio.com/2010-04-01/Accounts/${opts.accountSid}/Calls.json`;
    this.fetcher = opts.fetcher ?? fetch;
  }

  /**
   * Redirect an in-progress call to a new TwiML URL. Used by the escalation
   * path to swap from `<Connect><Stream>` to `<Dial>` mid-call.
   */
  async updateCall(callSid: string, twimlUrl: string): Promise<void> {
    const url = this.base.replace(
      /\/Calls\.json$/,
      `/Calls/${encodeURIComponent(callSid)}.json`
    );
    const form = new URLSearchParams();
    form.set("Url", twimlUrl);
    form.set("Method", "POST");
    const response = await this.fetcher(url, {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${this.opts.accountSid}:${this.opts.authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    if (!response.ok) {
      const text = await safeText(response);
      throw new TwilioApiError(response.status, text || response.statusText);
    }
  }

  async placeCall(input: PlaceCallInput): Promise<PlacedCall> {
    const form = new URLSearchParams();
    form.set("To", input.to);
    form.set("From", this.opts.callerId);
    form.set("Url", input.webhookUrl);
    form.set("Method", "POST");
    if (input.statusCallbackUrl) {
      form.set("StatusCallback", input.statusCallbackUrl);
      form.set("StatusCallbackMethod", "POST");
      form.set("StatusCallbackEvent", "initiated");
      form.append("StatusCallbackEvent", "ringing");
      form.append("StatusCallbackEvent", "answered");
      form.append("StatusCallbackEvent", "completed");
    }
    if (input.record) form.set("Record", "true");
    if (input.timeout != null) form.set("Timeout", String(input.timeout));

    const headers: Record<string, string> = {
      Authorization:
        "Basic " +
        Buffer.from(`${this.opts.accountSid}:${this.opts.authToken}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    };
    if (input.idempotencyKey) {
      // Twilio honors the I-Twilio-Idempotency-Token header for retries.
      headers["I-Twilio-Idempotency-Token"] = input.idempotencyKey;
    }

    const response = await this.fetcher(this.base, {
      method: "POST",
      headers,
      body: form.toString(),
    });

    if (!response.ok) {
      const text = await safeText(response);
      throw new TwilioApiError(response.status, text || response.statusText);
    }

    const json = (await response.json()) as {
      sid?: string;
      to?: string;
      from?: string;
      status?: string;
    };
    if (!json.sid) {
      throw new TwilioApiError(500, "Twilio response missing sid");
    }
    return {
      sid: json.sid,
      to: json.to ?? input.to,
      from: json.from ?? this.opts.callerId,
      status: json.status ?? "queued",
    };
  }
}

export class TwilioApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(`Twilio API error ${status}: ${message}`);
    this.name = "TwilioApiError";
  }
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

// ── high-level orchestrations ────────────────────────────────────────────────

export interface OutboundCallSpec {
  tenantId: string;
  userId: string;
  to: string;
  intent: VoiceIntent;
  /** Short structured brief read by the model on session start. */
  brief: string;
  /** Optional label persisted on the call record. */
  label?: string;
}

export interface OutboundDialerDeps {
  twilio: TwilioVoiceClient;
  /** Public base URL of the API (e.g. https://api.example.com). */
  publicApiUrl: string;
  /** Optional override of the inbound voice webhook path. */
  webhookPath?: string;
  /** Optional override of the status callback path. */
  statusPath?: string;
  /** Optional event emitter. */
  emitEvent?: (event: {
    type: string;
    tenantId: string;
    payload: Record<string, unknown>;
  }) => Promise<void>;
}

/**
 * Build the public webhook URL Twilio will hit when the call connects.
 * The intent + brief travel as query parameters and are echoed back to us
 * in the webhook body, where they end up as <Stream><Parameter> entries on
 * the TwiML response.
 */
function buildWebhookUrl(deps: OutboundDialerDeps, spec: OutboundCallSpec): string {
  const path = deps.webhookPath ?? "/api/voice/outbound";
  const url = new URL(path, deps.publicApiUrl);
  url.searchParams.set("tenantId", spec.tenantId);
  url.searchParams.set("userId", spec.userId);
  url.searchParams.set("intent", spec.intent);
  // The brief travels base64-encoded so that pretty-much-any characters
  // survive Twilio's URL re-encoding.
  url.searchParams.set("brief", Buffer.from(spec.brief, "utf-8").toString("base64"));
  return url.toString();
}

function buildStatusUrl(deps: OutboundDialerDeps): string {
  const path = deps.statusPath ?? "/api/voice/status";
  return new URL(path, deps.publicApiUrl).toString();
}

/**
 * Place a single outbound call. The returned `PlacedCall.sid` is the
 * Twilio CallSid — store it on whatever upstream record (reminder row,
 * waitlist entry, trainer nudge) triggered the call.
 */
export async function placeOutboundCall(
  spec: OutboundCallSpec,
  deps: OutboundDialerDeps
): Promise<PlacedCall> {
  const call = await deps.twilio.placeCall({
    to: spec.to,
    webhookUrl: buildWebhookUrl(deps, spec),
    statusCallbackUrl: buildStatusUrl(deps),
    timeout: 25,
    idempotencyKey: `outbound:${spec.tenantId}:${spec.intent}:${spec.userId}:${Date.now()}`,
    ...(spec.label ? { label: spec.label } : {}),
  });

  await deps.emitEvent?.({
    type: "ai.voice.outbound_placed",
    tenantId: spec.tenantId,
    payload: {
      callSid: call.sid,
      to: spec.to,
      intent: spec.intent,
      userId: spec.userId,
    },
  });

  return call;
}

// ── intent-specific brief builders ──────────────────────────────────────────

export function reminderBrief(args: {
  serviceName: string;
  trainerName?: string;
  startAt: string;
  timezone: string;
}): string {
  const trainer = args.trainerName ? ` with ${args.trainerName}` : "";
  return (
    `Goal: confirm an upcoming appointment for ${args.serviceName}${trainer} ` +
    `at ${args.startAt} (${args.timezone}). ` +
    `Offer to reschedule or cancel if the caller asks. ` +
    `If reschedule is requested, propose two alternate times via the recommend_trainers / availability tools.`
  );
}

export function waitlistBrief(args: {
  serviceName: string;
  startAt: string;
  timezone: string;
  holdMinutes: number;
}): string {
  return (
    `Goal: offer a newly available slot for ${args.serviceName} at ` +
    `${args.startAt} (${args.timezone}). The slot is held for ${args.holdMinutes} minutes. ` +
    `If the caller accepts, call create_booking immediately. ` +
    `If they decline, thank them and mention we'll keep them on the waitlist.`
  );
}

export function trainerUtilizationBrief(args: {
  trainerName: string;
  utilizationPercent: number;
  weekStarting: string;
}): string {
  return (
    `Goal: check in with trainer ${args.trainerName} about a low-utilization week ` +
    `(${args.utilizationPercent}% booked, starting ${args.weekStarting}). ` +
    `Ask whether they would like us to (a) add availability, (b) run a promo, ` +
    `or (c) reassign clients. Use trigger_workflow with payload describing the chosen option.`
  );
}
