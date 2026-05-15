# Landing page

Status: Pattern documentation. Applies to marketing surfaces in
`apps/web` under `/` and feature-specific landing routes (`/trainers`,
`/programs/<slug>`).

A landing page is the FAMM brand's first impression for a non-logged-in
visitor. Its job is to communicate "this is the product for me" and
move the visitor to a single, well-scoped next step — sign up, see
pricing, or contact sales.

There is one canonical landing-page layout for the FAMM marketing site.
Feature pages may rearrange sections but cannot invent new ones. New
section types require DS-owner approval.

---

## 1. Purpose

Convert a stranger into a registered user — or, if they're not ready,
into someone with enough context to come back.

The pattern owns:

- The marketing surface's visual identity (more energetic than the
  product app; same tokens).
- The conversion ladder: headline → proof → product → pricing → CTA.
- The shared anchors (top nav, footer, cookie banner).
- The single CTA per section rule.
- The performance budget (≤ 2s LCP on a median mobile connection).

A landing page is **not** a content marketing post (those live under
`/blog`, with a different layout) and **not** a product surface
(those require auth).

---

## 2. Recommended layout

Sections, top to bottom, in canonical order:

1. **Hero.** Headline + sub-headline + primary CTA + supporting visual.
   One CTA only. Full-bleed on `≥md`, stacked on `<md`.
2. **Social proof strip.** A row of logos, a one-line testimonial
   quote, or a single metric ("12,000 athletes training with FAMM").
3. **What it does.** 3 features, each a stat-card-shaped tile with
   icon + heading + 1–2 sentence body. The features ladder from
   broadest to most specific.
4. **How it works.** A 3-step diagram with one screenshot per step,
   showing the product flow.
5. **Featured trainers / programs (optional).** A horizontally
   scrollable carousel of `StatCard`-shaped items.
6. **Pricing teaser.** A simplified pricing table (2–3 tiers) with a
   link to the full pricing page.
7. **Secondary social proof.** A longer testimonial or a case-study
   excerpt with a real name and photo.
8. **Final CTA.** A repeat of the hero's CTA, framed as a
   commitment ("Start your first workout"), with one line of supporting
   copy.
9. **Footer.** Standard site footer — links, legal, locale switcher.

Section spacing is `space.stack.xl` between sections, `space.stack.lg`
inside.

---

## 3. Required components

All from `@famm/ui` unless noted:

- `Navigation` (`context="marketing"`) — top of every page.
- `Button` — primary CTAs (`variant="default"`, `size="lg"` in the
  hero and final-CTA sections, `size="md"` elsewhere).
- `Card` — the "what it does" feature tiles.
- `Badge` — for new / beta callouts in hero.
- `Tabs` — only inside the "how it works" section if the flow has
  branching paths.
- `Accordion` — for an FAQ section if one is added.
- `Footer` (L3 pattern in `apps/web/src/components/marketing/footer.tsx`).
- An L3 `Hero` component composing `Text`, `Button`, and an image
  primitive lives in `apps/web/src/components/marketing/` — extracted
  to L2 once two landing pages share it.

Never compose a landing page out of raw `<div>` and Tailwind. If a
section's shape can't be expressed by existing components, propose a
new one.

---

## 4. Content hierarchy

- **One H1 per page** — the hero headline.
- **H2** for each top-level section ("What it does", "How it works",
  "Pricing").
- **H3** for sub-cards inside a section (each feature tile's title).
- **Body** at `font.role.body` for everything else.

Copy rules:

- The headline answers "what is this and who is it for?" in ≤ 10
  words.
- Sub-headline expands on the headline; ≤ 2 sentences.
- Every CTA label is verb-first and product-specific: "Start training"
  beats "Get started".
- One CTA per section. Repeated identical CTAs at hero and footer are
  encouraged; *different* CTAs in the same section are banned.
- No marketing superlatives without a number behind them. "Faster" is
  a smell; "40% fewer mid-workout taps" is fine.
- Testimonials carry a real name, role, and photo (or no testimonial).

---

## 5. Responsive behavior

| Breakpoint | Hero                                | Section grids                  | Section spacing |
|------------|-------------------------------------|--------------------------------|-----------------|
| `<sm`      | Stacked: headline → image → CTA     | Single column                  | `space.stack.lg` |
| `sm`–`md`  | Stacked, wider type                 | Single column                  | `space.stack.lg` |
| `md`–`lg`  | Two-column: text left, image right  | 2-column feature grid          | `space.stack.xl` |
| `≥lg`      | Two-column with wider gutter        | 3-column feature grid          | `space.stack.xl` |

Images are responsive (`<picture>` with WebP/AVIF) with explicit
`width`/`height` to prevent layout shift. The hero image preloads;
below-the-fold images lazy-load.

The mobile CTA in the hero is full-width via `className="w-full"`.

---

## 6. Accessibility requirements

- **Semantic landmarks.** `<header>` for the nav, `<main>` for the page
  body, `<footer>` for the footer. Each section is a `<section>` with
  an `aria-labelledby` pointing at its H2.
- **Skip link.** "Skip to main content" before the nav, becomes visible
  on focus.
- **Headings.** Exactly one H1; H2s are siblings; H3s nest inside H2
  sections. No level skipping.
- **Images.** Decorative images carry `alt=""`. Content images carry
  meaningful alt text describing the subject — not "image of."
- **Videos.** Hero videos are captioned and have a poster frame; they
  do not autoplay with sound. A pause control is mandatory if they
  autoplay silently.
- **Color contrast.** All hero text on imagery passes AA against the
  darkest pixel of the image (use a tint overlay if needed).
- **Reduced motion.** Any hero animation (fade, parallax) collapses to
  a static composition under `prefers-reduced-motion`.
- **Focus.** Every interactive element shows a `color.border.focus`
  ring; never removed.
- **Keyboard.** Every CTA, link, and form control reachable via `Tab`.
- **Lighthouse a11y ≥ 95** in CI for the public landing routes.

---

## 7. Conversion considerations

The pattern is here to convert. Track and tune:

- **Above-the-fold CTA visible on every viewport.** If the CTA is below
  the fold on a 360×640 phone, redesign.
- **One CTA per section, ladder to the same destination.** Hero and
  final-CTA point to the same `/signup` route.
- **Social proof appears before pricing.** Visitors who haven't bought
  in won't believe the price.
- **Pricing teaser, not full pricing.** Full pricing has its own page
  (`/pricing`) — sending the visitor there is a step forward.
- **No exit-intent modals.** No newsletter modal pop-ups on first visit.
  No "are you sure you want to leave?" interceptions. Those tank trust
  and conversion.
- **Page weight.** The hero — text and one image — fits within the
  initial 1MB budget. Below-the-fold assets lazy-load.
- **Time to interactive ≤ 2.5s** on a Moto G class device on 4G. A
  landing page that needs 800KB of JS is broken.
- **Form on the page wins over form behind a button** for top-of-funnel
  signups (email-only signup as the primary CTA is a strong default
  for newcomers).
- **A/B tests** run via the configured GrowthBook gate. Variants must
  remain accessible — never ship a test that hides the focus ring or
  the alt text.

---

## 8. Common mistakes

- Hero headline that praises the company instead of describing the
  product ("We're passionate about fitness." — meaningless to a
  visitor).
- Multiple competing CTAs in the hero ("Sign up" + "Watch demo" +
  "See pricing" — pick one).
- Animation as decoration. Motion goes on **signal** moments; a
  landing-page hero is not one of them.
- Stock photos of generic gym shots. Use real product screenshots and
  real customer photos.
- Pricing table on the landing page is the full pricing table. Tease,
  link out.
- Long-form content that should be a blog post. Landing pages are
  scannable; blog posts are deep.
- Custom hero font / hand-rolled buttons / inline `style={}` to hit a
  brand brief. The brief lives in tokens; the landing page consumes
  tokens.
- Form fields without labels because "the design looks cleaner."
  That's an accessibility bug and a conversion bug — autofill and
  password managers depend on labels.

---

## 9. AI implementation instructions

1. **Route.** `apps/web/src/app/page.tsx` (the home landing page);
   feature landing pages under `apps/web/src/app/<slug>/page.tsx`.
2. **Compose from `@famm/ui` only.** Hero composition lives in
   `apps/web/src/components/marketing/`; reach for it before drawing a
   new hero.
3. **One H1, one primary CTA per section, real social proof.** These
   are not opinions; they're enforced in review.
4. **Image budget.** Hero image ≤ 200KB after compression, served as
   `<picture>` with AVIF/WebP fallbacks and explicit `width`/`height`.
5. **Don't import a UI library** other than `@famm/ui`. Don't add a
   marketing-specific shadcn / Framer / etc. Reuse or extend the DS.
6. **Animations** go through `useReducedMotion()`. Don't write a media
   query.
7. **CTAs** are `Button variant="default" size="lg"` in the hero and
   final-CTA sections; `size="md"` in the body. Never custom-styled.
8. **Pricing teaser** uses the same `Card`-based tile shape as the
   features section. Link out to `/pricing`.
9. **Marketing nav** is `Navigation context="marketing"`. Don't write
   a one-off top bar.
10. **SEO.** Set `<title>`, `<meta name="description">`, and OG tags
    via Next.js `generateMetadata`. Pages without those are incomplete.
11. **Analytics.** Fire a single `landing_view` event with the
    page's slug; CTA clicks fire `landing_cta_click` with the
    destination route. Don't sprinkle one-off analytics.
12. **Don't reach for animated SVG hero illustrations** unless they're
    in the brand kit — improvising is drift.
