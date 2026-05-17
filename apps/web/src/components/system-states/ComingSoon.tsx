import * as React from "react";
import { Sparkles } from "lucide-react";
import { EmptyState } from "@famm/ui";

interface ComingSoonProps {
  /** Surface name. Used in the headline ("Messages — coming soon"). */
  surface: string;
  /** One-line context about what will live here. */
  description?: string;
  /** Optional escape hatch (link back to a working surface). */
  secondaryAction?: React.ReactNode;
}

/**
 * Placeholder shown for routes that are wired to navigation but not yet
 * implemented. Prefer this over a 404 so the tab bar always lands somewhere
 * coherent during the buildout.
 */
export function ComingSoon({
  surface,
  description = "We're building this surface next. Check back soon.",
  secondaryAction,
}: ComingSoonProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-inset-md">
      <EmptyState
        icon={<Sparkles aria-hidden className="h-6 w-6" />}
        title={`${surface} — coming soon`}
        description={description}
        secondaryAction={secondaryAction}
      />
    </div>
  );
}
