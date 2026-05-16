import Link from "next/link";
import { Dumbbell } from "lucide-react";

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer role="contentinfo" className="border-t border-border bg-surface-sunken">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-stack-md px-inset-md py-stack-lg md:flex-row md:items-center md:justify-between md:px-inset-lg">
        <div className="flex items-center gap-inline-xs">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-card bg-accent text-onAccent"
          >
            <Dumbbell aria-hidden className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold text-text-primary">FAMM</span>
          <span className="text-xs text-text-muted">© {year}</span>
        </div>
        <nav aria-label="Legal" className="flex items-center gap-inline-md">
          <FooterLink href="/legal/terms">Terms</FooterLink>
          <FooterLink href="/legal/privacy">Privacy</FooterLink>
          <FooterLink href="/my">Client app</FooterLink>
          <FooterLink href="/login">Sign in</FooterLink>
        </nav>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm text-text-secondary underline-offset-4 transition-colors duration-fast ease-standard hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:underline"
    >
      {children}
    </Link>
  );
}
