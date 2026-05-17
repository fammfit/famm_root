import { AppBar } from "@/components/nav/AppBar";

export default function MyBookingsLoading() {
  return (
    <>
      <AppBar title="Bookings" />
      <div className="flex flex-col gap-stack-md p-inset-md md:p-inset-lg">
        <div className="h-11 animate-pulse rounded-pill bg-surface-sunken" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-card bg-surface-sunken" />
        ))}
      </div>
    </>
  );
}
