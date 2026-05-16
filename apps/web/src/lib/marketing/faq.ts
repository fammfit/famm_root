export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const FAQ: ReadonlyArray<FaqItem> = [
  {
    id: "q-trial",
    question: "What's actually included in the free trial?",
    answer:
      "Every feature, unlimited clients, unlimited bookings, real Stripe payouts. No tier-locked surprises — if it's in the app, you can use it.",
  },
  {
    id: "q-card",
    question: "Do I need a credit card to start?",
    answer:
      "No. You'll add one when you decide to keep going. The trial ends quietly — you won't get auto-charged.",
  },
  {
    id: "q-migration",
    question: "Can I bring my clients over from another app?",
    answer:
      "Yes. Import from CSV or invite clients en masse — they verify their phone or email and land in your portal already linked to their booking history.",
  },
  {
    id: "q-payments",
    question: "How do payments work?",
    answer:
      "Stripe Connect, paid out on the schedule you choose (daily, weekly, monthly). You set the prices; we never touch the money.",
  },
  {
    id: "q-cancel",
    question: "What happens if I cancel?",
    answer:
      "Export everything as CSV, hand off your active bookings, and walk away. Your data is yours.",
  },
  {
    id: "q-team",
    question: "Can my whole team use it?",
    answer:
      "Yes. Invite trainers, staff, and a lead role with finer-grained permissions. Each gets their own login.",
  },
  {
    id: "q-platforms",
    question: "Do I need an app store install?",
    answer:
      "No. It works in your browser today; we ship to iOS and Android later this year if you want the home-screen icon.",
  },
];
