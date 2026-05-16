# Empty states

Status: Pattern documentation. Applies to any surface that can render
without content: feeds, tables, search results, dashboards, inboxes,
notifications panels.

An empty state is not a problem to hide — it's the cheapest tutorial
you'll ever write. The pattern's job is to tell the user *why* it's
empty and *what to do next*, in that order.

There is one canonical EmptyState component; surfaces compose it.
Hand-drawn empty illustrations and bespoke "no data" messages are a
review failure.

---

## 1. Purpose

Replace "nothing here" with a meaningful, actionable state. The
pattern owns:

- The empty visual (icon — no full illustrations by default).
- The H3 title (one short sentence).
- The H4 / body description (≤ 2 sentences).
- The primary action `Button` that leads the user to populate the
  surface.
- An optional secondary action ("Learn more" link).

Three kinds of empty states, each with slightly different intent:

1. **First-use.** "You haven't logged a workout yet." — onboarding.
2. **Filtered.** "No workouts match 'cardio'." — let users clear the
   filter.
3. **Genuine zero.** "You're all caught up." — celebratory, calm.

---

## 2. Recommended layout

A centred column inside the surface bounds:

1. **Icon.** 48px from `lucide-react` (`Inbox`, `Search`,
   `CheckCircle2`, etc.). Subtle tint via `color.text.muted`.
2. **Title.** H3 (`text-h4` or `text-lg`), `font.weight.semibold`,
   `color.text.primary`.
3. **Description.** Body text in `color.text.secondary`. ≤ 2
   sentences.
4. **Primary action.** `Button variant="default"` for first-use;
   `variant="secondary"` for filtered-empty (typically "Clear
   filters").
5. **Secondary action (optional).** `Link` to docs, help, or a
   related screen.

Vertical rhythm `space.stack.sm` between icon and title;
`space.stack.xs` between title and description; `space.stack.md`
before the action.

The block is vertically centred inside the parent's available
height when the surface allows; otherwise top-aligned with
`space.stack.xl` margin.

---

## 3. Required components

- `EmptyState` (L2 pattern at
  `packages/ui/src/components/patterns/empty-state.tsx` when shipped)
  — composes the icon, title, description, and actions.
- `Icon` (`lucide-react`).
- `Button` — primary action.
- `Link` — secondary action.
- `Card` — when the empty surface is a Card-bound region (an empty
  list inside a dashboard tile).

---

## 4. Content hierarchy

- **Title.** A noun-phrase sentence stating the absence. "No workouts
  yet." "No matches for that search." Sentence case, terminal period.
- **Description.** Explain why and what to do. "Log your first set to
  start building your week." "Try a broader search or clear filters."
- **Primary action label.** Verb-first, specific. "Log first workout",
  "Clear filters", "Invite a teammate".
- **Secondary action.** "Learn more", "Read the guide".

Copy rules:

- Don't apologise. "Sorry, no results" is unhelpful.
- Don't celebrate trivially. "You're all caught up" only when the user
  has actually done something.
- For first-use, frame as opportunity, not lack. "Your first workout
  starts here." beats "You haven't done anything."
- No emoji, no exclamation marks (except the rare PR moment).

---

## 5. Responsive behavior

| Breakpoint | Layout                                                       |
|------------|--------------------------------------------------------------|
| `<sm`      | Full-width with `space.inset.md` page inset. Action button `w-full`. |
| `sm`–`md`  | Centred column, max-width ~ 360px.                           |
| `≥md`      | Centred column, max-width ~ 480px.                           |

The block centres horizontally within the parent at all breakpoints.

---

## 6. Accessibility requirements

- **Heading hierarchy.** Title is the appropriate heading level for
  its containing region (often H3 inside a section). Don't use a
  larger heading than the section it lives in.
- **Icon.** Decorative — `aria-hidden="true"`. The title carries the
  meaning.
- **Live region.** When an empty state replaces previously-populated
  content (e.g. after the user applies a filter), wrap in
  `role="status" aria-live="polite"` so the change is announced.
- **Action button.** Standard Button a11y — accessible name, focus
  ring, keyboard activation.
- **Color independence.** The empty state's meaning is in the text;
  do not rely on the muted icon color alone to signal "empty".
- **Reduced motion.** No entrance animations by default. If an
  illustration is used, it does not animate.

---

## 7. Conversion considerations

Empty states convert curious users into active users. They're the
highest-leverage UI on the screen when there's nothing else.

- **First-use empty states are the onboarding spillover.** Many users
  skip the wizard; the empty dashboard is their second chance.
- **One primary action.** Tell them the obvious next step.
- **Don't show 0 / "0 items" / blank cards.** Always render the
  empty state instead — a numeric zero is hostile.
- **Filtered empty states return control.** Always show a "Clear
  filters" action; never let the user dead-end.
- **Empty leads to product education.** A secondary "Learn how
  workouts work" link beats a marketing pop-up.
- **Measure.** Empty-state CTA clicks are a leading indicator of
  activation. Instrument every primary action.

---

## 8. Common mistakes

- Rendering "0" instead of an empty state.
- A spinner forever for an empty resource. Distinguish "loading"
  from "empty"; render the empty state when the request resolves
  with no data.
- Custom illustrations per surface. Pick one icon style and stick to
  it.
- Empty states with no action. Always offer a next step.
- "No data available." as the only copy. Be specific.
- Empty state inside a Card with the Card's chrome (header, footer)
  still visible — the chrome implies content. Either hide the chrome
  or show a meaningful inner empty state.
- Two competing CTAs (primary + secondary, both `default`). One
  primary.
- Filter-empty without a "Clear filters" affordance.

---

## 9. AI implementation instructions

1. **Import (once shipped).**
   `import { EmptyState } from "@famm/ui";`.
2. **Never render "0" or a blank surface.** If data resolves to zero
   items, render `<EmptyState />`.
3. **Pick the right kind:**
   - First use of a feature → `kind="firstUse"`, primary action that
     starts the feature.
   - User filtered to zero → `kind="filtered"`, primary action is
     "Clear filters".
   - Truly empty (inbox zero) → `kind="zero"`, no primary action or a
     low-key one.
4. **Icon choices** come from `lucide-react`. Common picks: `Inbox`,
   `Search`, `Calendar`, `Trophy`, `Plus`, `CheckCircle2`. One icon
   per surface — don't switch icons per locale or per session.
5. **Distinguish loading from empty.** Show the loading skeleton
   while fetching; flip to EmptyState only when the response is empty.
6. **Live region.** When the empty state replaces prior content
   (filtered case), the wrapper is `role="status" aria-live="polite"`.
7. **No marketing in the description.** Explain absence and offer the
   action. Save promotion for `/pricing`.
8. **Analytics.** Fire `empty_state_view` with the surface key and
   the kind. CTA clicks fire `empty_state_cta_click`.
9. **No custom illustration components** unless the brand kit ships
   them. Until then, icons only.
10. **Layout.** Centre inside the parent's available height when the
    parent is the page; top-align with margin when the parent is a
    Card with chrome.
