import { Card } from "@famm/ui";
import { AppBar } from "@/components/nav/AppBar";

export default function MyHomeLoading() {
  return (
    <>
      <AppBar title="Home" />
      <div className="flex flex-col gap-stack-lg p-inset-md md:p-inset-lg">
        <div className="flex flex-col gap-stack-xs">
          <div className="h-3 w-32 animate-pulse rounded-pill bg-surface-sunken" />
          <div className="h-8 w-56 animate-pulse rounded-control bg-surface-sunken" />
        </div>

        <section className="flex flex-col gap-stack-sm">
          <div className="h-5 w-24 animate-pulse rounded-pill bg-surface-sunken" />
          <Card className="p-inset-md">
            <div className="flex flex-col gap-stack-sm">
              <div className="h-4 w-40 animate-pulse rounded-pill bg-surface-sunken" />
              <div className="h-6 w-48 animate-pulse rounded-control bg-surface-sunken" />
              <div className="h-4 w-32 animate-pulse rounded-pill bg-surface-sunken" />
              <div className="h-10 w-36 animate-pulse rounded-control bg-surface-sunken" />
            </div>
          </Card>
        </section>

        <section>
          <div className="grid grid-cols-2 gap-stack-sm">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="p-inset-md">
                <div className="flex flex-col gap-stack-xs">
                  <div className="h-3 w-16 animate-pulse rounded-pill bg-surface-sunken" />
                  <div className="h-8 w-12 animate-pulse rounded-control bg-surface-sunken" />
                  <div className="h-3 w-20 animate-pulse rounded-pill bg-surface-sunken" />
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
