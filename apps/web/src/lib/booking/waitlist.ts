import { redis } from "@/lib/redis";
import { nanoid } from "nanoid";

/**
 * Lightweight Redis-backed waitlist. Each slot has a sorted set keyed on join
 * time so the earliest waiter is first to be notified.
 *
 * Key layout:
 *   waitlist:entries:{tenantId}:{serviceId}:{slotKey}  →  ZSET of entryId by score=joinedAt
 *   waitlist:entry:{entryId}                           →  HASH of entry fields
 *   waitlist:user:{tenantId}:{userId}                  →  SET of entryIds (for user list/cleanup)
 *
 * 7-day TTL on each entry so stale data self-cleans.
 */

const ENTRY_TTL_SECONDS = 60 * 60 * 24 * 7;

export interface WaitlistEntryRecord {
  id: string;
  tenantId: string;
  userId: string;
  serviceId: string;
  trainerId?: string;
  locationId?: string;
  startAt: string;
  endAt: string;
  status: "ACTIVE" | "NOTIFIED" | "CONVERTED" | "EXPIRED" | "CANCELLED";
  joinedAt: number;
  position?: number;
}

const slotKey = (startAt: string, trainerId?: string) =>
  `${trainerId ?? "_"}:${startAt}`;

const entriesKey = (tenantId: string, serviceId: string, slot: string) =>
  `waitlist:entries:${tenantId}:${serviceId}:${slot}`;

const entryKey = (entryId: string) => `waitlist:entry:${entryId}`;

const userKey = (tenantId: string, userId: string) =>
  `waitlist:user:${tenantId}:${userId}`;

export async function joinWaitlist(input: {
  tenantId: string;
  userId: string;
  serviceId: string;
  trainerId?: string;
  locationId?: string;
  startAt: string;
  endAt: string;
}): Promise<WaitlistEntryRecord> {
  const id = `wl_${nanoid(12)}`;
  const joinedAt = Date.now();
  const slot = slotKey(input.startAt, input.trainerId);
  const ek = entryKey(id);
  const setKey = entriesKey(input.tenantId, input.serviceId, slot);

  const record: WaitlistEntryRecord = {
    id,
    tenantId: input.tenantId,
    userId: input.userId,
    serviceId: input.serviceId,
    trainerId: input.trainerId,
    locationId: input.locationId,
    startAt: input.startAt,
    endAt: input.endAt,
    status: "ACTIVE",
    joinedAt,
  };

  await redis
    .multi()
    .hset(ek, serializeEntry(record))
    .expire(ek, ENTRY_TTL_SECONDS)
    .zadd(setKey, joinedAt, id)
    .expire(setKey, ENTRY_TTL_SECONDS)
    .sadd(userKey(input.tenantId, input.userId), id)
    .expire(userKey(input.tenantId, input.userId), ENTRY_TTL_SECONDS)
    .exec();

  const position = await redis.zrank(setKey, id);
  record.position = position !== null ? position + 1 : undefined;
  return record;
}

export async function leaveWaitlist(
  entryId: string,
  tenantId: string,
  userId: string
): Promise<boolean> {
  const ek = entryKey(entryId);
  const data = await redis.hgetall(ek);
  if (!data || !data["id"]) return false;
  if (data["tenantId"] !== tenantId || data["userId"] !== userId) return false;

  const slot = slotKey(data["startAt"] ?? "", data["trainerId"] || undefined);
  const setKey = entriesKey(tenantId, data["serviceId"] ?? "", slot);

  await redis
    .multi()
    .del(ek)
    .zrem(setKey, entryId)
    .srem(userKey(tenantId, userId), entryId)
    .exec();
  return true;
}

export async function nextWaiter(
  tenantId: string,
  serviceId: string,
  startAt: string,
  trainerId?: string
): Promise<WaitlistEntryRecord | null> {
  const setKey = entriesKey(tenantId, serviceId, slotKey(startAt, trainerId));
  const [first] = await redis.zrange(setKey, 0, 0);
  if (!first) return null;
  const data = await redis.hgetall(entryKey(first));
  if (!data["id"]) return null;
  return parseEntry(data);
}

function serializeEntry(r: WaitlistEntryRecord): Record<string, string> {
  return {
    id: r.id,
    tenantId: r.tenantId,
    userId: r.userId,
    serviceId: r.serviceId,
    trainerId: r.trainerId ?? "",
    locationId: r.locationId ?? "",
    startAt: r.startAt,
    endAt: r.endAt,
    status: r.status,
    joinedAt: String(r.joinedAt),
  };
}

function parseEntry(data: Record<string, string>): WaitlistEntryRecord {
  return {
    id: data["id"] ?? "",
    tenantId: data["tenantId"] ?? "",
    userId: data["userId"] ?? "",
    serviceId: data["serviceId"] ?? "",
    trainerId: data["trainerId"] || undefined,
    locationId: data["locationId"] || undefined,
    startAt: data["startAt"] ?? "",
    endAt: data["endAt"] ?? "",
    status: (data["status"] as WaitlistEntryRecord["status"]) ?? "ACTIVE",
    joinedAt: Number(data["joinedAt"] ?? "0"),
  };
}
