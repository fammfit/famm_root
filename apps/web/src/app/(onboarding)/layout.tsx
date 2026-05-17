import { redirect } from "next/navigation";
import { getRequestContext } from "@/lib/request-context";

/**
 * Onboarding route group. Auth required.
 *
 * Role gate:
 *   TENANT_OWNER / TENANT_ADMIN / SUPER_ADMIN  -> allowed
 *   TRAINER_LEAD / TRAINER / STAFF             -> /dashboard
 *   CLIENT                                     -> /my
 *   unauth                                     -> /login?next=...
 */
const ALLOWED = new Set(["TENANT_OWNER", "TENANT_ADMIN", "SUPER_ADMIN"]);

export default function OnboardingGroupLayout({ children }: { children: React.ReactNode }) {
  let ctx;
  try {
    ctx = getRequestContext();
  } catch {
    redirect("/login?next=/trainer/onboarding/trainer-onboarding-flow");
  }
  if (ctx.userRole === "CLIENT") redirect("/my");
  if (!ALLOWED.has(ctx.userRole)) redirect("/dashboard");
  return <>{children}</>;
}
