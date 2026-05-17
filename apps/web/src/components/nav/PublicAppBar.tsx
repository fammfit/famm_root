import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { cn } from "@/lib/cn";
import { SafeAreaInset } from "@/components/nav/SafeAreaInset";

export interface PublicAppBarProps {
  /** When true, shows "Open dashboard" instead of "Sign in". */
  signedIn?: boolean;
  /** Target route for the "Open" button when signed in. */
  signedInHref?: string;
}

/**
 * Top bar for the public marketing surface. Distinct from the app
 * AppBar: no back button, no actions slot, no page-level title — just
 * the brand mark and a single sign-in / open-app link.
 */
export function PublicAppBar({ signedIn = false, signedInHref = "/" }: PublicAppBarProps) {
  return (
    <SafeAreaInset
      as="header"
      edges={["top", "left", "right"]}
      className={cn("sticky top-0 z-30 border-b border-border bg-surface")}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-inset-md">
        <Link
          href="/"
          aria-label="FAMM home"
          className="inline-flex items-center gap-inline-xs rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-card bg-accent text-onAccent"
          >
            <Dumbbell aria-hidden className="h-4 w-4" />
          </span>
          <span className="text-base font-semibold text-text-primary">FAMM</span>
        </Link>
        {signedIn ? (
          <Link
            href={signedInHref}
            className={cn(
              "inline-flex h-10 items-center justify-center rounded-control",
              "bg-accent px-inset-md text-sm font-medium text-onAccent",
              "transition-colors duration-fast ease-standard hover:bg-accent-hover",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            )}
          >
            Open dashboard
          </Link>
        ) : (
          <Link
            href="/login"
            className={cn(
              "inline-flex h-10 items-center justify-center rounded-control",
              "px-inset-md text-sm font-medium text-text-primary",
              "transition-colors duration-fast ease-standard hover:bg-surface-sunken",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            )}
          >
            Sign in
          </Link>
        )}
      </div>
    </SafeAreaInset>
  );
}
