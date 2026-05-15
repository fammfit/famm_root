import { ToastProvider } from "@/components/ui/Toast";
import { TrainerCalendar } from "@/components/booking/TrainerCalendar";

export const dynamic = "force-dynamic";

export default function CalendarPage() {
  return (
    <ToastProvider>
      <TrainerCalendar />
    </ToastProvider>
  );
}
