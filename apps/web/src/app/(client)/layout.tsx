import { redirect } from "next/navigation";
import { getRequestContext } from "@/lib/request-context";
import { ClientShell } from "@/components/layouts/ClientShell";

/**
 * Client-portal route group layout.
 *
 * Edge middleware enforces JWT presence. This layout additionally:
 *   - resolves the request context (missing headers → /login),
 *   - sends trainers/admins back to /dashboard if they land here directly.
 *
 * The portal is intentionally narrow: a client should never see admin
 * surfaces, and a trainer impersonating themselves as a client (super-admin
 * tooling) goes through a different code path.
 */
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  let ctx;
  try {
    ctx = getRequestContext();
  } catch {
    redirect("/login?next=/my");
  }

  if (ctx.userRole !== "CLIENT") {
    redirect("/dashboard");
  }

  return <ClientShell>{children}</ClientShell>;
}
