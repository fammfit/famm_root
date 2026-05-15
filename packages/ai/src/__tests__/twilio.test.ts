import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { buildTwimlMessage, validateTwilioSignature } from "../twilio";

const AUTH_TOKEN = "test-token";

function signFor(url: string, params: Record<string, string>): string {
  const sorted = Object.keys(params).sort();
  let data = url;
  for (const k of sorted) data += k + params[k];
  return crypto.createHmac("sha1", AUTH_TOKEN).update(Buffer.from(data, "utf-8")).digest("base64");
}

describe("validateTwilioSignature", () => {
  const url = "https://example.com/api/sms/twilio/inbound";
  const params = { From: "+15555550100", To: "+15555550199", Body: "Hi" };

  it("accepts a correctly signed request", () => {
    const sig = signFor(url, params);
    expect(
      validateTwilioSignature({ authToken: AUTH_TOKEN, url, params, signature: sig })
    ).toBe(true);
  });

  it("rejects when the body is tampered with", () => {
    const sig = signFor(url, params);
    expect(
      validateTwilioSignature({
        authToken: AUTH_TOKEN,
        url,
        params: { ...params, Body: "evil" },
        signature: sig,
      })
    ).toBe(false);
  });

  it("rejects when the URL is different", () => {
    const sig = signFor(url, params);
    expect(
      validateTwilioSignature({
        authToken: AUTH_TOKEN,
        url: "https://example.com/other",
        params,
        signature: sig,
      })
    ).toBe(false);
  });

  it("rejects an obviously invalid signature without throwing", () => {
    expect(
      validateTwilioSignature({
        authToken: AUTH_TOKEN,
        url,
        params,
        signature: "bogus",
      })
    ).toBe(false);
  });
});

describe("buildTwimlMessage", () => {
  it("wraps the body in TwiML and escapes XML", () => {
    const xml = buildTwimlMessage("hello <world> & friends");
    expect(xml).toContain("<Response>");
    expect(xml).toContain("<Message>hello &lt;world&gt; &amp; friends</Message>");
  });
});
