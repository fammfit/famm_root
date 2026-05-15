import { headers } from "next/headers";
import { UnauthorizedError } from "@famm/shared";

export interface RequestContext {
  userId: string;
  tenantId: string;
  userEmail: string;
  userRole: string;
}

export function getRequestContext(): RequestContext {
  const headersList = headers();
  const userId = headersList.get("x-user-id");
  const tenantId = headersList.get("x-tenant-id");
  const userEmail = headersList.get("x-user-email");
  const userRole = headersList.get("x-user-role");

  if (!userId || !tenantId || !userEmail || !userRole) {
    throw new UnauthorizedError();
  }

  return { userId, tenantId, userEmail, userRole };
}
