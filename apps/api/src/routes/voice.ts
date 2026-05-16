import { Hono, type Context } from "hono";
import { z } from "zod";
import { SignJWT } from "jose";
import {
  validateTwilioSignature,
  buildConnectStreamTwiml,
  buildTransferTwiml,
  buildHangupTwiml,
  buildRejectTwiml,
  saveVoiceSession,
  loadVoiceSession,
  TwilioVoiceClient,
  placeOutboundCall,
  reminderBrief,
  waitlistBrief,
  trainerUtilizationBrief,
  type VoiceIntent,
  type VoiceSession,
} from "@famm/ai";
import { prisma } from "@famm/db";
import type { JwtPayload } from "@famm/types";
import { getJwtSecret, JWT_ISSUER, JWT_AUDIENCE_VOICE } from "@famm/auth";

const voice = new Hono();

const STREAM_TOKEN_TTL_SECONDS = 60 * 30; // 30 minutes — covers max call length.

/**
 * Twilio routes for the voice channel.
 *
 * Mounted at `/api/voice`. Every inbound webhook verifies the Twilio
 * X-Twilio-Signature header before trusting the body, and the WS upgrade
 * is gated by a short-lived JWT minted here — so anyone who lacks the
 * shared JWT secret cannot bridge a call mid-flight even if they can guess
 * a CallSid.
 */

// ── helpers ─────────────────────────────────────────────────────────────────

function parseForm(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of text.split("&")) {
    if (!pair) continue;
    const idx = pair.indexOf("=");
    const k = decodeURIComponent((idx === -1 ? pair : pair.slice(0, idx)).replace(/\+/g, " "));
    const v = idx === -1 ? "" : decodeURIComponent(pair.slice(idx + 1).replace(/\+/g, " "));
    out[k] = v;
  }
  return out;
}

function publicUrl(c: Context, path: string): string {
  // Prefer the operator-configured public base; only fall back to forwarded
  // headers in dev. Trusting X-Forwarded-* in prod lets an attacker that
  // can reach the origin steer Twilio to call URLs they control on the
  // next leg of the call (callbacks, transfer endpoints).
  const configured = process.env["TWILIO_WEBHOOK_BASE_URL"] ?? process.env["PUBLIC_API_URL"];
  if (configured) {
    return new URL(path, configured).toString();
  }
  if (process.env["NODE_ENV"] === "production") {
    throw new Error("TWILIO_WEBHOOK_BASE_URL or PUBLIC_API_URL must be set in production");
  }
  const proto = c.req.header("x-forwarded-proto") ?? "https";
  const host = c.req.header("x-forwarded-host") ?? c.req.header("host");
  const base = host ? `${proto}://${host}` : c.req.url;
  return new URL(path, base).toString();
}

function wssUrl(c: Context, path: string, token: string): string {
  const httpUrl = publicUrl(c, path);
  const u = new URL(httpUrl);
  u.protocol = u.protocol === "http:" ? "ws:" : "wss:";
  u.search = "";
  u.searchParams.set("token", token);
  return u.toString();
}

async function mintStreamToken(args: { tenantId: string; callSid: string }): Promise<string> {
  return new SignJWT({ tenantId: args.tenantId, callSid: args.callSid })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE_VOICE)
    .setIssuedAt()
    .setExpirationTime(`${STREAM_TOKEN_TTL_SECONDS}s`)
    .sign(getJwtSecret());
}

async function verifyTwilio(c: Context): Promise<{
  ok: boolean;
  params: Record<string, string>;
}> {
  const authToken = process.env["TWILIO_AUTH_TOKEN"];
  if (!authToken) return { ok: false, params: {} };
  const signature = c.req.header("x-twilio-signature");
  if (!signature) return { ok: false, params: {} };
  const body = await c.req.text();
  const params = parseForm(body);
  const url = publicUrl(c, c.req.path);
  const ok = validateTwilioSignature({ authToken, url, params, signature });
  return { ok, params };
}

/**
 * Resolve the tenant whose Twilio voice number was dialed. The current
 * schema does not yet carry a per-tenant `voicePhoneNumber` column, so this
 * mirrors the SMS strategy: pick the first AI-enabled tenant. Replace with
 * an exact-match lookup once `TenantSettings.voicePhoneNumber` lands.
 */
async function resolveTenantByToNumber(
  _toNumber: string
): Promise<{ id: string; timezone: string; currency: string; aiEnabled: boolean } | null> {
  const matched = await prisma.tenantSettings.findFirst({
    where: { aiEnabled: true },
    select: { tenantId: true, timezone: true, currency: true, aiEnabled: true },
  });
  if (!matched) return null;
  return {
    id: matched.tenantId,
    timezone: matched.timezone ?? "UTC",
    currency: matched.currency ?? "USD",
    aiEnabled: matched.aiEnabled,
  };
}

async function resolveUserByFrom(
  tenantId: string,
  fromNumber: string
): Promise<{ id: string; timezone: string | null } | null> {
  return prisma.user.findFirst({
    where: {
      phone: fromNumber,
      memberships: { some: { tenantId } },
    },
    select: { id: true, timezone: true },
  });
}

function safeDecodeBase64(b64: string): string | undefined {
  try {
    return Buffer.from(b64, "base64").toString("utf-8");
  } catch {
    return undefined;
  }
}

export function buildTwilioClientFromEnv(): TwilioVoiceClient | null {
  const sid = process.env["TWILIO_ACCOUNT_SID"];
  const token = process.env["TWILIO_AUTH_TOKEN"];
  const callerId = process.env["TWILIO_PHONE_NUMBER"];
  if (!sid || !token || !callerId) return null;
  return new TwilioVoiceClient({ accountSid: sid, authToken: token, callerId });
}

// ── inbound (caller dialed our number) ───────────────────────────────────────

voice.post("/twilio/inbound", async (c) => {
  const { ok, params } = await verifyTwilio(c);
  if (!ok) return c.json({ error: "invalid signature" }, 401);

  const callSid = params["CallSid"];
  const from = params["From"];
  const to = params["To"];
  if (!callSid || !from || !to) {
    return c.json({ error: "missing fields" }, 400);
  }

  const tenant = await resolveTenantByToNumber(to);
  if (!tenant || !tenant.aiEnabled) {
    return c.text(buildRejectTwiml("rejected"), 200, { "content-type": "application/xml" });
  }

  const user = await resolveUserByFrom(tenant.id, from);

  // The AiConversation row requires a userId; for anonymous callers we use
  // the caller phone as a stable handle. The voice session retains the
  // null userId so downstream code knows the caller is unauthenticated.
  const conversation = await prisma.aiConversation.create({
    data: {
      tenantId: tenant.id,
      userId: user?.id ?? from,
      channel: "voice",
      metadata: { callSid, from, to, direction: "inbound" },
    },
    select: { id: true },
  });

  const session: VoiceSession = {
    callSid,
    conversationId: conversation.id,
    tenantId: tenant.id,
    userId: user?.id ?? null,
    direction: "inbound",
    intent: "receptionist",
    fromNumber: from,
    toNumber: to,
    timezone: user?.timezone ?? tenant.timezone,
    currency: tenant.currency,
    startedAt: new Date().toISOString(),
    framesIn: 0,
    framesOut: 0,
  };
  await saveVoiceSession(session);

  const token = await mintStreamToken({ tenantId: tenant.id, callSid });
  const streamUrl = wssUrl(c, "/voice/stream", token);

  const twiml = buildConnectStreamTwiml({
    url: streamUrl,
    greeting: "Connecting you now.",
    parameters: [
      { name: "tenantId", value: tenant.id },
      { name: "callSid", value: callSid },
    ],
  });
  return c.text(twiml, 200, { "content-type": "application/xml" });
});

// ── outbound (we placed the call; Twilio asks for TwiML on answer) ───────────

const outboundQuery = z.object({
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  intent: z.enum([
    "receptionist",
    "booking",
    "reminder",
    "waitlist_fulfillment",
    "trainer_utilization",
    "custom",
  ]),
  brief: z.string().optional(),
});

voice.post("/outbound", async (c) => {
  const { ok, params } = await verifyTwilio(c);
  if (!ok) return c.json({ error: "invalid signature" }, 401);

  const parsed = outboundQuery.safeParse({
    tenantId: c.req.query("tenantId"),
    userId: c.req.query("userId"),
    intent: c.req.query("intent"),
    brief: c.req.query("brief"),
  });
  if (!parsed.success) {
    return c.text(buildHangupTwiml("Sorry, we couldn't start this call."), 200, {
      "content-type": "application/xml",
    });
  }

  const callSid = params["CallSid"];
  const to = params["To"] ?? "";
  const from = params["From"] ?? "";
  if (!callSid) return c.json({ error: "missing CallSid" }, 400);

  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId: parsed.data.tenantId },
    select: { timezone: true, currency: true, aiEnabled: true },
  });
  if (!settings || settings.aiEnabled === false) {
    return c.text(buildHangupTwiml("This service is currently unavailable."), 200, {
      "content-type": "application/xml",
    });
  }

  const user = await prisma.user.findFirst({
    where: {
      id: parsed.data.userId,
      memberships: { some: { tenantId: parsed.data.tenantId } },
    },
    select: { id: true, timezone: true },
  });

  const conversation = await prisma.aiConversation.create({
    data: {
      tenantId: parsed.data.tenantId,
      userId: parsed.data.userId,
      channel: "voice",
      metadata: {
        callSid,
        from,
        to,
        direction: "outbound",
        intent: parsed.data.intent,
      },
    },
    select: { id: true },
  });

  const brief = parsed.data.brief ? safeDecodeBase64(parsed.data.brief) : undefined;

  const session: VoiceSession = {
    callSid,
    conversationId: conversation.id,
    tenantId: parsed.data.tenantId,
    userId: user?.id ?? parsed.data.userId,
    direction: "outbound",
    intent: parsed.data.intent as VoiceIntent,
    fromNumber: from,
    toNumber: to,
    ...(brief ? { brief } : {}),
    timezone: user?.timezone ?? settings.timezone ?? "UTC",
    currency: settings.currency ?? "USD",
    startedAt: new Date().toISOString(),
    framesIn: 0,
    framesOut: 0,
  };
  await saveVoiceSession(session);

  const token = await mintStreamToken({
    tenantId: parsed.data.tenantId,
    callSid,
  });
  const streamUrl = wssUrl(c, "/voice/stream", token);

  const twiml = buildConnectStreamTwiml({
    url: streamUrl,
    parameters: [
      { name: "tenantId", value: parsed.data.tenantId },
      { name: "callSid", value: callSid },
      { name: "intent", value: parsed.data.intent },
    ],
  });
  return c.text(twiml, 200, { "content-type": "application/xml" });
});

// ── transfer (re-pointed by the orchestrator mid-call) ───────────────────────

voice.post("/transfer", async (c) => {
  const { ok, params } = await verifyTwilio(c);
  if (!ok) return c.json({ error: "invalid signature" }, 401);

  const target = c.req.query("target");
  const tenantId = c.req.query("tenantId");
  const callSid = c.req.query("callSid") ?? params["CallSid"];
  const reason = c.req.query("reason") ?? "agent_requested";

  if (!target || !tenantId || !callSid) {
    return c.text(buildHangupTwiml("Unable to transfer."), 200, {
      "content-type": "application/xml",
    });
  }

  const session = await loadVoiceSession(tenantId, callSid);
  if (!session) {
    return c.text(buildHangupTwiml("This call could not be transferred."), 200, {
      "content-type": "application/xml",
    });
  }

  await prisma.aiConversation
    .update({
      where: { id: session.conversationId },
      data: {
        metadata: {
          callSid,
          direction: session.direction,
          transferred: true,
          transferTarget: target,
          transferReason: reason,
        },
      },
    })
    .catch(() => null);

  const twiml = buildTransferTwiml({
    target,
    announce: "Connecting you to a team member now.",
    timeoutSeconds: 25,
  });
  return c.text(twiml, 200, { "content-type": "application/xml" });
});

// ── status (call lifecycle telemetry) ────────────────────────────────────────

voice.post("/status", async (c) => {
  const { ok, params } = await verifyTwilio(c);
  if (!ok) return c.json({ error: "invalid signature" }, 401);

  const callSid = params["CallSid"];
  const status = params["CallStatus"];
  if (!callSid || !status) return c.body(null, 204);

  const conv = await prisma.aiConversation.findFirst({
    where: { channel: "voice", metadata: { path: ["callSid"], equals: callSid } },
    select: { id: true },
  });
  if (!conv) return c.body(null, 204);

  const terminal = ["completed", "failed", "busy", "no-answer", "canceled"].includes(status);
  if (terminal) {
    await prisma.aiConversation
      .update({
        where: { id: conv.id },
        data: { endedAt: new Date(), summary: `Voice call status=${status}` },
      })
      .catch(() => null);
  }
  return c.body(null, 204);
});

// ── operator-initiated outbound dial ─────────────────────────────────────────

const placeCallBody = z.object({
  to: z.string().min(5),
  userId: z.string().min(1),
  intent: z.enum(["reminder", "waitlist_fulfillment", "trainer_utilization", "booking", "custom"]),
  brief: z.string().min(1).max(2000).optional(),
  label: z.string().max(120).optional(),
  reminder: z
    .object({
      serviceName: z.string(),
      trainerName: z.string().optional(),
      startAt: z.string(),
    })
    .optional(),
  waitlist: z
    .object({
      serviceName: z.string(),
      startAt: z.string(),
      holdMinutes: z.number().int().min(1).max(120),
    })
    .optional(),
  utilization: z
    .object({
      trainerName: z.string(),
      utilizationPercent: z.number().min(0).max(100),
      weekStarting: z.string(),
    })
    .optional(),
});

type AuthEnv = {
  Variables: {
    tenant: { tenantId: string; timezone: string; currency: string };
    user: JwtPayload;
  };
};

const placeRouter = new Hono<AuthEnv>();

/**
 * Authenticated operator endpoint to trigger an outbound voice call. Mounted
 * under `/api/v1/voice/place` so auth + tenant middleware run first. The
 * caller's tenantId comes from the JWT context — never the request body —
 * so an operator in tenant A cannot place a call as tenant B.
 */
placeRouter.post("/place", async (c) => {
  const body = placeCallBody.parse(await c.req.json());
  const tenant = c.get("tenant");

  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId: tenant.tenantId },
    select: { aiEnabled: true },
  });
  if (settings && settings.aiEnabled === false) {
    return c.json({ success: false, error: { code: "AI_DISABLED" } }, 403);
  }

  const user = await prisma.user.findFirst({
    where: {
      id: body.userId,
      memberships: { some: { tenantId: tenant.tenantId } },
    },
    select: { id: true },
  });
  if (!user) {
    return c.json({ success: false, error: { code: "USER_NOT_IN_TENANT" } }, 404);
  }

  const twilio = buildTwilioClientFromEnv();
  if (!twilio) {
    return c.json({ success: false, error: { code: "TWILIO_NOT_CONFIGURED" } }, 500);
  }

  const publicApiUrl = process.env["PUBLIC_API_URL"];
  if (!publicApiUrl) {
    return c.json({ success: false, error: { code: "PUBLIC_API_URL_NOT_SET" } }, 500);
  }

  const brief =
    body.brief ?? deriveBriefForIntent(body, tenant.timezone) ?? `Place a ${body.intent} call.`;

  const placed = await placeOutboundCall(
    {
      tenantId: tenant.tenantId,
      userId: body.userId,
      to: body.to,
      intent: body.intent as VoiceIntent,
      brief,
      ...(body.label ? { label: body.label } : {}),
    },
    { twilio, publicApiUrl }
  );

  return c.json({
    success: true,
    data: { callSid: placed.sid, status: placed.status },
  });
});

function deriveBriefForIntent(
  body: z.infer<typeof placeCallBody>,
  timezone: string
): string | undefined {
  if (body.intent === "reminder" && body.reminder) {
    return reminderBrief({
      serviceName: body.reminder.serviceName,
      ...(body.reminder.trainerName ? { trainerName: body.reminder.trainerName } : {}),
      startAt: body.reminder.startAt,
      timezone,
    });
  }
  if (body.intent === "waitlist_fulfillment" && body.waitlist) {
    return waitlistBrief({
      serviceName: body.waitlist.serviceName,
      startAt: body.waitlist.startAt,
      timezone,
      holdMinutes: body.waitlist.holdMinutes,
    });
  }
  if (body.intent === "trainer_utilization" && body.utilization) {
    return trainerUtilizationBrief({
      trainerName: body.utilization.trainerName,
      utilizationPercent: body.utilization.utilizationPercent,
      weekStarting: body.utilization.weekStarting,
    });
  }
  return undefined;
}

export default voice;
export { placeRouter as voicePlaceRouter };
