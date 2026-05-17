/**
 * GET /api/v1/contacts/import/dedupe — return the set of already-known
 * emails/phones for this tenant so the review table can flag dupes
 * before the trainer commits the import. STUB: in-memory store.
 */
import { NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { existingEmails, existingPhones } from "@/lib/contacts/mock-import-store";

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

export async function GET() {
  let ctx;
  try {
    ctx = getRequestContext();
  } catch {
    return error("UNAUTHORIZED", "Not signed in", 401);
  }
  if (!ALLOWED_ROLES.has(ctx.userRole)) {
    return error("FORBIDDEN", "Only tenant owners can view contacts", 403);
  }
  return NextResponse.json(
    envelope({
      emails: Array.from(existingEmails(ctx.tenantId)),
      phones: Array.from(existingPhones(ctx.tenantId)),
    })
  );
}
