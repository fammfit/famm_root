"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CalendarClock, PackageOpen, Users, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Sheet, SheetHeader, SheetFooter, Button } from "@famm/ui";
import { cn } from "@/lib/cn";
import { trackEvent } from "@/lib/api/events";

/**
 * Three-slide post-onboarding tutorial. Opens automatically when the
 * dashboard URL carries `?onboarding=done`, walks the trainer through
 * Calendar / Products & Services / CRM, then sets a one-shot flag in
 * localStorage so it won't re-open on refresh.
 */

interface TutorialSlide {
  key: "calendar" | "services" | "crm";
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  description: string;
  bullets: ReadonlyArray<{ title: string; body: string }>;
  cta: { label: string; href: string };
}

const SLIDES: ReadonlyArray<TutorialSlide> = [
  {
    key: "calendar",
    icon: CalendarClock,
    eyebrow: "1 of 3 · Calendar",
    title: "Your calendar runs the show",
    description:
      "Set availability windows, block time off, and watch bookings fill the open slots — all from one screen.",
    bullets: [
      {
        title: "Drag to create a booking",
        body: "Press and hold any open slot on the day view to book a client.",
      },
      {
        title: "Sync with Google",
        body: "Connected calendars feed busy-time so clients can't book over your life.",
      },
      {
        title: "Repeat without retyping",
        body: "Set a weekly availability once and let it carry forward.",
      },
    ],
    cta: { label: "Open Calendar", href: "/calendar" },
  },
  {
    key: "services",
    icon: PackageOpen,
    eyebrow: "2 of 3 · Products & Services",
    title: "Price what you sell, your way",
    description:
      "Single sessions, packs, or recurring memberships — each one becomes a bookable service with its own duration and price.",
    bullets: [
      {
        title: "Service types",
        body: "1:1 sessions, small-group, virtual, or in-home. Mix and match.",
      },
      {
        title: "Packs and memberships",
        body: "Bundle 10 sessions, sell a monthly plan, or both. Stripe handles the money.",
      },
      {
        title: "Public booking page",
        body: "Each service becomes a row on your shareable booking link.",
      },
    ],
    cta: { label: "Set up services", href: "/services" },
  },
  {
    key: "crm",
    icon: Users,
    eyebrow: "3 of 3 · Clients",
    title: "Keep every client in one place",
    description:
      "Notes, payment history, attendance, and conversations live on each client's profile — yours alone to see.",
    bullets: [
      {
        title: "Session notes",
        body: "Pin notes to a client so the next session picks up where the last one left off.",
      },
      {
        title: "Quick invites",
        body: "Add a client by email or phone and they get a link to claim their account.",
      },
      {
        title: "Messaging",
        body: "Reply to clients without handing out your personal number.",
      },
    ],
    cta: { label: "Open Clients", href: "/clients" },
  },
] as const;

const STORAGE_KEY = "famm:onboarding:tutorial-seen";

export function WelcomeTutorialModal() {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);

  const clearParam = React.useCallback(() => {
    const next = new URLSearchParams(params.toString());
    next.delete("onboarding");
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
  }, [params, router]);

  React.useEffect(() => {
    if (params.get("onboarding") !== "done") return;
    let alreadySeen = false;
    try {
      alreadySeen = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // Private mode / disabled storage — proceed and show the modal.
    }
    if (alreadySeen) {
      clearParam();
      return;
    }
    setOpen(true);
    trackEvent({ name: "onboarding.tutorial.viewed" });
  }, [params, clearParam]);

  function close() {
    setOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // No-op: we'll just show again next refresh.
    }
    clearParam();
    trackEvent({
      name: "onboarding.tutorial.dismissed",
      payload: { slide: SLIDES[index]?.key ?? "calendar" },
    });
  }

  const slide = SLIDES[index];
  if (!slide) return null;
  const isFirst = index === 0;
  const isLast = index === SLIDES.length - 1;
  const Icon = slide.icon;

  return (
    <Sheet
      open={open}
      onClose={close}
      side="center"
      ariaLabelledBy="welcome-tutorial-title"
      className="max-w-lg"
    >
      <SheetHeader
        title={slide.title}
        description={slide.description}
        onClose={close}
        titleId="welcome-tutorial-title"
      />

      <div className="flex flex-col gap-stack-md px-inset-md pb-inset-md">
        <div className="flex items-center gap-inline-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-accent/10 text-accent">
            <Icon aria-hidden className="h-5 w-5" />
          </span>
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
            {slide.eyebrow}
          </span>
        </div>

        <ul className="flex flex-col gap-stack-sm">
          {slide.bullets.map((b) => (
            <li key={b.title} className="flex gap-inline-sm">
              <span
                aria-hidden
                className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill bg-signal-success/10 text-signal-success"
              >
                <Check className="h-3 w-3" />
              </span>
              <span className="flex flex-col gap-stack-xs">
                <span className="text-sm font-medium text-text-primary">{b.title}</span>
                <span className="text-sm text-text-secondary">{b.body}</span>
              </span>
            </li>
          ))}
        </ul>

        <Link
          href={slide.cta.href}
          onClick={() => {
            trackEvent({
              name: "onboarding.tutorial.cta_clicked",
              payload: { slide: slide.key },
            });
            close();
          }}
          className="self-start text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
        >
          {slide.cta.label} →
        </Link>

        <div className="flex items-center justify-center gap-inline-xs" aria-hidden="true">
          {SLIDES.map((s, i) => (
            <span
              key={s.key}
              className={cn(
                "h-1.5 w-1.5 rounded-pill transition-colors duration-fast ease-standard",
                i === index ? "bg-accent" : "bg-border"
              )}
            />
          ))}
        </div>
      </div>

      <SheetFooter>
        {isFirst ? (
          <Button variant="ghost" onClick={close}>
            Skip tour
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => setIndex((i) => Math.max(0, i - 1))}>
            <ArrowLeft aria-hidden className="mr-inline-xs h-4 w-4" />
            Back
          </Button>
        )}
        {isLast ? (
          <Button onClick={close}>
            <Check aria-hidden className="mr-inline-xs h-4 w-4" />
            Got it
          </Button>
        ) : (
          <Button onClick={() => setIndex((i) => Math.min(SLIDES.length - 1, i + 1))}>
            Next
            <ArrowRight aria-hidden className="ml-inline-xs h-4 w-4" />
          </Button>
        )}
      </SheetFooter>
    </Sheet>
  );
}
