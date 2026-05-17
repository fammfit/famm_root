import * as React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@famm/ui";

export interface VerificationBadgeProps {
  verified: boolean;
  /** Called when the user taps the unverified-state action. */
  onVerify?: () => void;
  /** Override the "Verify" action label. */
  verifyLabel?: string;
}

/**
 * Compact verified / unverified pill paired with an inline action. Used by
 * email and phone fields here, will be reused by /settings/profile later.
 */
export function VerificationBadge({
  verified,
  onVerify,
  verifyLabel = "Verify",
}: VerificationBadgeProps) {
  if (verified) {
    return (
      <Badge variant="success">
        <CheckCircle2 aria-hidden className="mr-inline-xs h-3 w-3" />
        Verified
      </Badge>
    );
  }
  return (
    <span className="inline-flex items-center gap-inline-xs">
      <Badge variant="warning">
        <AlertCircle aria-hidden className="mr-inline-xs h-3 w-3" />
        Unverified
      </Badge>
      {onVerify ? (
        <button
          type="button"
          onClick={onVerify}
          className="text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
        >
          {verifyLabel}
        </button>
      ) : null}
    </span>
  );
}
