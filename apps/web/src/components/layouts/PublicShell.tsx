import * as React from "react";
import { PublicAppBar } from "@/components/nav/PublicAppBar";

interface PublicShellProps {
  children: React.ReactNode;
  /** Detected from the request context by the page. */
  signedInRole?: "TRAINER_LIKE" | "CLIENT" | null;
}

/**
 * Marketing-surface shell. Mobile-first single column. No bottom-tab nav
 * (this surface is for visitors, not app users). Pages may render their
 * own footer/sticky bars below `children`.
 */
export function PublicShell({ children, signedInRole = null }: PublicShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <PublicAppBar
        signedIn={signedInRole !== null}
        signedInHref={signedInRole === "CLIENT" ? "/my" : "/dashboard"}
      />
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
