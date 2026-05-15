import { describe, expect, it, vi } from "vitest";
import {
  TwilioVoiceClient,
  TwilioApiError,
  placeOutboundCall,
  reminderBrief,
  waitlistBrief,
  trainerUtilizationBrief,
} from "../voice/outbound";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("TwilioVoiceClient.placeCall", () => {
  it("posts form-encoded body with status callbacks", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(201, { sid: "CA123", to: "+15555550199", from: "+15555550100", status: "queued" })
    );
    const client = new TwilioVoiceClient({
      accountSid: "AC1",
      authToken: "tok",
      callerId: "+15555550100",
      fetcher: fetcher as unknown as typeof fetch,
    });
    const result = await client.placeCall({
      to: "+15555550199",
      webhookUrl: "https://example.com/voice/outbound",
      statusCallbackUrl: "https://example.com/voice/status",
      timeout: 25,
      idempotencyKey: "key-1",
    });

    expect(result.sid).toBe("CA123");
    expect(fetcher).toHaveBeenCalledOnce();
    const init = (fetcher.mock.calls[0]?.[1] ?? {}) as RequestInit & {
      headers: Record<string, string>;
    };
    expect(init.method).toBe("POST");
    expect(init.headers["Authorization"]).toMatch(/^Basic /);
    expect(init.headers["I-Twilio-Idempotency-Token"]).toBe("key-1");
    const body = String(init.body);
    expect(body).toContain("To=%2B15555550199");
    expect(body).toContain("From=%2B15555550100");
    expect(body).toContain("Url=https%3A%2F%2Fexample.com%2Fvoice%2Foutbound");
    expect(body).toContain("StatusCallback=https%3A%2F%2Fexample.com%2Fvoice%2Fstatus");
    expect(body).toContain("StatusCallbackEvent=initiated");
  });

  it("throws TwilioApiError on non-2xx", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response("rate limited", { status: 429 })
    );
    const client = new TwilioVoiceClient({
      accountSid: "AC1",
      authToken: "tok",
      callerId: "+15555550100",
      fetcher: fetcher as unknown as typeof fetch,
    });
    await expect(
      client.placeCall({
        to: "+15555550199",
        webhookUrl: "https://example.com/x",
      })
    ).rejects.toBeInstanceOf(TwilioApiError);
  });

  it("updateCall redirects an in-progress call", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(200, { sid: "CA123", status: "in-progress" })
    );
    const client = new TwilioVoiceClient({
      accountSid: "AC1",
      authToken: "tok",
      callerId: "+15555550100",
      fetcher: fetcher as unknown as typeof fetch,
    });
    await client.updateCall("CA123", "https://example.com/voice/transfer?target=%2B15555550101");
    const url = String(fetcher.mock.calls[0]?.[0] ?? "");
    expect(url).toContain("/Calls/CA123.json");
    const body = String(((fetcher.mock.calls[0]?.[1] ?? {}) as RequestInit).body);
    expect(body).toContain(
      "Url=https%3A%2F%2Fexample.com%2Fvoice%2Ftransfer%3Ftarget%3D%252B15555550101"
    );
  });
});

describe("placeOutboundCall", () => {
  it("wires the webhook URL with intent + base64 brief", async () => {
    const placeCall = vi.fn().mockResolvedValue({
      sid: "CA1",
      to: "+15555550111",
      from: "+15555550100",
      status: "queued",
    });
    const twilio = {
      placeCall,
    } as unknown as TwilioVoiceClient;

    const emit = vi.fn().mockResolvedValue(undefined);
    const result = await placeOutboundCall(
      {
        tenantId: "t1",
        userId: "u1",
        to: "+15555550111",
        intent: "reminder",
        brief: "ring ring",
      },
      {
        twilio,
        publicApiUrl: "https://api.example.com",
        emitEvent: emit,
      }
    );

    expect(result.sid).toBe("CA1");
    expect(placeCall).toHaveBeenCalledOnce();
    const input = placeCall.mock.calls[0]?.[0] as {
      webhookUrl: string;
      statusCallbackUrl?: string;
    };
    const webhook = new URL(input.webhookUrl);
    expect(webhook.pathname).toBe("/api/voice/outbound");
    expect(webhook.searchParams.get("tenantId")).toBe("t1");
    expect(webhook.searchParams.get("userId")).toBe("u1");
    expect(webhook.searchParams.get("intent")).toBe("reminder");
    const brief = Buffer.from(webhook.searchParams.get("brief") ?? "", "base64").toString();
    expect(brief).toBe("ring ring");
    expect(input.statusCallbackUrl).toContain("/api/voice/status");
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ai.voice.outbound_placed",
        tenantId: "t1",
        payload: expect.objectContaining({ callSid: "CA1", intent: "reminder" }),
      })
    );
  });
});

describe("intent briefs", () => {
  it("reminder brief embeds time and service", () => {
    const b = reminderBrief({
      serviceName: "Massage",
      trainerName: "Ada",
      startAt: "2026-06-01T10:00:00Z",
      timezone: "UTC",
    });
    expect(b).toContain("Massage");
    expect(b).toContain("Ada");
    expect(b).toContain("2026-06-01T10:00:00Z");
  });

  it("waitlist brief mentions the hold window", () => {
    const b = waitlistBrief({
      serviceName: "Yoga",
      startAt: "2026-06-01T10:00:00Z",
      timezone: "UTC",
      holdMinutes: 30,
    });
    expect(b).toContain("Yoga");
    expect(b).toContain("30 minutes");
  });

  it("utilization brief mentions percent and week", () => {
    const b = trainerUtilizationBrief({
      trainerName: "Sam",
      utilizationPercent: 25,
      weekStarting: "2026-06-01",
    });
    expect(b).toContain("Sam");
    expect(b).toContain("25%");
    expect(b).toContain("2026-06-01");
  });
});
