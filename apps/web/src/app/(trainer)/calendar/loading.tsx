import { AppBar } from "@/components/nav/AppBar";

export default function CalendarLoading() {
  return (
    <>
      <AppBar title="Calendar" />
      <div className="flex flex-col gap-stack-md p-inset-md">
        <div className="flex gap-inline-sm overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-16 w-12 shrink-0 animate-pulse rounded-card bg-surface-sunken"
            />
          ))}
        </div>
        <div className="flex flex-col gap-stack-xs">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-card bg-surface-sunken" />
          ))}
        </div>
      </div>
    </>
  );
}
