import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { generateOtp } from "./tokens";
import { SMS_OTP_TTL_MINUTES, SMS_OTP_MAX_ATTEMPTS } from "@famm/auth";

const RATE_LIMIT_KEY = (phone: string, tenantId: string) => `sms-otp:rl:${tenantId}:${phone}`;
const IP_RATE_LIMIT_KEY = (ip: string) => `sms-otp:rl-ip:${ip}`;
const MAX_PER_WINDOW = 3;
const WINDOW_SECONDS = 10 * 60;
// Per-IP cap protects against toll-fraud (one attacker spamming OTPs across
// many different numbers). 10 OTPs / hour / IP is generous for shared NATs
// but stops abuse at scale.
const MAX_PER_IP_WINDOW = 10;
const IP_WINDOW_SECONDS = 60 * 60;

function normPhone(phone: string): string {
  return phone.replace(/\s+/g, "").replace(/[()-]/g, "");
}

export interface SendOtpParams {
  phone: string;
  tenantId: string;
  requestIp?: string;
}

export interface SendOtpResult {
  expiresAt: Date;
  // The generated code is exposed ONLY when NODE_ENV === "test" so the
  // vitest integration suite can verify the full flow without intercepting
  // the SMS gateway. It is NEVER returned in development or production.
  code?: string;
}

export async function sendSmsOtp({
  phone,
  tenantId,
  requestIp,
}: SendOtpParams): Promise<SendOtpResult> {
  const normalizedPhone = normPhone(phone);

  // Per-(phone, tenant) rate limit.
  const rlKey = RATE_LIMIT_KEY(normalizedPhone, tenantId);
  const count = await redis.incr(rlKey);
  if (count === 1) await redis.expire(rlKey, WINDOW_SECONDS);
  if (count > MAX_PER_WINDOW) throw new Error("RATE_LIMITED");

  // Per-IP cap (toll-fraud / SMS-DoS protection across many numbers).
  if (requestIp) {
    const ipKey = IP_RATE_LIMIT_KEY(requestIp);
    const ipCount = await redis.incr(ipKey);
    if (ipCount === 1) await redis.expire(ipKey, IP_WINDOW_SECONDS);
    if (ipCount > MAX_PER_IP_WINDOW) throw new Error("RATE_LIMITED");
  }

  const code = generateOtp(6);
  const codeHash = await bcrypt.hash(code, 8); // low cost since OTPs are short-lived
  const expiresAt = new Date(Date.now() + SMS_OTP_TTL_MINUTES * 60 * 1000);

  // Invalidate previous unexpired OTPs
  await prisma.smsOtp.updateMany({
    where: { phone: normalizedPhone, tenantId, verifiedAt: null },
    data: { verifiedAt: new Date() },
  });

  await prisma.smsOtp.create({
    data: { phone: normalizedPhone, tenantId, codeHash, expiresAt, requestIp },
  });

  // Send via Twilio. The code is NEVER returned in dev/prod API responses
  // and NEVER logged - it only leaves the system through the SMS body.
  await deliverSms(normalizedPhone, `Your FAMM verification code is: ${code}`);

  return {
    expiresAt,
    ...(process.env["NODE_ENV"] === "test" ? { code } : {}),
  };
}

export interface VerifyOtpParams {
  phone: string;
  code: string;
  tenantId: string;
}

export async function verifySmsOtp({ phone, code, tenantId }: VerifyOtpParams): Promise<true> {
  const normalizedPhone = normPhone(phone);

  const record = await prisma.smsOtp.findFirst({
    where: {
      phone: normalizedPhone,
      tenantId,
      verifiedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) throw new Error("INVALID_OR_EXPIRED_OTP");

  if (record.attempts >= SMS_OTP_MAX_ATTEMPTS) {
    throw new Error("MAX_ATTEMPTS_EXCEEDED");
  }

  // Increment attempts before checking — prevents brute-force timing attacks
  await prisma.smsOtp.update({
    where: { id: record.id },
    data: { attempts: { increment: 1 } },
  });

  const valid = await bcrypt.compare(code, record.codeHash);
  if (!valid) throw new Error("INVALID_CODE");

  await prisma.smsOtp.update({
    where: { id: record.id },
    data: { verifiedAt: new Date() },
  });

  return true;
}

async function deliverSms(to: string, body: string): Promise<void> {
  const accountSid = process.env["TWILIO_ACCOUNT_SID"];
  const authToken = process.env["TWILIO_AUTH_TOKEN"];
  const from = process.env["TWILIO_PHONE_NUMBER"];

  if (!accountSid || !authToken || !from) {
    if (process.env["NODE_ENV"] !== "production") {
      // Never log the SMS body — it contains the OTP. Just acknowledge.
      console.warn(`[SMS] Twilio not configured; would have sent a message to ${to}`);
      return;
    }
    throw new Error("Twilio credentials not configured");
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const payload = new URLSearchParams({ To: to, From: from, Body: body });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
    },
    body: payload,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Twilio error ${response.status}: ${text}`);
  }
}
