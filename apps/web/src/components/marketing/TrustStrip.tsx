"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Money } from "@famm/ui";
import { fetchPublicStats } from "@/lib/api/public-marketing";
import { MOCK_STATS } from "@/lib/marketing/mock-promo";

export function TrustStrip() {
  const { data } = useQuery({
    queryKey: ["public-stats"],
    queryFn: fetchPublicStats,
    initialData: MOCK_STATS,
    staleTime: 5 * 60_000,
  });

  return (
    <section aria-label="Trust by the numbers" className="border-b border-border bg-surface-sunken">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-stack-md px-inset-md py-stack-md md:gap-stack-lg">
        <Stat label="Trainers" value={`${data.trainerCount.toLocaleString()}+`} />
        <span aria-hidden="true" className="hidden h-6 w-px bg-border md:block" />
        <Stat
          label="Booked last 30 days"
          value={
            <Money
              amountCents={data.bookingsLast30dCents}
              currency="USD"
              className="text-text-primary"
            />
          }
        />
        <span aria-hidden="true" className="hidden h-6 w-px bg-border md:block" />
        <Stat label="Cities" value={data.citiesCovered.toLocaleString()} />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-inline-xs text-sm">
      <span className="font-semibold text-text-primary">{value}</span>
      <span className="text-text-secondary">{label}</span>
    </div>
  );
}
