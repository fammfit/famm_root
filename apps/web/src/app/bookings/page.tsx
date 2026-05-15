import { ToastProvider } from "@/components/ui/Toast";
import { BookingsList } from "@/components/booking/BookingsList";

export const dynamic = "force-dynamic";

export default function BookingsPage() {
  return (
    <ToastProvider>
      <BookingsList />
    </ToastProvider>
  );
}
