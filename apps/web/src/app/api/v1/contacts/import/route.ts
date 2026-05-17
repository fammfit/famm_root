/**
 * POST /api/v1/contacts/import — append a batch of imported clients to
 * the tenant's contact list. STUB: in-memory store.
 *
 * Body: { contacts: ContactDraft[]; sendInvites: boolean }
 * Returns: ImportResultsSummary
 */
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext } from "@/lib/request-context";
import { importContacts } from "@/lib/contacts/mock-import-store";

const ContactDraftSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string(),
  notes: z.string(),
});

const BodySchema = z.object({
  contacts: z.array(ContactDraftSchema).max(500),
  sendInvites: z.boolean(),
});

const ALLOWED_ROLES = new Set(["TENANT_OWNER", "TENANT_ADMIN", "SUPER_ADMIN"]);

function envelope<T>(data: T) {
  return {
    success: true,
    data,
    meta: { timestamp: new Date().toISOString(), version: "1.0" },
  };
}

function error(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function POST(request: NextRequest) {
  let ctx;
  try {
    ctx = getRequestContext();
  } catch {
    return error("UNAUTHORIZED", "Not signed in", 401);
  }
  if (!ALLOWED_ROLES.has(ctx.userRole)) {
    return error("FORBIDDEN", "Only tenant owners can import clients", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("BAD_REQUEST", "Invalid JSON body", 400);
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return error("VALIDATION_ERROR", "Invalid import payload", 422);
  }

  const summary = importContacts(ctx.tenantId, parsed.data.contacts, {
    sendInvites: parsed.data.sendInvites,
  });
  return NextResponse.json(envelope(summary));
}
