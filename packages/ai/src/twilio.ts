import crypto from "node:crypto";

/**
 * Twilio request signature verification.
 *
 * Reference: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 *
 * Twilio signs `<full_url> + sorted_concat(form_params)` with HMAC-SHA1 using
 * the auth token, then base64-encodes the digest. The verification is
 * timing-safe.
 */
export function validateTwilioSignature(args: {
  authToken: string;
  url: string;
  params: Record<string, string>;
  signature: string;
}): boolean {
  const sortedKeys = Object.keys(args.params).sort();
  let data = args.url;
  for (const k of sortedKeys) {
    data += k + args.params[k];
  }
  const expected = crypto
    .createHmac("sha1", args.authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(args.signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Render a TwiML response that returns a single SMS message.
 * Twilio expects an XML document with content-type application/xml.
 */
export function buildTwimlMessage(body: string): string {
  // Escape characters that would break XML.
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
}
