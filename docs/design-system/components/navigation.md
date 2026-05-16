# Navigation

Status: 🟡 Planned. L2 pattern. Owned by the design-system owner + the
shell / app-frame feature lead.

Navigation is the only approved way to render the FAMM product's primary
chrome — the top bar, the side rail on desktop, the bottom bar on
mobile. There is exactly one set of navigation components in the
monorepo; feature areas do not invent their own.

Distinct from `Tabs` (in-page section switching) and `Breadcrumb`
(planned, contextual location). Navigation moves users between
top-level destinations.

---

## 1. Purpose

The top-level wayfinding surface. The component owns:

- The visual identity (logo placement, surface color, elevation).
- The active-destination highlight using `aria-current="page"`.
- The responsive collapse: side rail on desktop, top bar + bottom bar
  on mobile, with the same DOM and the same items.
- Keyboard navigation (`Tab` / `Shift+Tab`, no custom arrow handling on
  the primary nav).
- The unread / count badge contract via the existing `Badge` primitive.

Navigation is L2 because it composes `Link`, `Icon`, and `Badge` and
participates in app routing. It is not L1: it is allowed to know about
the Next.js router.

---

## 2. Variants

```
placement: top | side | bottom
density:   comfortable (default) | compact
context:   product | marketing | auth
```

- `placement` is automatic from breakpoint by default; pass
  `placement="side"` explicitly only when the consumer needs to force
  a layout (e.g. an embedded admin view).
- `compact` density removes labels under the icons; reserved for the
  side rail when the user collapses it.
- `context="auth"` renders only the logo and a single safe-exit link —
  no destinations.

There is no "tabs across the top of a page" variant — that is `Tabs`,
not Navigation.

---

## 3. States

| State            | Trigger                                  |
|------------------|------------------------------------------|
| `default`        | Item is a destination, not current       |
| `current`        | Item matches the active route            |
| `hover`          | Pointer over item                        |
| `focus-visible`  | Keyboard focus                           |
| `with-badge`     | Item has a count or status indicator     |
| `disabled`       | Item exists but is unavailable (e.g. requires upgrade) |

Per-shell states: `collapsed` / `expanded` for the side rail;
`scrolled` / `at-top` for the top bar (subtle elevation when scrolled).

---

## 4. Usage rules

1. **One Navigation per app surface.** Marketing site, product app, and
   auth shell each have one. Don't render a nested second nav.
2. **3–7 primary destinations.** Fewer than 3 looks empty; more than 7
   overflows the mobile bottom bar. If you need more, group them in
   the user menu or a "More" item.
3. **The destinations don't shift order across breakpoints.** Bottom
   bar and side rail show the same items in the same order.
4. **`aria-current="page"`** is set automatically based on the active
   route. The consumer does not set it.
5. **No raw `<a>` for primary destinations.** Use Navigation's item
   component, which wraps `<Link>` and the active-state logic.
6. **No conditional destinations based on flags inside the
   component.** Pass the items array from the app's routing config so
   feature flags are evaluated in one place.
7. **Don't put settings, sign-out, or the active user in the primary
   nav.** Those live in a `UserMenu` (planned), anchored to the top
   bar / side rail.
8. **No marketing CTA buttons inside product Navigation.** The product
   nav is for destinations.

---

## 5. Accessibility requirements

- **Landmark.** Top-level container is `<nav aria-label="Primary">`.
  Secondary navs (sub-sections) use a different label.
- **List structure.** Items are an `<ul>` of `<li>`s; each item is a
  link.
- **Current.** Active destination carries `aria-current="page"`. The
  current state must be communicated by more than color (an underline,
  a side-rail indicator bar, or a filled icon).
- **Keyboard.** Tab order moves through items in DOM order. No arrow-key
  navigation on the primary nav (that's a `Tabs` / `Menu` pattern, not
  this one).
- **Skip link.** A "Skip to main content" link is rendered before the
  nav for screen-reader and keyboard users; it becomes visible on
  focus.
- **Touch targets.** Bottom-bar items are 44×44 minimum. Icons are 24×24
  with surrounding padding to meet the floor.
- **Badge counts.** Surfaced inside the item's accessible name —
  "Inbox, 3 unread" — using `aria-label` on the item. The numeric
  badge alone is not enough for screen readers.
- **Reduced motion.** Side-rail collapse animation and bottom-bar
  ripple respect `prefers-reduced-motion`.
- **Color independence.** Active state is communicated by both color
  and a non-color cue (filled icon, indicator bar).

---

## 6. Responsive behavior

| Breakpoint | Shape                                       |
|------------|---------------------------------------------|
| `<sm`      | Top bar (logo, user menu) + bottom bar (primary destinations). |
| `sm` – `md`| Same as `<sm`, with slightly wider bottom-bar items. |
| `md` – `lg`| Top bar with inline destinations; user menu top-right. |
| `≥lg`      | Side rail (expanded by default) + slim top bar with breadcrumbs / search. |

The transition between mobile and desktop is layout, not content — the
same item list renders in both. The active state and badge counts
follow the items.

Long destination labels never appear in the bottom bar (icon-only on
`<md`). They appear in the side rail and the inline top bar.

---

## 7. Content rules

- **Item labels.** 1 word ideally, 2 maximum. "Workouts", "Plan",
  "Trainers", "Inbox", "Profile".
- **Sentence case** (effectively just "Capitalize first letter" for
  one-word labels).
- **Icons match labels.** Use `lucide-react`. One icon per destination,
  stable across releases — users learn the icons.
- **Counts.** Numeric badges follow the Badge content rules — "99+"
  cap on unread counts.
- **No emoji in destination labels.**

---

## 8. AI implementation instructions

1. **Import (once shipped).** `import { Navigation, NavItem } from
   "@famm/ui";`.
2. **One Navigation instance** per app surface. Render it at the app
   shell level (`apps/web/src/app/layout.tsx`), never inside a feature
   page.
3. **Pass items as a data array** describing destinations:
   `{ key, href, label, icon, badge? }`. The component decides
   placement based on viewport.
4. **Never use raw `<a>` for primary destinations.** Use `NavItem`
   internally, or just pass items as data.
5. **Active state is automatic.** Pass `currentPath` (or read it from
   the router) — don't compute the active item in the consumer.
6. **Don't add destinations inside features.** Add them to the central
   nav config in the app shell.
7. **Don't reach for a router primitive inside `apps/web` for
   navigation chrome.** The Navigation component handles it.
8. **Use `Tabs`, not Navigation,** for in-page section switching.
9. **Settings, sign-out, account** → `UserMenu`, not Navigation.

---

## 9. Figma naming convention

```
Page:                08 — Patterns
Section frame:       Navigation
Component set name:  Navigation
Variant axes:
  placement: top | side | bottom
  density:   comfortable | compact
  context:   product | marketing | auth
Sub-frames:
  Navigation / Item        (default | hover | focus | current | with-badge | disabled)
  Navigation / SideRail    (expanded | collapsed)
  Navigation / BottomBar   (mobile shell with 4–5 items)
  Navigation / TopBar      (logo, optional inline items, user menu slot)
```

Tokens used (semantic only): `color.surface.default`,
`color.surface.raised` (side rail), `color.text.primary`,
`color.text.secondary`, `color.action.primary` (current indicator),
`color.border.subtle`, `radius.control`, `elevation.raised`,
`space.inset.md`, `space.stack.sm`, `motion.role.enter`,
`motion.role.exit`.

---

## 10. Code component naming convention

```
Source:   packages/ui/src/components/patterns/navigation.tsx
Exports:  Navigation, NavItem, NavItemProps, NavigationProps
Import:   import { Navigation, NavItem } from "@famm/ui";
Tier:     L2 pattern
```

File name `navigation.tsx`. The pattern composes `Link` (from
`next/link`), `Icon`, and `Badge`. Helper sub-components (`TopBar`,
`SideRail`, `BottomBar`) are exported only for testing and Storybook;
product code imports `Navigation` and passes items as data. No
alternative `Sidebar`, `Header`, `Topbar`, `Tabbar`, or `Menu`
navigation components exist anywhere else in the monorepo.
