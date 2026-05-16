import { PublicShell } from "@/components/layouts/PublicShell";

export default function NewTrainerOfferLoading() {
  return (
    <PublicShell signedInRole={null}>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-stack-md px-inset-md py-stack-xl md:px-inset-lg md:py-stack-2xl">
          <div className="h-6 w-32 animate-pulse rounded-pill bg-surface-sunken" />
          <div className="h-10 w-3/4 animate-pulse rounded-control bg-surface-sunken" />
          <div className="h-5 w-1/2 animate-pulse rounded-pill bg-surface-sunken" />
          <div className="flex gap-inline-sm">
            <div className="h-12 w-40 animate-pulse rounded-control bg-surface-sunken" />
            <div className="h-12 w-40 animate-pulse rounded-control bg-surface-sunken" />
          </div>
        </div>
      </section>
      <div className="mx-auto w-full max-w-6xl px-inset-md py-stack-xl md:px-inset-lg">
        <div className="grid grid-cols-1 gap-stack-md sm:grid-cols-2 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-card bg-surface-sunken" />
          ))}
        </div>
      </div>
    </PublicShell>
  );
}
