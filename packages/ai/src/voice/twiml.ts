/**
 * TwiML response builders for the voice channel.
 *
 * Twilio drives the call by polling these XML responses at every webhook
 * step. Each helper renders a small, single-purpose document — callers
 * compose them in routes/voice.ts. All user-controlled strings are XML
 * escaped because Twilio will read the body verbatim.
 */

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function attr(key: string, value: string | number | boolean): string {
  return ` ${key}="${xmlEscape(String(value))}"`;
}

export interface StreamParam {
  name: string;
  value: string;
}

export interface ConnectStreamOptions {
  /** wss:// URL of our Media Streams endpoint. */
  url: string;
  /** Optional custom parameters carried in the Twilio `start` frame. */
  parameters?: StreamParam[];
  /** Short greeting played before the stream connects. */
  greeting?: string;
  /** Voice for the greeting (Polly.Joanna by default). */
  voice?: string;
}

/**
 * Render TwiML that opens a bidirectional Media Streams socket.
 *
 * Twilio dials our WSS URL and starts shipping mulaw 8 kHz audio frames; the
 * realtime orchestrator answers with synthesized audio frames in the same
 * format. The optional `<Say>` plays before stream connect so the caller is
 * never met with dead air while we open the upstream model session.
 */
export function buildConnectStreamTwiml(opts: ConnectStreamOptions): string {
  const params = (opts.parameters ?? [])
    .map(
      (p) =>
        `<Parameter${attr("name", p.name)}${attr("value", p.value)}/>`
    )
    .join("");

  const voiceAttr = attr("voice", opts.voice ?? "Polly.Joanna");
  const greeting = opts.greeting
    ? `<Say${voiceAttr}>${xmlEscape(opts.greeting)}</Say>`
    : "";

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<Response>`,
    greeting,
    `<Connect>`,
    `<Stream${attr("url", opts.url)}>`,
    params,
    `</Stream>`,
    `</Connect>`,
    `</Response>`,
  ].join("");
}

export interface TransferOptions {
  /** E.164 phone number, SIP URI, or Twilio client identity. */
  target: string;
  /** Spoken bridge message before the dial. */
  announce?: string;
  /** Maximum dial attempt in seconds. */
  timeoutSeconds?: number;
  /** If true, hangs up after the dialed party ends the call. */
  hangupOnStar?: boolean;
  /** Optional callerId override. */
  callerId?: string;
  /** Optional status webhook for the dialed leg. */
  actionUrl?: string;
}

/**
 * Bridge the inbound caller to a human via `<Dial>`. Used by the escalation
 * path when the assistant cannot resolve a request safely.
 */
export function buildTransferTwiml(opts: TransferOptions): string {
  const announce = opts.announce
    ? `<Say${attr("voice", "Polly.Joanna")}>${xmlEscape(opts.announce)}</Say>`
    : "";
  const dialAttrs = [
    opts.timeoutSeconds != null ? attr("timeout", opts.timeoutSeconds) : "",
    opts.callerId ? attr("callerId", opts.callerId) : "",
    opts.actionUrl ? attr("action", opts.actionUrl) : "",
    opts.hangupOnStar ? attr("hangupOnStar", true) : "",
    attr("answerOnBridge", true),
  ].join("");
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<Response>`,
    announce,
    `<Dial${dialAttrs}>${xmlEscape(opts.target)}</Dial>`,
    `</Response>`,
  ].join("");
}

/** Speak a final message and end the call. */
export function buildHangupTwiml(message?: string): string {
  const say = message
    ? `<Say${attr("voice", "Polly.Joanna")}>${xmlEscape(message)}</Say>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${say}<Hangup/></Response>`;
}

/**
 * `<Say>` followed by `<Pause>` — used as a synchronous fallback when the
 * media stream is unavailable (e.g. degraded upstream LLM). The pause keeps
 * the line open so Twilio doesn't immediately end the call.
 */
export function buildSayPauseTwiml(message: string, pauseSeconds = 1): string {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<Response>`,
    `<Say${attr("voice", "Polly.Joanna")}>${xmlEscape(message)}</Say>`,
    `<Pause${attr("length", pauseSeconds)}/>`,
    `</Response>`,
  ].join("");
}

/**
 * Reject inbound calls — for example if the tenant has voice disabled.
 * Twilio bills nothing for rejected calls.
 */
export function buildRejectTwiml(reason: "busy" | "rejected" = "rejected"): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Reject${attr("reason", reason)}/></Response>`;
}

// Re-export the XML escape helper for unit tests.
export const _xml = { escape: xmlEscape };
export { _xml as voiceXml };
