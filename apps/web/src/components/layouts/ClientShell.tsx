import * as React from "react";
import { BottomTabBar, CLIENT_TABS } from "@/components/nav/BottomTabBar";

interface ClientShellProps {
  /** Page content — rendered inside <main> with bottom padding for the tab bar. */
  children: React.ReactNode;
}

/**
 * App shell for the client portal (/my/*). Mirrors TrainerShell but uses
 * the client tab set (Home, Bookings, Messages, Account). Pages own their
 * own AppBar.
 */
export function ClientShell({ children }: ClientShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-sunken">
      <main
        id="main"
        className="flex flex-1 flex-col pb-[calc(env(safe-area-inset-bottom)+3.5rem)] md:pb-0"
      >
        {children}
      </main>
      <BottomTabBar tabs={CLIENT_TABS} />
    </div>
  );
}
