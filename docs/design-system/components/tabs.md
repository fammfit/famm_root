# Tabs

Status: 🟡 Planned. L1 primitive. Owned by the design-system owner.

Tabs is the only approved way to switch between **peer views of the same
content** on a single page — workout details vs notes vs history, for
example. For switching between top-level destinations, use
`Navigation`; for a small set of mutually exclusive form options, use
`SegmentedControl` (planned).

Hand-rolled tab bars in product code (a `<div>` of buttons with a state
boolean) are a CI failure.

---

## 1. Purpose

A horizontally laid-out set of triggers that swap the contents of a
single panel. The component owns:

- The triggers list and the panel — wired via the WAI-ARIA Tabs pattern.
- The active-tab indicator (underline by default, pill in the
  `segmented` variant).
- Keyboard navigation (`Left`/`Right`, `Home`/`End`).
- Lazy panel mounting with focus management on activation.
- Overflow behavior on narrow viewports.

If the content of each tab requires its own URL (deep linking,
shareable), use a route + `Navigation` sub-nav instead. Tabs are
intra-page.

---

## 2. Variants

```
variant:   underline (default) | segmented | enclosed
size:      sm | md (default)
alignment: start (default) | center | stretch
```

- `underline` — flat triggers with an indicator under the active one.
  Use as the default.
- `segmented` — pill-shaped active background on a contained group.
  Use for short labels (≤ 2 words) and small sets (≤ 4 tabs).
- `enclosed` — triggers sit inside a card surface; useful when tabs
  divide a card's body.

`alignment="stretch"` makes triggers fill the container — used inside
narrow cards.

---

## 3. States

| State            | Trigger                                |
|------------------|----------------------------------------|
| `default`        | Idle, not selected                     |
| `selected`       | Active tab                             |
| `hover`          | Pointer over trigger                   |
| `focus-visible`  | Keyboard focus on trigger              |
| `disabled`       | `disabled` on the tab                  |
| `with-badge`     | Tab carries a count badge              |

Panel states: `mounted` / `unmounted`. By default panels are mounted
on first activation and remain mounted to preserve state — the consumer
can opt into `unmountOnHide` for heavy panels.

---

## 4. Usage rules

1. **Tabs are peer content of the same entity.** Don't use tabs to
   switch between unrelated screens.
2. **2–6 tabs.** Below 2, you don't need tabs. Above 6, switch to a
   `Select` or rethink the IA.
3. **Equal-weight labels.** Parallel grammar — "Overview" / "Sets" /
   "Notes", not "Overview" / "All the sets you've done" / "Notes".
4. **Tab labels do not contain icons by default.** Icons are allowed in
   `segmented` and `enclosed` variants and only when the label remains
   present (icon + text, not icon-only).
5. **No nested tabs.** Tabs inside tabs is a design smell — the deeper
   level belongs in a different control.
6. **No conditional tabs based on roles inside the tab list.** Compute
   the visible tabs in the consumer and pass them in.
7. **No `className` on triggers or the indicator.** Layout-only
   utilities on the wrapper are allowed.
8. **Tabs don't drive URL state by default.** If the active tab needs to
   live in the URL, pass `value` and `onValueChange` and bind to the
   router in the consumer.

---

## 5. Accessibility requirements

- **Pattern.** WAI-ARIA Tabs.
- **Roles.** Tab list is `role="tablist"`; each trigger is
  `role="tab"` with `aria-selected`; each panel is `role="tabpanel"`
  with `aria-labelledby` pointing at its trigger.
- **Keyboard.**
  - `Tab` enters the tablist on the active trigger.
  - `Left`/`Right` (or `Up`/`Down` for vertical, not yet shipped)
    move focus and **activate** by default — this matches the
    automatic-activation variant of the pattern.
  - `Home`/`End` jump to first/last.
  - `Tab` from the active trigger moves into the active panel's
    contents.
- **Focus.** 2px ring on the trigger. On `underline` and `enclosed`,
  the ring sits inside the trigger pill; on `segmented`, the ring sits
  on the segment.
- **`aria-controls`.** Each trigger has `aria-controls` pointing at
  its panel id.
- **Disabled tab.** `aria-disabled="true"`; arrow navigation skips
  disabled tabs.
- **Indicator.** The underline / pill is decorative; the active state
  is conveyed by `aria-selected`. Don't rely on the indicator color
  alone — the active text weight changes too.
- **Reduced motion.** The sliding indicator collapses to a static
  position swap under `prefers-reduced-motion`.

---

## 6. Responsive behavior

- **`<sm`.** If triggers overflow, the list becomes horizontally
  scrollable with a gradient mask on the right edge. The active tab
  scrolls into view on selection.
- **`≥md`.** Triggers fit in the container by default. `alignment`
  decides how they distribute.
- **`segmented` on `<sm`** stays segmented but may compress padding to
  fit; if it still overflows, it falls back to `underline`.

The component never wraps to a second row — wrapping a tablist is an
anti-pattern.

---

## 7. Content rules

- **Labels.** 1–2 words. Sentence case. Noun phrases ("Overview",
  "Sets"), not verbs ("Show sets").
- **Counts via Badge.** When a tab has a meaningful count, attach a
  `Badge` inside the trigger; the badge is part of the accessible name
  ("Notes, 3").
- **No emoji** in labels.
- **Translation.** Plan for ~30% growth; `alignment="stretch"` is
  unsafe with long labels in dense languages.

---

## 8. AI implementation instructions

1. **Import (once shipped).** `import { Tabs } from "@famm/ui";` —
   compound API with `Tabs.List`, `Tabs.Trigger`, `Tabs.Panel`.
2. **Never write a custom tab UI** with a `useState` boolean and a
   `<div>` of buttons.
3. **Use Tabs for in-page peer content, not for top-level navigation**
   (that's `Navigation`) and not for choosing form values (that's
   `Radio` or `SegmentedControl`).
4. **Pick the variant by density:**
   - Default page tabs → `underline`.
   - Short parallel options inside a card → `segmented`.
   - Card-internal sectioning → `enclosed`.
5. **Activation is automatic by default** — arrow keys both move focus
   and select. Pass `activationMode="manual"` only when panels are
   heavy and you want users to confirm with `Enter`/`Space`.
6. **Don't unmount panels by default.** State preservation matters.
   `unmountOnHide` is opt-in.
7. **No `className` on the triggers, list, or indicator.** Layout-only
   utilities on the wrapping container are fine.
8. **URL-bound tabs.** Lift state to the router — pass `value` and
   `onValueChange`. Don't import the router inside the tabs.

---

## 9. Figma naming convention

```
Page:                07 — Components
Section frame:       Tabs
Component set name:  Tabs
Variant axes:
  variant:   underline | segmented | enclosed
  size:      sm | md
  alignment: start | center | stretch
Sub-frames:
  Tabs / Trigger      (default | hover | focus | selected | disabled | with-badge)
  Tabs / Panel        (illustrative — empty | populated)
  Tabs / Overflow     (mobile horizontally-scrollable mask)
```

Tokens used (semantic only): `color.surface.default`,
`color.text.primary`, `color.text.secondary`, `color.action.primary`
(indicator + selected text), `color.border.default` (underline track),
`color.border.focus`, `radius.control` (segmented pill),
`space.inset.sm`, `space.inline.sm`, `motion.role.enter` (indicator
slide).

---

## 10. Code component naming convention

```
Source:   packages/ui/src/components/primitives/tabs.tsx
Exports:  Tabs, TabsProps   (Tabs.List, Tabs.Trigger, Tabs.Panel via compound)
Import:   import { Tabs } from "@famm/ui";
Tier:     L1 primitive
```

File name `tabs.tsx`. There is no `TabBar`, `TabGroup`, `Pager`, or
feature-named tab implementation anywhere else in the monorepo.
`SegmentedControl` is a different primitive (not a Tabs variant) with
its own spec.
