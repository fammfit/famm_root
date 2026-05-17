/**
 * @page Trainer Settings index (/settings)
 *
 * Purpose: jump-off page for all settings surfaces. Currently lists
 *   the Account & Settings hub; more topical sub-pages (billing,
 *   public link, locations) will land alongside it.
 * Route: /settings (trainer-only).
 */

import Link from "next/link";
import { ChevronRight, Settings2 } from "lucide-react";
import { Card } from "@famm/ui";
import { AppBar } from "@/components/nav/AppBar";

export const metadata = { title: "More — FAMM" };

interface SettingsLink {
  href: string;
  title: string;
  description: string;
}

const LINKS: ReadonlyArray<SettingsLink> = [
  {
    href: "/settings/trainer-account-admin",
    title: "Account & Settings",
    description:
      "Identity, security, team, business, payments, tax, notifications, integrations, and more.",
  },
];

export default function SettingsIndexPage() {
  return (
    <>
      <AppBar title="More" subtitle="Settings and admin" />
      <div className="flex flex-col gap-stack-sm p-inset-md md:p-inset-lg">
        {LINKS.map((link) => (
          <Card key={link.href} className="overflow-hidden">
            <Link
              href={link.href}
              className="flex items-center gap-inline-sm p-inset-md transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:bg-surface-sunken"
            >
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-accent/10 text-accent"
              >
                <Settings2 className="h-5 w-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-stack-xs">
                <span className="text-sm font-semibold text-text-primary">{link.title}</span>
                <span className="text-xs text-text-secondary">{link.description}</span>
              </span>
              <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-text-secondary" />
            </Link>
          </Card>
        ))}
      </div>
    </>
  );
}
