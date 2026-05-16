import * as React from "react";

const STEPS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "Make an account",
    body: "Email or phone — verify and you're in. Under a minute.",
  },
  {
    title: "Set up your business",
    body: "Add your services, hours, and Stripe. Optional Google Calendar sync.",
  },
  {
    title: "Send the link",
    body: "Share your public booking link. Clients self-serve from there.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how"
      aria-labelledby="how-heading"
      className="border-t border-border bg-surface-sunken"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-stack-lg px-inset-md py-stack-xl md:px-inset-lg md:py-stack-2xl">
        <header className="flex flex-col gap-stack-xs">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            How it works
          </p>
          <h2 id="how-heading" className="text-2xl font-semibold text-text-primary md:text-3xl">
            Three steps. Most trainers are taking bookings the same day.
          </h2>
        </header>
        <ol className="flex flex-col gap-stack-md md:grid md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              className="flex flex-col gap-stack-xs rounded-card border border-border bg-surface p-inset-md"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-pill bg-accent text-onAccent text-sm font-semibold"
              >
                {i + 1}
              </span>
              <h3 className="text-base font-semibold text-text-primary">{s.title}</h3>
              <p className="text-sm text-text-secondary">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
