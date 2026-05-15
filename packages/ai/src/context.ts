import { prisma } from "@famm/db";
import { embed } from "./embeddings";
import type { ConversationActor } from "./types";

/**
 * Retrieval-only personalization layer.
 *
 * Personalization is read-side only: we load already-stored facts about the
 * requesting user (memories, recent bookings, preferences) and inject them
 * into the prompt as context. Nothing about the model itself is mutated, and
 * we never look across users or tenants — every query is scoped to
 * `(tenantId, userId)`.
 */

export interface RetrievedContext {
  memories: Array<{ content: string; memoryType: string; importance: number }>;
  recentBookings: Array<{
    id: string;
    serviceName: string;
    trainerName: string | null;
    startAt: string;
    status: string;
  }>;
  profile: {
    name: string;
    timezone: string;
  };
}

const MAX_MEMORIES = 6;
const MAX_BOOKINGS = 5;

export async function loadUserContext(actor: ConversationActor): Promise<RetrievedContext> {
  const [user, memories, bookings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: actor.userId },
      select: { firstName: true, lastName: true, timezone: true },
    }),
    prisma.aiMemory.findMany({
      where: {
        tenantId: actor.tenantId,
        userId: actor.userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
      take: MAX_MEMORIES,
      select: { content: true, memoryType: true, importance: true },
    }),
    prisma.booking.findMany({
      where: { tenantId: actor.tenantId, clientId: actor.userId },
      orderBy: { startAt: "desc" },
      take: MAX_BOOKINGS,
      select: {
        id: true,
        startAt: true,
        status: true,
        service: { select: { name: true } },
        trainer: { select: { user: { select: { firstName: true, lastName: true } } } },
      },
    }),
  ]);

  return {
    profile: {
      name: user ? `${user.firstName} ${user.lastName}`.trim() : "there",
      timezone: user?.timezone ?? actor.timezone,
    },
    memories,
    recentBookings: bookings.map((b) => ({
      id: b.id,
      serviceName: b.service.name,
      trainerName: b.trainer?.user
        ? `${b.trainer.user.firstName} ${b.trainer.user.lastName}`.trim()
        : null,
      startAt: b.startAt.toISOString(),
      status: b.status,
    })),
  };
}

/**
 * Semantic memory recall using pgvector. The lookup is hard-scoped to
 * `(tenantId, userId)` — embeddings from other users are never candidates.
 */
export async function recallMemories(args: {
  tenantId: string;
  userId: string;
  query: string;
  limit?: number;
}): Promise<Array<{ id: string; content: string; distance: number }>> {
  const limit = args.limit ?? 5;
  const vector = await embed(args.query);
  const vec = `[${vector.join(",")}]`;

  // Raw query is required because Prisma does not type pgvector operators.
  // The WHERE clause enforces strict tenant + user isolation.
  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; content: string; distance: number }>
  >(
    `SELECT id, content, embedding <-> $1::vector AS distance
       FROM "AiMemory"
      WHERE "tenantId" = $2
        AND "userId" = $3
        AND embedding IS NOT NULL
        AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
      ORDER BY embedding <-> $1::vector
      LIMIT $4`,
    vec,
    args.tenantId,
    args.userId,
    limit
  );

  return rows;
}

export function formatContextBlock(ctx: RetrievedContext): string {
  const parts: string[] = [];
  parts.push(`User: ${ctx.profile.name} (timezone: ${ctx.profile.timezone}).`);

  if (ctx.memories.length) {
    parts.push("Known facts about this user:");
    for (const m of ctx.memories) {
      parts.push(`- [${m.memoryType}] ${m.content}`);
    }
  }

  if (ctx.recentBookings.length) {
    parts.push("Recent bookings:");
    for (const b of ctx.recentBookings) {
      const trainer = b.trainerName ? ` with ${b.trainerName}` : "";
      parts.push(`- ${b.serviceName}${trainer} on ${b.startAt} [${b.status}] (id: ${b.id})`);
    }
  }

  return parts.join("\n");
}
