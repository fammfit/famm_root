import {
  CalendarDays,
  Wallet,
  MessageSquare,
  FileText,
  Dumbbell,
  Bell,
  Users,
  BarChart3,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export const FEATURES: ReadonlyArray<Feature> = [
  {
    id: "calendar",
    title: "Bookings on your wrist",
    description: "Day, week, or month — with one-tap rescheduling and Google Calendar sync.",
    icon: CalendarDays,
  },
  {
    id: "payments",
    title: "Get paid without chasing",
    description:
      "Stripe checkout for new clients, auto-charge for regulars, payouts on a schedule you set.",
    icon: Wallet,
  },
  {
    id: "messaging",
    title: "Reminders that show up",
    description: "SMS confirmations, cancellation alerts, and no-show follow-ups — automatic.",
    icon: MessageSquare,
  },
  {
    id: "forms",
    title: "Forms & waivers — done",
    description:
      "Intake forms, PAR-Q, liability waivers. Signed before the first session, stored forever.",
    icon: FileText,
  },
  {
    id: "workouts",
    title: "Programs your clients open",
    description: "Build once, assign to many. Clients see the next session right in their portal.",
    icon: Dumbbell,
  },
  {
    id: "notifications",
    title: "Push that respects sleep",
    description:
      "Quiet hours, per-client channels, and a single ‘Mute everything’ toggle for vacations.",
    icon: Bell,
  },
  {
    id: "clients",
    title: "Every client, one tap away",
    description:
      "Notes, credits, packages, payment history — surfaced when they walk in, not before.",
    icon: Users,
  },
  {
    id: "analytics",
    title: "Numbers that mean something",
    description: "Revenue, retention, no-show rate — without spreadsheets, without exports.",
    icon: BarChart3,
  },
  {
    id: "ai",
    title: "Quietly smart",
    description: "Suggested reschedules during conflicts, no-show flags before they happen.",
    icon: Sparkles,
  },
];
