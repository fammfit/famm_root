/**
 * @page Root redirect (`/`)
 *
 * Purpose: send the user to the right home based on their role.
 *   - No session       → /login (handled by edge middleware before reaching here)
 *   - CLIENT           → /my (client portal home)
 *   - any trainer role → /dashboard (trainer "Today" view)
 *
 * Marketing landing will live at /home or under a (public) group later;
 * for v1 the root URL is the app entry, not a marketing page.
 */
import { redirect } from "next/navigation";
import { getRequestContext } from "@/lib/request-context";

export const dynamic = "force-dynamic";

export default function HomeRedirect() {
  // The edge middleware allows / through as a public path so unauthenticated
  // hits don't bounce-loop. If we reach here without auth headers, send them
  // to /login. With auth, route on role.
  try {
    const ctx = getRequestContext();
    if (ctx.userRole === "CLIENT") {
      redirect("/my");
    }
    redirect("/dashboard");
  } catch {
    redirect("/login");
  }
}
