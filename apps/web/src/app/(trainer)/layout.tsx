import { redirect } from "next/navigation";
import { getRequestContext } from "@/lib/request-context";
import { TrainerShell } from "@/components/layouts/TrainerShell";

/**
 * Trainer/admin route group layout.
 *
 * Auth: edge middleware already enforces a valid JWT for any non-public
 * path. This layout additionally:
 *   - resolves the request context (throws if headers missing — falls
 *     through to the catch and redirects to /login),
 *   - rejects `CLIENT` users (they belong in /my, not the trainer surface).
 *
 * RBAC granularity (TRAINER vs TRAINER_LEAD vs TENANT_ADMIN) is enforced
 * per-page in lib/rbac/page-permissions.ts.
 */
export default function TrainerLayout({ children }: { children: React.ReactNode }) {
  let ctx;
  try {
    ctx = getRequestContext();
  } catch {
    redirect("/login?next=/dashboard");
  }

  if (ctx.userRole === "CLIENT") {
    redirect("/my");
  }

  return <TrainerShell>{children}</TrainerShell>;
}
