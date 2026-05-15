import { Hono } from "hono";
import { processMessage, validateTwilioSignature, buildTwimlMessage } from "@famm/ai";
import { prisma } from "@famm/db";
import { paymentsAdapter } from "./ai";

const sms = new Hono();

/**
 * Twilio inbound SMS webhook.
 *
 * Twilio posts application/x-www-form-urlencoded with `From`, `To`, `Body`,
 * etc. The endpoint MUST verify the X-Twilio-Signature header before
 * trusting the body — otherwise anyone can impersonate Twilio.
 *
 * This route is mounted outside `/api/v1/*` because Twilio doesn't carry a
 * JWT; auth is established by phone-number lookup against this tenant's
 * user table.
 */
sms.post("/twilio/inbound", async (c) => {
  const authToken = process.env["TWILIO_AUTH_TOKEN"];
  if (!authToken) {
    return c.json({ error: "TWILIO_AUTH_TOKEN not configured" }, 500);
  }

  const signature = c.req.header("x-twilio-signature");
  if (!signature) {
    return c.json({ error: "missing signature" }, 401);
  }

  const formText = await c.req.text();
  const params = parseForm(formText);

  // Twilio signs the publicly-reachable URL. Behind a proxy we trust
  // X-Forwarded-Proto/Host; in dev the request URL is fine.
  const forwardedProto = c.req.header("x-forwarded-proto");
  const forwardedHost = c.req.header("x-forwarded-host") ?? c.req.header("host");
  const url =
    forwardedProto && forwardedHost
      ? `${forwardedProto}://${forwardedHost}${c.req.path}`
      : c.req.url;

  const ok = validateTwilioSignature({ authToken, url, params, signature });
  if (!ok) {
    return c.json({ error: "invalid signature" }, 401);
  }

  const from = params["From"];
  const body = (params["Body"] ?? "").trim();
  const toNumber = params["To"];
  if (!from || !body || !toNumber) {
    return c.json({ error: "missing fields" }, 400);
  }

  // Look up the user by phone number. The tenant is resolved from the
  // Twilio destination number (each tenant has one configured phone). The
  // user must already be provisioned — we do not auto-create accounts from
  // SMS, which would let attackers spoof a "From" to enroll arbitrary
  // numbers under a tenant.
  const tenant = await prisma.tenant.findFirst({
    where: { settings: { smsNotifications: true } },
    // Real impl: store per-tenant Twilio number on settings or branding.
    include: { settings: true },
  });
  if (!tenant) {
    return c.text(buildTwimlMessage("SMS is not enabled."), 200, {
      "content-type": "application/xml",
    });
  }

  const user = await prisma.user.findFirst({
    where: { phone: from, memberships: { some: { tenantId: tenant.id } } },
    select: { id: true, timezone: true },
  });

  if (!user) {
    return c.text(
      buildTwimlMessage(
        "We don't recognize this number. Please sign up on our website to use SMS support."
      ),
      200,
      { "content-type": "application/xml" }
    );
  }

  let reply: string;
  try {
    const result = await processMessage(
      {
        channel: "sms",
        actor: {
          tenantId: tenant.id,
          userId: user.id,
          timezone: user.timezone ?? tenant.settings?.timezone ?? "UTC",
          currency: tenant.settings?.currency ?? "USD",
        },
        sessionKey: from,
        message: body,
      },
      { paymentsClient: paymentsAdapter }
    );
    reply = result.reply || "Got it.";
  } catch (err) {
    console.error("[sms] orchestration failed:", err);
    reply = "Sorry, something went wrong. Please try again.";
  }

  return c.text(buildTwimlMessage(reply), 200, { "content-type": "application/xml" });
});

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

export default sms;
