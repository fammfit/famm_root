# Accessibility

Baseline: **WCAG 2.2 Level AA**. Not aspirational — every change must
meet this bar before it ships. AAA where it's free.

This file is the binding source of truth. When a UX rule, motion rule,
or principle conflicts with this file, **accessibility wins**.

Each section below covers a specific surface area, in this shape: what
the rule is, how to implement it in FAMM (components, tokens, code),
and what to avoid.

The three closing sections — **developer checklist**, **AI coding
checklist**, and **common failures** — are quick references for
day-to-day work and review.

---

## 1. Semantic HTML

Use the element that means what you want. The browser, the keyboard,
and the screen reader cooperate when you do; they fight you when you
don't.

### Rules
- **Buttons are `<button>`**. Never `<div onClick>`, `<span onClick>`,
  or `<a>` styled as a button (unless it actually navigates).
- **Links are `<a href>`**. Never `<button>` styled as a link unless it
  triggers an action with no destination.
- **Forms are `<form>`**. Submission goes through `onSubmit`, not
  `onClick` on the button. Enter submits.
- **Inputs are typed**: `<input type="email">`, `<input type="tel">`,
  `<input type="number">` only when arithmetic is intended (use
  `inputMode` for keyboard hint without arithmetic).
- **Lists are `<ul>` / `<ol>` / `<li>`**. Definition pairs use
  `<dl>` / `<dt>` / `<dd>`.
- **Headings nest sequentially** (`h1 → h2 → h3 → h4`). One `<h1>` per
  page; never skip a level for visual weight.
- **Landmarks**: exactly one `<main>` per page; `<nav>`, `<aside>`,
  `<header>`, `<footer>` where they apply.
- **`<table>` for tabular data.** Grid-of-divs is not tabular.
- **`<dialog>` (or a dialog primitive) for modals**, not floating
  `<div>`s.

### Good
```tsx
<main>
  <h1>Bookings</h1>
  <nav aria-label="Booking filters">
    <ul>
      <li><a href="?status=upcoming">Upcoming</a></li>
      <li><a href="?status=past">Past</a></li>
    </ul>
  </nav>
  <section aria-labelledby="upcoming-heading">
    <h2 id="upcoming-heading">Upcoming</h2>
    {/* … */}
  </section>
</main>
```

### Bad
```tsx
<div>
  <div className="text-2xl font-bold">Bookings</div>
  <div className="flex gap-2">
    <div onClick={() => setFilter("upcoming")}>Upcoming</div>
    <div onClick={() => setFilter("past")}>Past</div>
  </div>
</div>
```

---

## 2. Keyboard navigation

Every interactive element is reachable, operable, and predictable
without a pointer.

### Rules
- **Tab reaches every interactive element**, in visual order.
- **Tab order matches visual order.** If you reorder elements with
  CSS (`flex-direction: row-reverse`, `order:`), update the DOM order
  too. Never use `tabIndex` greater than `0` to fix DOM order.
- **Enter and Space both activate buttons.** Native `<button>` does
  this for free.
- **Arrow keys navigate within composite widgets** (tabs, listbox,
  radio group, calendar, menu). Tab moves *between* widgets.
- **Escape** closes modals, popovers, menus, and command palettes;
  focus returns to the trigger.
- **Home / End** jump to first/last in lists, menus, and tabs (where
  applicable).
- **Type-ahead** in single-selection lists (select, menu, listbox)
  filters by first letter.
- **No keyboard traps** outside intentional focus traps (modals,
  full-screen overlays). The user must always be able to leave.
- **Skip link** (`Skip to content`) is the first focusable element on
  every page.

### Implementation notes
- Prefer `<button>` over `role="button"` + key handlers. The element
  gives you Enter/Space for free.
- For composite widgets (tabs, listbox, menu), use the roving
  `tabIndex` pattern: only one descendant has `tabIndex={0}` at a time.
- For modals, use a focus-trap utility (or the forthcoming Dialog
  primitive). Don't reinvent it.

### Bad
```tsx
// No keyboard handling — only mouse works.
<div onClick={onSelect}>Select</div>

// "Fixing" tab order with arbitrary tabIndex.
<input tabIndex={3} />
<input tabIndex={1} />
<input tabIndex={2} />
```

---

## 3. Focus states

Focus is the user's "you are here". Make it visible, consistent, and
managed across surface transitions.

### Rules
- **Visible focus ring on every interactive element.** Never
  `outline: none` (or `outline-none` in Tailwind) without a
  replacement of equal or better contrast.
- **Use the design-system focus ring**: `ring` utility with default
  ring color (`--color-focus-ring`), or `shadow-focus` (`--shadow-focus`)
  for ring-on-shadow effects. Both are token-backed.
- **Focus contrast ≥ 3:1** against both the element's background and
  the surface behind it.
- **Focus is managed across transitions**:
  - **Modal opens** → focus moves to the modal's first focusable
    element (or the modal title if no interactive content).
  - **Modal closes** → focus returns to the trigger.
  - **Route change** → focus moves to the new page's `<h1>` (or the
    `<main>` landmark with `tabIndex={-1}`).
  - **Item removed from a list** → focus moves to the next item, or to
    the list itself if it's now empty.
- **Don't auto-focus on page load** for non-modal surfaces — disruptive
  for screen-reader users. (`jsx-a11y/no-autofocus` is an error in our
  config.) Auto-focus inside a modal is fine.
- **`:focus-visible` over `:focus`** so the ring shows on keyboard but
  not on mouse click (where appropriate). Tailwind's `focus-visible:`
  prefix handles this.

### Good
```tsx
// Primitive Button already wires focus-visible ring; reuse it.
<Button>Save changes</Button>

// Custom interactive element — ring backed by the token.
<a
  href="/profile"
  className="rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
>
  Profile
</a>
```

### Bad
```tsx
// Outline removed with no replacement.
<button className="outline-none ...">Save</button>

// Ring color hard-coded; ignores the token.
<button className="focus:ring-2 focus:ring-blue-500">Save</button>
```

---

## 4. Accessible names

Every interactive element answers the screen-reader question: *what
does this do?*

### Rules
- **Visible text first.** If a button says "Save changes", screen
  readers already have the name. No `aria-label` needed.
- **`aria-label` for icon-only or non-textual triggers.** The label
  describes the action, not the icon: `aria-label="Delete workout"`,
  not `aria-label="Trash icon"`.
- **`aria-labelledby` when the visible label lives elsewhere** in the
  DOM — e.g. a card's title labels the action inside it.
- **Composed names**: include the *object* the action targets when the
  context isn't obvious. In a list of workouts, "Edit" alone is
  ambiguous; "Edit Monday push session" is clear.
- **Never use placeholder as the only name.** Placeholders disappear
  on focus.
- **No `aria-label` on elements that already have visible text** — it
  overrides the visible text and confuses sighted screen-reader users.

### Good
```tsx
<Button aria-label={`Edit ${workout.name}`} size="icon">
  <Pencil aria-hidden="true" />
</Button>
```

### Bad
```tsx
// Name says "icon" — useless to a screen reader.
<button aria-label="pencil icon"><Pencil /></button>

// Visible "Save" overridden by less-helpful aria-label.
<button aria-label="Click to save the form">Save</button>
```

---

## 5. Form labels

Every input has a label. Always visible. Always associated.

### Rules
- **Use the `FormField` pattern** from `@famm/ui`. It wires `htmlFor`,
  `aria-invalid`, and `aria-describedby` automatically. Bare `<input>`
  is banned in feature code.
- **Labels are visible.** Never placeholder-only. Placeholders are
  examples, not labels.
- **Required fields** carry a visible asterisk **and** `aria-required="true"`.
- **Optional fields** are explicitly labeled "(optional)" — silence
  reads as required.
- **The right input type:**
  - `type="email"`, `type="tel"`, `type="url"`, `type="password"`,
    `type="number"` (only when arithmetic is intended).
- **The right keyboard hint:**
  - `inputMode="numeric"` for reps and integers.
  - `inputMode="decimal"` for weights and fractions.
  - `inputMode="email"` for emails.
- **`autocomplete`** is set wherever applicable: `email`, `tel`,
  `current-password`, `new-password`, `one-time-code`, `cc-number`,
  `cc-exp`, `bday`, `postal-code`.
- **Group related controls** with `<fieldset>` + `<legend>` — radio
  groups, checkbox groups, address blocks.
- **Hints come before validation messages**, both associated via
  `aria-describedby` (or both, joined).

### Good
```tsx
import { FormField, Input } from "@famm/ui";

<FormField
  label="Email"
  hint="We'll send your booking receipts here."
  error={errors.email}
  required
>
  <Input type="email" autoComplete="email" />
</FormField>
```

### Bad
```tsx
// No <label>; placeholder-only; no autocomplete; no error association.
<input
  type="text"
  placeholder="Email"
  className="border rounded p-2"
/>
```

---

## 6. Error messaging

Errors must be discoverable, intelligible, and actionable — for every
input modality.

### Rules
- **`role="alert"`** (or `aria-live="assertive"`) on the error message
  so it announces immediately when it appears.
- **`aria-invalid="true"`** on the control.
- **`aria-describedby`** links the control to its error message.
- **Inline error below the field**, never in a tooltip. Tooltips
  vanish; persistent errors don't.
- **Plain language**: *what went wrong, what to do*. "Enter a weight
  between 0 and 500 kg." beats "Invalid input.".
- **No technical codes in the primary text.** `<details>` is fine for
  error codes if they help the user (e.g. mentioning a support
  reference).
- **Don't blame the user.** "Please enter…" / "You forgot…" — drop the
  blame frame. Just state the requirement.
- **Errors persist until corrected.** Don't auto-dismiss validation
  errors.
- **On submit failure, focus the first invalid field.** Scroll it into
  view (`scrollIntoView({ block: "center" })`).
- **Use `signal-danger` token**, not raw red. Errors carry an icon or
  label in addition to color (color-is-never-the-only-signal).

### Good
```tsx
<FormField
  label="Weight"
  error="Enter a weight between 0 and 500 kg."
>
  <Input inputMode="decimal" />
</FormField>
```

This produces:

```html
<label for="weight">Weight</label>
<input id="weight" aria-invalid="true" aria-describedby="weight-error" />
<p id="weight-error" role="alert" class="text-xs text-signal-danger">
  Enter a weight between 0 and 500 kg.
</p>
```

### Bad
```tsx
// Tooltip-only error; no aria; no announcement.
<input
  type="text"
  title={errors.weight}
  className={errors.weight ? "border-red-500" : "border-gray-300"}
/>
```

---

## 7. Color contrast

Tokens are pre-validated. If you bypass tokens, contrast is your
problem.

### Rules
- **Body text ≥ 4.5:1** against its background.
- **Large text (≥ 18px or ≥ 14px bold) ≥ 3:1.**
- **Meaningful UI graphics** (icons that carry meaning, focus rings,
  form borders, chart elements) **≥ 3:1**.
- **Disabled controls** are exempt from the contrast requirement, but
  the disabled state must still be unambiguous.
- **Don't rely on color alone.** Errors red **and** labelled; PRs gold
  **and** labelled; required fields asterisked **and** `aria-required`.

### FAMM token contrast (rounded — verify before shipping)

| Pair | Light | Dark |
|------|-------|------|
| `text-primary` / `surface-default` | 16.7:1 | 15.4:1 |
| `text-secondary` / `surface-default` | 11.0:1 | 12.0:1 |
| `text-muted` / `surface-default` | 4.9:1 | 4.6:1 |
| `text-muted` / `surface-sunken` | 4.7:1 | 4.7:1 |
| `text-onAccent` / `accent` | 8.1:1 | 6.2:1 |
| `text-signal-danger` / `surface-default` | 5.3:1 | 5.1:1 |
| `text-signal-pr` / `surface-default` | 3.9:1* | 3.9:1* |

\* `signal-pr` text fails AA for *small* body text. Use it only in
sizes ≥ 18px (or 14px bold). For inline labels at smaller sizes, pair
the gold color with a "PR" badge token-fill (`bg-signal-pr/15
text-signal-pr` on `text-base` and up).

When you add a new color token, **measure its contrast against every
surface it can sit on** and include the ratios in the PR description.

### Bad
```tsx
// Hex bypasses tokens; contrast unknown; small text on subtle bg.
<p className="text-xs" style={{ color: "#94A3B8" }}>Caption</p>
```

---

## 8. Motion sensitivity

Some users get sick from animation. We honor `prefers-reduced-motion`
everywhere it matters.

### Rules
- **Animations > 200ms or involving translation must branch on
  `useReducedMotion()`** from `@famm/ui`.
- **Token durations collapse to 0ms** inside
  `prefers-reduced-motion: reduce` — so transitions driven purely by
  `duration-fast` / `base` / `slow` are reduced for free.
- **No auto-playing video** in product surfaces. Marketing video is
  click-to-play, muted by default, with controls visible.
- **No parallax** in product surfaces.
- **No infinite loops** except for active loading indicators (those
  pause when off-screen).
- **Reduced-motion fallback** for a signature motion is either an
  instant snap or a color-only change — never a slower version of the
  same translation.

### Good
```tsx
import { useReducedMotion } from "@famm/ui";

function PRCelebrate({ active }) {
  const reduced = useReducedMotion();
  return (
    <span
      className={cn(
        "text-signal-pr font-semibold",
        active && !reduced && "animate-[prScale_320ms_var(--easing-emphasized)]",
      )}
    >
      Personal record
    </span>
  );
}
```

### Bad
```tsx
// Always animates; ignores reduced-motion preference.
<span className="animate-bounce text-signal-pr">PR!</span>
```

---

## 9. Icon-only buttons

Icons communicate quickly to sighted users and not at all to screen
readers — unless you say so.

### Rules
- **Every icon-only button has an `aria-label`** that describes the
  action (verb phrase).
- **The icon itself is `aria-hidden="true"`** — it's decoration
  relative to the label.
- **Touch target 44×44** even when the icon is smaller. Padding fills
  the gap. Use `Button size="icon"` from `@famm/ui` — it ships at
  `h-11 w-11`.
- **Use `lucide-react`** only. No SVG sprite sheets, no other icon
  libraries.
- **Visible focus ring** as for every interactive element. The `Button`
  primitive already wires this.
- **In dense rows or tables**, expose icon-only actions through a kebab
  menu rather than crowding the row.

### Good
```tsx
import { Pencil } from "lucide-react";
import { Button } from "@famm/ui";

<Button
  size="icon"
  variant="ghost"
  aria-label={`Edit ${workout.name}`}
>
  <Pencil aria-hidden="true" className="h-4 w-4" />
</Button>
```

### Bad
```tsx
// 32×32 hit area; no label; icon is not decoration to a screen reader.
<button className="h-8 w-8 rounded-md hover:bg-gray-100">
  <Pencil />
</button>
```

---

## 10. Modals and dialogs

A modal interrupts. Make sure interruption is welcome, escapable, and
operable.

### Rules
- **`role="dialog"` + `aria-modal="true"`** on the dialog container.
- **`aria-labelledby`** points to the dialog title's `id`.
- **`aria-describedby`** points to the body description's `id` when
  there's a non-trivial body.
- **Focus is trapped inside the modal while open** — Tab cycles among
  focusable elements within; Shift+Tab cycles back.
- **Initial focus** lands on the first focusable element, or the
  dialog title if the body has no interactive content. Never on the
  close (X) button as the default — leaves the user one click from
  dismissal.
- **Escape closes the dialog** and returns focus to the trigger.
- **Click outside closes** non-destructive dialogs. Destructive
  dialogs *don't* close on outside click — require an explicit
  decision.
- **Scroll is locked** on the body while the dialog is open.
- **The scrim** uses `bg-surface-overlay`. Don't recolor it per
  feature.
- **The dialog uses `bg-surface-raised`** with `shadow-lg` and
  `rounded-card`.
- **Stacked modals are forbidden.** If a flow needs another step, it
  becomes a route or replaces the current dialog content.

### Good
```tsx
<dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="dlg-title"
  aria-describedby="dlg-body"
  className="bg-surface-raised rounded-card shadow-lg p-inset-lg"
>
  <h2 id="dlg-title" className="text-lg font-semibold text-text-primary">
    Delete workout
  </h2>
  <p id="dlg-body" className="mt-stack-sm text-text-secondary">
    This will permanently delete Monday's push session and its 14 logged sets.
  </p>
  <div className="mt-stack-lg flex justify-end gap-inline-sm">
    <Button variant="ghost" onClick={onClose}>Cancel</Button>
    <Button variant="destructive" onClick={onConfirm}>Delete workout</Button>
  </div>
</dialog>
```

### Bad
```tsx
// Floating <div> labelled by nothing; no focus trap; no Escape handler.
<div className="fixed inset-0 bg-black/50">
  <div className="bg-white p-6 rounded">
    <p>Are you sure?</p>
    <button onClick={onConfirm}>Yes</button>
  </div>
</div>
```

---

## 11. Menus and dropdowns

A menu is a single-select list of actions or options. Treat it as one.

### Rules
- **`role="menu"` + `role="menuitem"`** for action menus (kebab,
  context). `role="listbox"` + `role="option"` for value-selection
  dropdowns. Don't mix.
- **Trigger gets `aria-haspopup`** (`"menu"` or `"listbox"`) and
  `aria-expanded` reflecting open state.
- **Keyboard:**
  - **Down arrow** opens and focuses the first item.
  - **Up arrow** opens and focuses the last item.
  - **Arrow up/down** moves focus.
  - **Home / End** jump to first / last item.
  - **Type-ahead** filters by first character.
  - **Enter / Space** activates the focused item.
  - **Escape** closes and returns focus to the trigger.
- **Click outside closes** the menu.
- **One menu open at a time** — opening a second menu closes the first.
- **Menu items have visible focus**, with the same focus ring contrast
  as elsewhere.
- **Don't nest menus** on touch viewports. Replace nested menus with a
  drilldown sheet on mobile.

### Implementation note
Building accessible menus from scratch is hard. When the FAMM Dropdown
primitive lands, prefer it. Until then, ask before introducing a
one-off menu — and consider whether the surface really needs one or
whether a small set of buttons is sufficient.

### Bad
```tsx
// Hover-only opens; no aria; arrow keys do nothing.
<div onMouseEnter={open}>
  <div onClick={action1}>Edit</div>
  <div onClick={action2}>Delete</div>
</div>
```

---

## 12. Tables

Tables are the place WCAG most often goes from "looks fine" to "fails".

### Rules
- **Use `<table>`** for any data that has a meaningful row × column
  relationship.
- **`<caption>`** describes the table — visible or visually hidden
  (`class="sr-only"`).
- **`<thead>` + `<tbody>`** structure. `<tfoot>` if you have totals.
- **`<th scope="col">`** for column headers, `<th scope="row">`
  for row headers.
- **Sortable headers** carry `aria-sort` (`"ascending"`, `"descending"`,
  `"none"`), and the sort control inside the header is a `<button>`.
- **Selection state** uses `aria-selected` on rows; the visible state
  is a background fill (not just a checkbox).
- **Empty cells** show an em-dash ("—"), not blank — distinguishes "no
  data" from "loading" or "error".
- **Mobile strategy:** below `md`, switch to a card-per-row layout.
  Don't try to make the same DOM work at both sizes — generate two
  layouts and switch them via Tailwind responsive utilities. Document
  the strategy in the table contract.
- **Long tables** virtualize or paginate above ~100 rows.
- **Don't use a table for layout.** Use Grid or Flex.

### Good
```tsx
<table className="w-full text-sm">
  <caption className="sr-only">Workouts logged this week</caption>
  <thead>
    <tr>
      <th scope="col" aria-sort="descending">
        <button>Date</button>
      </th>
      <th scope="col">Exercise</th>
      <th scope="col" className="text-right tabular-nums">Volume</th>
    </tr>
  </thead>
  <tbody>
    <tr aria-selected={selectedId === row.id}>
      <th scope="row">{row.date}</th>
      <td>{row.exercise}</td>
      <td className="text-right tabular-nums">{row.volume ?? "—"}</td>
    </tr>
  </tbody>
</table>
```

### Bad
```tsx
// Grid-of-divs masquerading as a table; no headers; SR sees a wall.
<div className="grid grid-cols-3">
  <div>Date</div><div>Exercise</div><div>Volume</div>
  <div>Mon</div><div>Squat</div><div>4200</div>
</div>
```

---

## 13. Images and alt text

Images either communicate information or they don't. The `alt`
attribute reflects that.

### Rules
- **Informative images get descriptive `alt`** that conveys the same
  information the image does. A trainer's photo on a profile: `alt="Jamie Rivera, head trainer"`.
- **Decorative images get `alt=""`** (empty string). Screen readers
  skip them. Examples: ambient hero backgrounds, abstract patterns,
  icons that already have a text label nearby.
- **Functional images** (image as button or link) get `alt` describing
  the *action*: `alt="Open Jamie Rivera's profile"`.
- **Icons inside text-labelled buttons** are `aria-hidden="true"`, not
  `alt`-ed (they're not `<img>` elements).
- **Avoid text in images.** If the image contains words, the same
  words must appear in the page or in `alt`.
- **Complex images** (charts, diagrams) get a short `alt` plus a
  longer description nearby (caption, `<details>`, or a dedicated
  region linked by `aria-describedby`).
- **SVG**: if it's decorative, `aria-hidden="true"`. If it conveys
  meaning, give it `role="img"` and either `aria-label` or a `<title>`
  child.
- **`<picture>` and responsive images** carry one `alt` on the
  `<img>` — it doesn't change per source.
- **Use Next.js `<Image>`** for raster images so dimensions are known
  (prevents layout shift, which is an accessibility win too).

### Good
```tsx
import Image from "next/image";

// Informative
<Image src={trainer.photo} alt={`${trainer.name}, ${trainer.title}`} />

// Decorative
<Image src="/patterns/dots.svg" alt="" />

// Functional (image as link)
<Link href={`/trainers/${trainer.id}`}>
  <Image src={trainer.photo} alt={`Open ${trainer.name}'s profile`} />
</Link>
```

### Bad
```tsx
// Decorative image with literal name as alt — read aloud as noise.
<img src="/patterns/dots.svg" alt="dots pattern" />

// Trainer photo with empty alt — informative content lost.
<img src={trainer.photo} alt="" />

// Words in image with no fallback in alt or page.
<img src="/banner-buy-now.png" alt="banner" />
```

---

## Developer checklist

Run this against every UI PR before requesting review. If you can't
tick a box, explain in the PR description; don't tick falsely.

### Structure & semantics
- [ ] One `<h1>` per page; headings nest sequentially.
- [ ] Landmarks present (`<main>`, `<nav>`, etc.); no duplicates.
- [ ] Semantic elements used (`<button>`, `<a>`, `<form>`, `<table>`).
- [ ] No `<div onClick>` / `<span onClick>` in interactive contexts.

### Keyboard
- [ ] Tab reaches every interactive element in visual order.
- [ ] Enter and Space activate buttons identically.
- [ ] Escape closes modals and popovers; focus returns to the trigger.
- [ ] No keyboard traps outside intentional focus traps.
- [ ] Skip-to-content link present.

### Focus
- [ ] Visible focus ring on every interactive element.
- [ ] No `outline-none` without a replacement.
- [ ] Focus moves to modal content on open and back to trigger on
      close.
- [ ] Focus moves to `<h1>` (or `<main>`) on route change.

### Names & labels
- [ ] Every interactive element has an accessible name.
- [ ] Icon-only buttons have `aria-label` describing the action.
- [ ] Form inputs wrapped in `FormField`; bare `<input>` only in L1.
- [ ] Required fields marked visually and with `aria-required`.

### Errors
- [ ] Error messages have `role="alert"`.
- [ ] `aria-invalid` and `aria-describedby` wired (FormField does this).
- [ ] On submit failure, first invalid field gets focus and scrolls
      into view.

### Color & motion
- [ ] No raw hex / px / rgb in new code — semantic tokens only.
- [ ] Errors / PRs / required-fields carry a non-color signal.
- [ ] Animations > 200ms branch on `useReducedMotion()`.
- [ ] No auto-playing video, parallax, or infinite loops outside
      active loaders.

### Touch & responsive
- [ ] Touch targets ≥ 44×44 on touch viewports.
- [ ] Body text ≥ 16px on mobile.
- [ ] Verified at 375 × 667, 768 × 1024, 1280 × 800.
- [ ] No horizontal scroll except intentional carousels.

### Specific patterns
- [ ] Modals: `aria-modal`, `aria-labelledby`, focus trap, scroll
      lock.
- [ ] Menus: roving tabindex, arrow keys, Escape, type-ahead.
- [ ] Tables: `<th scope>`, `aria-sort` on sortable headers, mobile
      strategy.
- [ ] Images: informative get descriptive alt, decorative get
      `alt=""`.

---

## AI coding checklist

When generating UI, run this check against your own output **before**
producing the final reply. Tick honestly; report uncertainties as
`OPEN:` items.

1. **Semantic HTML.** Did I use `<button>` / `<a>` / `<input>` /
   `<dialog>` / `<table>` where they apply — not `<div>` or `<span>`?
2. **Headings.** Is there exactly one `<h1>`? Do headings nest
   sequentially?
3. **Focus ring.** Does every interactive element have a visible focus
   ring? Did I use the `ring` utility or rely on a primitive that
   already wires it?
4. **Accessible name.** Does every `<button>`, `<a>`, and `<input>`
   have a visible label or `aria-label`? Are icon-only triggers
   labelled by action, not by icon name?
5. **Forms.** Did I wrap inputs in `FormField`? Is `autocomplete`
   set where applicable? Is `inputMode` correct for the data?
6. **Errors.** Do error messages have `role="alert"` and are they
   associated via `aria-describedby`?
7. **Touch targets.** Are interactive elements at least 44×44 on touch
   viewports? Did I use `Button size="icon"` rather than a custom
   `h-8 w-8`?
8. **Tokens, not raw values.** No hex, no `px`, no `rgb()`, no inline
   `style={}` outside L1 primitives. No Tailwind default palette
   (`gray-*`, `red-*`) in new code.
9. **Color is not the only signal.** Errors carry an icon or label.
   PRs carry a "PR" label. Required fields have an asterisk.
10. **Motion.** Animations > 200ms branch on `useReducedMotion()`.
11. **Modals.** If I introduced a dialog, does it have `aria-modal`,
    `aria-labelledby`, focus trap, Escape, scroll lock?
12. **Tables.** If I introduced a table, does it have `<th scope>`,
    a `<caption>` (visible or `sr-only`), and a mobile strategy?
13. **Images.** Informative images get descriptive `alt`; decorative
    images get `alt=""`. SVG icons inside text-labelled buttons get
    `aria-hidden="true"`.
14. **Reporting.** End the reply with a `Design-system decisions:`
    block that names:
    - Components reused.
    - Tokens used.
    - A11y behaviors preserved / added (focus management, live regions,
      labels).
    - `OPEN:` items the user must verify manually (screen reader,
      focus order in landscape, dark-mode contrast for new colors).

If any answer is "no" or "unclear", **fix it before reporting done**.

---

## Common accessibility failures to avoid

A non-exhaustive list of patterns we have seen, will see again, and
will keep rejecting in review.

### Structure
- Multiple `<h1>` elements per page.
- Skipping heading levels for visual weight (`<h1>` → `<h3>`).
- Wrapping the app in `<main>` and then nesting another `<main>`.
- Grid-of-divs pretending to be a table.

### Semantics
- `<div onClick>` instead of `<button>`.
- `<button>` styled as a link to navigate.
- `<a>` styled as a button to trigger actions with no destination.
- `<input>` without `<label>` (placeholder-only).
- Custom focus-stealing dropdowns instead of `<select>` or a real
  combobox.

### Focus
- `outline-none` with no replacement focus ring.
- Focus ring with insufficient contrast against the actual background.
- Auto-focus on page load (jumps the screen reader past the page
  context).
- Modals that don't trap focus.
- Focus left on a hidden element after modal close.

### Names
- `aria-label="icon name"` (describes the icon, not the action).
- `aria-label` on elements with visible text that contradicts the
  visible text.
- Icon-only buttons with no label at all.
- "Edit" / "Delete" / "View" as the entire label in a list — ambiguous
  out of context.

### Forms
- Placeholder-only inputs.
- Validation on every keystroke (red while typing).
- Errors as tooltips that vanish on focus.
- Submit button disabled with no indication of *why* the form is
  invalid.
- Clearing the form on submit failure.

### Color & motion
- Errors with red border only (color-only signal).
- PR celebration using gold color alone, no label.
- Animations that ignore `prefers-reduced-motion`.
- Auto-playing background video.
- Parallax in product surfaces.

### Touch & responsive
- 32 × 32 (or smaller) icon-only buttons.
- 14px body text on mobile (causes iOS input zoom).
- Hover-only menus on touch viewports.
- Bottom-pinned actions covered by the iOS home indicator.
- Horizontal scroll on a page that isn't a carousel.

### Specific patterns
- Modals without `aria-modal`.
- Menus without arrow-key navigation.
- Tables without `<th scope>`.
- Sortable headers without `aria-sort`.
- Images with `alt="image"` or `alt="photo"` (literal, useless).
- Decorative images with descriptive `alt` (noise in the screen-reader
  output).

If you find yourself defending one of these in review, the right move
is almost always to fix it rather than argue.
