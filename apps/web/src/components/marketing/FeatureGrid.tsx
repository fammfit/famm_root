import * as React from "react";
import { Card } from "@famm/ui";
import { FEATURES, type Feature } from "@/lib/marketing/features";

export function FeatureGrid() {
  return (
    <section id="features" aria-labelledby="features-heading" className="bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-stack-lg px-inset-md py-stack-xl md:px-inset-lg md:py-stack-2xl">
        <header className="flex flex-col gap-stack-xs">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            What you get
          </p>
          <h2
            id="features-heading"
            className="text-2xl font-semibold text-text-primary md:text-3xl"
          >
            Every part of the day, on the phone in your pocket.
          </h2>
        </header>
        <ul className="grid grid-cols-1 gap-stack-md sm:grid-cols-2 md:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.id}>
              <FeatureTile feature={f} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FeatureTile({ feature }: { feature: Feature }) {
  const Icon = feature.icon;
  return (
    <Card className="flex h-full flex-col gap-stack-sm p-inset-md">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 items-center justify-center rounded-card bg-accent-subtle text-accent"
      >
        <Icon aria-hidden className="h-5 w-5" />
      </span>
      <h3 className="text-base font-semibold text-text-primary">{feature.title}</h3>
      <p className="text-sm text-text-secondary">{feature.description}</p>
    </Card>
  );
}
