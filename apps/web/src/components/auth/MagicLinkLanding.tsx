"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Spinner, ErrorState } from "@famm/ui";
import { AuthApiError, verifyMagicLink } from "@/lib/api/auth";

interface MagicLinkLandingProps {
  token: string | null;
  email: string | null;
  tenant: string | null;
}

type State =
  | { kind: "verifying" }
  | { kind: "success" }
  | { kind: "error"; title: string; description: string };

const MISSING_PARAMS_STATE: State = {
  kind: "error",
  title: "This link is incomplete",
  description:
    "Reopen the email and tap the sign-in link again. If you've copied the URL by hand, make sure no parameters are missing.",
};

export function MagicLinkLanding({ token, email, tenant }: MagicLinkLandingProps) {
  const router = useRouter();
  const [state, setState] = React.useState<State>(
    !token || !email || !tenant ? MISSING_PARAMS_STATE : { kind: "verifying" }
  );

  React.useEffect(() => {
    if (!token || !email || !tenant) return;
    let cancelled = false;
    void (async () => {
      try {
        await verifyMagicLink({ token, email, tenant });
        if (cancelled) return;
        setState({ kind: "success" });
        // Server set cookies on the response; navigate to / and let the
        // role-aware redirect route to the right home.
        router.push("/");
        router.refresh();
      } catch (err) {
        if (cancelled) return;
        const apiErr = err instanceof AuthApiError ? err : null;
        const expired =
          apiErr?.code === "TOKEN_EXPIRED" ||
          apiErr?.code === "INVALID_TOKEN" ||
          apiErr?.code === "TOKEN_ALREADY_USED";
        setState({
          kind: "error",
          title: expired ? "This sign-in link has expired" : "We couldn't sign you in",
          description: expired
            ? "Magic links expire after 15 minutes and can only be used once. Request a fresh one below."
            : (apiErr?.message ?? "Something went wrong on our side. Try again in a moment."),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, email, tenant, router]);

  if (state.kind === "verifying" || state.kind === "success") {
    return (
      <div className="flex flex-col items-center gap-stack-sm py-stack-md">
        <Spinner aria-label="Signing you in" />
        <p className="text-sm text-text-secondary">
          {state.kind === "verifying" ? "Signing you in…" : "Welcome back."}
        </p>
      </div>
    );
  }

  return (
    <ErrorState
      title={state.title}
      description={state.description}
      secondaryAction={
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center rounded-control border border-border bg-surface px-inset-md text-sm font-medium text-text-primary transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          Back to sign-in
        </Link>
      }
    />
  );
}
