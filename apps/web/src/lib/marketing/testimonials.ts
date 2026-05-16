export interface Testimonial {
  id: string;
  name: string;
  title: string;
  quote: string;
  rating?: number;
}

export const TESTIMONIALS: ReadonlyArray<Testimonial> = [
  {
    id: "t1",
    name: "Maya R.",
    title: "Solo strength coach · Brooklyn",
    quote:
      "Switched in a weekend. My no-show rate dropped from 11% to under 3% in the first month, just from the SMS reminders.",
    rating: 5,
  },
  {
    id: "t2",
    name: "Devon K.",
    title: "Co-owner, three-trainer studio · Austin",
    quote:
      "Payouts that just land. Client gets a clean checkout, I get the cash. We stopped writing 'sorry the link is broken' emails entirely.",
    rating: 5,
  },
  {
    id: "t3",
    name: "Priya S.",
    title: "Online & in-person hybrid · London",
    quote:
      "I run my whole business from the phone between clients. The 'Next up' card is the only screen I look at most days.",
    rating: 5,
  },
];
