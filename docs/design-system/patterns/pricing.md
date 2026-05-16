# Pricing

Status: Pattern documentation. Applies to `apps/web/src/app/pricing/`
and to the in-product upgrade flow at
`apps/web/src/app/(app)/billing/upgrade/`.

The pricing page is the bottom of the conversion funnel for marketing
and the top of the upgrade flow for product. The pattern's job is to
make the right plan obvious, the unit-of-value clear, and the act of
choosing low-friction.

---

## 1. Purpose

Help a visitor or user pick a plan with confidence and start a
checkout. Communicate value before price; never the reverse.

The pattern owns:

- The plan comparison table (Free / Pro / Team).
- The recommended-plan visual emphasis.
- Monthly / annual toggle with the savings highlighted.
- Feature comparison details (collapsible on mobile, full on desktop).
- The FAQ section addressing the top 5 pre-purchase questions.
- The CTA per tier (`Start free`, `Subscribe`, `Contact sales`).

---

## 2. Recommended layout

1. **Hero band.** Headline + 1-line value prop + monthly/annual toggle.
2. **Plan cards row.** 2–3 cards side by side. One marked "Recommended"
   with a `Badge variant="pr"` (sparingly) or accent border.
3. **Feature comparison table.** Full matrix of features × plans. On
   `<md`, this collapses into per-plan accordions inside each card.
4. **FAQ.** `Accordion` with 4–8 questions.
5. **Footer band.** Trust signals — "Cancel anytime", payments
   provider logos, money-back guarantee — and a final CTA.

Section spacing `space.stack.xl`.

---

## 3. Required components

All from `@famm/ui`:

- `Navigation` (`context="marketing"` for `/pricing`,
  `context="product"` for `/billing/upgrade`).
- `Card` — each plan tile.
- `Button` — plan CTA (one `default` on the recommended plan;
  `secondary` on others).
- `Badge` — for "Recommended", "Save 20%", "Beta".
- `Table` (L2) — the feature comparison matrix.
- `Accordion` — FAQ and mobile feature comparison.
- `Toast` — for "Switched to annual billing" confirmations during
  in-product upgrade.
- A future `BillingToggle` L2 pattern wraps `SegmentedControl` (when
  shipped) for monthly/annual.

---

## 4. Content hierarchy

- **H1.** "Simple pricing. Train more, pay less." or similar — once.
- **H2.** Section labels ("Compare plans", "Common questions").
- **H3.** Plan name inside each card (`CardTitle`).
- **Plan price.** Largest visual element on the card; use
  `font.role.display` or `font.role.h1`. Per-period suffix in
  `font.role.label`.
- **Feature list inside each card.** Short bullet points, ≤ 5
  per card.

Copy rules:

- Lead with the **value**, not the feature list. "Train with verified
  coaches" beats "10 user seats".
- Prices are in the user's local currency where supported; otherwise
  default to USD with a clear currency code.
- Period suffix is "/month, billed annually" or "/month" — never
  "/mo" or "monthly" alone (ambiguous).
- "Free forever" beats "Free trial" if it's actually free forever.
- "Contact sales" plans show "Custom" instead of a number.
- No fake-anchor pricing ("Was $99 / Now $19!" without an actual
  history).

---

## 5. Responsive behavior

| Breakpoint | Layout                                                       |
|------------|--------------------------------------------------------------|
| `<sm`      | Single column. Plan cards stacked, recommended plan first. Feature comparison inside an Accordion per card. |
| `sm`–`md`  | Single column with wider cards.                              |
| `md`–`lg`  | 2-column for 2 plans; 3-column for 3 plans. Full comparison Table below the cards. |
| `≥lg`      | Same as `md`, with the comparison Table sticky-header on scroll. |

Plan cards have equal height across breakpoints. Don't let one card
stretch.

---

## 6. Accessibility requirements

- **Landmarks.** `<main>` containing `<section>` per band. FAQ inside
  a `<section aria-labelledby>`.
- **Plan cards as articles.** Each plan card is an `<article>` with an
  accessible name from the plan name.
- **Recommended emphasis** — communicated by a Badge text
  ("Recommended"), not just a colored border.
- **Toggle.** Monthly/annual uses the Radio (grouped) or future
  SegmentedControl pattern, with `aria-labelledby="billing-period"`.
- **Price changes** announce via `aria-live="polite"` when toggling
  monthly/annual.
- **Currency.** `lang` and `dir` on the price string when the locale
  uses a non-Latin script.
- **Color contrast.** Recommended-tier emphasis passes AA against both
  light and dark themes.
- **Focus.** Every plan CTA reachable via `Tab` in order: monthly/annual
  toggle → plan 1 → plan 2 → plan 3 → FAQ.
- **Reduced motion.** Card hover lifts collapse to static under
  reduced-motion.

---

## 7. Conversion considerations

- **One recommended plan.** "Choice paralysis" is real — pick the
  middle plan, mark it, and explain why.
- **Value before price.** Plan names communicate scope; prices come
  second.
- **Annual savings front and centre.** Show the % saved on the
  toggle, not buried in fine print.
- **Trial vs free vs paid.** Be explicit about which is which on each
  card.
- **No hidden fees.** Setup fees, per-seat fees, overages — all
  visible on the card or one tap away.
- **Trust signals near the CTA.** "Cancel anytime", "Secure checkout",
  payment provider marks.
- **Frictionless start.** "Start free" CTA on the free tier goes
  straight to signup, not to "Schedule a demo".
- **Sales-assisted tier.** "Contact sales" → form, not "email us at
  …".
- **A/B tests** behind the GrowthBook gate, with explicit guard
  against breaking accessibility.

---

## 8. Common mistakes

- Three plans where two would do.
- Plan names that don't communicate scope ("Plus" vs "Premium" vs
  "Pro" — pick names that say what they do).
- Feature lists that read identically across plans except for one
  line. Reorganise around the differentiators.
- Hiding the price until "Contact us". Acceptable for enterprise
  only; bad for self-serve.
- Toggle that defaults to monthly when annual is the recommended
  experience.
- Marketing copy in the feature list ("Award-winning support") —
  swap for the concrete thing ("24h email response").
- Recommended badge on every tier. One.
- Cards of different heights because someone's feature list is longer.

---

## 9. AI implementation instructions

1. **Route.** `apps/web/src/app/pricing/page.tsx` (marketing) and
   `apps/web/src/app/(app)/billing/upgrade/page.tsx` (in-product). Same
   pattern, different chrome.
2. **Plans as data.** Define plans in a typed config
   (`apps/web/src/lib/billing/plans.ts`) with `{ id, name, summary,
   price: { monthly, annual }, features, cta, recommended? }`. The
   pricing page renders from the config.
3. **One recommended plan.** `recommended: true` on exactly one
   config entry — runtime asserts it.
4. **Use `Card` + `Button`.** Plan tiles are Cards. CTA on the
   recommended plan is `variant="default"`; others are
   `variant="secondary"`.
5. **Monthly/annual toggle.** Use the Radio (grouped, `type="card"`)
   for now; switch to `SegmentedControl` when shipped.
6. **Feature comparison.** `Table` on `≥md`; `Accordion`-per-card on
   `<md`. Same data source, two views.
7. **FAQ.** `Accordion type="single"` with 4–8 entries.
8. **Prices** rendered via a typed currency formatter — never hard-code
   strings.
9. **Don't compute discount percentages in JSX.** Compute them in the
   config so they're testable.
10. **Analytics.** `pricing_view`, `pricing_plan_click` (with plan id
    and period), `pricing_period_toggle`. Don't add per-button events.
11. **No raw Tailwind for plan styling.** Card + token-driven utilities
    only.
12. **Checkout** is handed off to the payments service per
    `docs/PAYMENTS.md`. The pricing page never collects card details.
