import * as React from "react";
import { BottomTabBar, TRAINER_TABS } from "@/components/nav/BottomTabBar";

interface TrainerShellProps {
  /** Page content — rendered inside <main> with bottom padding for the tab bar. */
  children: React.ReactNode;
}

/**
 * App shell for trainer/admin pages. Mobile-first:
 *   - Single content column with bottom-tab nav fixed to the safe-area floor.
 *   - On ≥md we drop the bottom tabs (a future sidebar component will take over
 *     — for now the page renders edge-to-edge on desktop, which still works).
 *
 * Pages own their own AppBar — the shell does not assume a header so detail
 * pages can opt into back nav, transparent bars, or no bar at all.
 */
export function TrainerShell({ children }: TrainerShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-sunken">
      <main
        id="main"
        className="flex flex-1 flex-col pb-[calc(env(safe-area-inset-bottom)+3.5rem)] md:pb-0"
      >
        {children}
      </main>
      <BottomTabBar tabs={TRAINER_TABS} />
    </div>
  );
}
