"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, CalendarDays, Users, MessageSquare, Menu } from "lucide-react";
import { cn } from "@/lib/cn";
import { SafeAreaInset } from "./SafeAreaInset";

export interface TabDef {
  href: string;
  label: string;
  /** Accepts any component that takes `className` — lucide-react icons fit. */
  icon: React.ComponentType<{ className?: string }>;
  /** Match the active state against this prefix (defaults to exact `href`). */
  matchPrefix?: string;
  /** Optional count badge (e.g. unread). */
  count?: number;
}

export const TRAINER_TABS: ReadonlyArray<TabDef> = [
  { href: "/dashboard", label: "Today", icon: LayoutGrid },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, matchPrefix: "/calendar" },
  { href: "/clients", label: "Clients", icon: Users, matchPrefix: "/clients" },
  { href: "/messaging", label: "Messages", icon: MessageSquare, matchPrefix: "/messaging" },
  { href: "/settings", label: "More", icon: Menu, matchPrefix: "/settings" },
];

export const CLIENT_TABS: ReadonlyArray<TabDef> = [
  { href: "/my", label: "Home", icon: LayoutGrid },
  { href: "/my/bookings", label: "Bookings", icon: CalendarDays, matchPrefix: "/my/bookings" },
  { href: "/my/messages", label: "Messages", icon: MessageSquare, matchPrefix: "/my/messages" },
  { href: "/my/account", label: "Account", icon: Menu, matchPrefix: "/my/account" },
];

function isActive(pathname: string, tab: TabDef): boolean {
  if (tab.matchPrefix) return pathname.startsWith(tab.matchPrefix);
  return pathname === tab.href;
}

export interface BottomTabBarProps {
  tabs: ReadonlyArray<TabDef>;
  className?: string;
}

/**
 * Mobile-first bottom navigation. Hidden at ≥md (use a sidebar layout there).
 * Five tabs maximum — anything beyond five collapses behind the "More" tab.
 */
export function BottomTabBar({ tabs, className }: BottomTabBarProps) {
  const pathname = usePathname() ?? "/";
  return (
    <SafeAreaInset
      as="nav"
      edges={["bottom", "left", "right"]}
      aria-label="Primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 md:hidden",
        "bg-surface border-t border-border",
        className
      )}
    >
      <ul className="grid grid-cols-5">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-14 flex-col items-center justify-center gap-stack-xs",
                  "text-xs font-medium",
                  "transition-colors duration-fast ease-standard",
                  active ? "text-accent" : "text-text-secondary hover:text-text-primary",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                )}
              >
                <span
                  aria-hidden="true"
                  className="relative flex h-5 w-5 items-center justify-center"
                >
                  <Icon className="h-5 w-5" />
                  {tab.count && tab.count > 0 ? (
                    <span
                      aria-label={`${tab.count} unread`}
                      className={cn(
                        "absolute -right-2 -top-1 inline-flex h-4 min-w-4 items-center justify-center",
                        "rounded-pill bg-signal-danger px-inset-xs text-xs font-semibold leading-none text-onAccent"
                      )}
                    >
                      {tab.count > 9 ? "9+" : tab.count}
                    </span>
                  ) : null}
                </span>
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </SafeAreaInset>
  );
}
