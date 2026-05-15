import { describe, expect, it } from "vitest";
import {
  buildConnectStreamTwiml,
  buildTransferTwiml,
  buildHangupTwiml,
  buildSayPauseTwiml,
  buildRejectTwiml,
  voiceXml,
} from "../voice/twiml";

describe("voice TwiML builders", () => {
  it("escapes XML in greetings", () => {
    const twiml = buildConnectStreamTwiml({
      url: "wss://example.com/voice/stream?token=abc",
      greeting: 'Hello & "welcome" <user>',
    });
    expect(twiml).toContain("&amp;");
    expect(twiml).toContain("&quot;");
    expect(twiml).toContain("&lt;user&gt;");
    expect(twiml).not.toMatch(/Hello & "welcome"/);
  });

  it("emits a <Connect><Stream> with custom parameters", () => {
    const twiml = buildConnectStreamTwiml({
      url: "wss://example.com/voice/stream",
      parameters: [
        { name: "tenantId", value: "t1" },
        { name: "callSid", value: "CA123" },
      ],
    });
    expect(twiml).toContain("<Connect>");
    expect(twiml).toContain('url="wss://example.com/voice/stream"');
    expect(twiml).toContain('name="tenantId"');
    expect(twiml).toContain('value="t1"');
    expect(twiml).toContain('name="callSid"');
  });

  it("emits a <Dial> for transfers with safe attribute values", () => {
    const twiml = buildTransferTwiml({
      target: "+15555550199",
      announce: "Hold on a moment.",
      timeoutSeconds: 20,
      hangupOnStar: true,
      callerId: "+15555550100",
      actionUrl: "https://example.com/voice/status",
    });
    expect(twiml).toContain('<Dial');
    expect(twiml).toContain("+15555550199");
    expect(twiml).toContain('timeout="20"');
    expect(twiml).toContain('hangupOnStar="true"');
    expect(twiml).toContain('callerId="+15555550100"');
    expect(twiml).toContain('answerOnBridge="true"');
    expect(twiml).toContain("Hold on a moment.");
  });

  it("renders hangup and reject documents", () => {
    expect(buildHangupTwiml("Goodbye.")).toContain("<Hangup/>");
    expect(buildHangupTwiml("Goodbye.")).toContain("Goodbye.");
    expect(buildHangupTwiml()).not.toContain("<Say");

    const rejected = buildRejectTwiml("busy");
    expect(rejected).toContain('<Reject reason="busy"/>');
  });

  it("pauses after speaking for synchronous fallback", () => {
    const twiml = buildSayPauseTwiml("hi", 3);
    expect(twiml).toContain("<Say");
    expect(twiml).toContain('<Pause length="3"/>');
  });

  it("escape helper does not double-encode", () => {
    expect(voiceXml.escape("a&b")).toBe("a&amp;b");
    expect(voiceXml.escape("<>")).toBe("&lt;&gt;");
  });
});
