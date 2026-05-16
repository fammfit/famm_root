# Settings

Status: Pattern documentation. Applies to `apps/web/src/app/(app)/settings/`
and to any in-product settings surface (trainer settings, plan
preferences).

Settings are dense by nature. The pattern's job is to keep them
scannable, reversible, and obviously safe to edit.

There is one canonical settings layout — a left-rail (or top-tab on
mobile) section list with a single content pane on the right.

---

## 1. Purpose

Let a user find and change a configuration option in under five
seconds, with confidence that the change took effect.

The pattern owns:

- Section grouping (Account, Notifications, Privacy, Billing, etc.).
- Inline auto-save with explicit confirmation (a Toast on success).
- Destructive sections (delete account) clearly separated.
- The "where am I?" awareness — section title in the URL, in the
  page title, and in the rail.

---

## 2. Recommended layout

- **Sidebar (≥md) / top tabs (<md).** Lists section names. Active
  section highlighted with `aria-current="page"`.
- **Content pane.** Section heading + grouped fields. Each group is a
  `Card` with a header (label + brief description) and a body of
  controls.
- **Destructive zone.** Always at the bottom of the relevant section,
  inside a Card with `tone="destructive"` (when shipped) or a clear
  visual separator. Buttons inside are `variant="destructive"` and
  open a confirmation `Modal`.

Section spacing `space.stack.lg`; intra-section `space.stack.md`.

---

## 3. Required components

All from `@famm/ui`:

- `Navigation` (`context="product"`) — site chrome stays.
- `Tabs` (mobile) — for section navigation.
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`,
  `CardFooter`.
- `FormField` (L2) wrapping `Input`, `Select`, `Checkbox`, `Radio`,
  `Switch` (when shipped).
- `Button` — save / cancel / destructive actions.
- `Modal` — for destructive confirmations.
- `Toast` — for save confirmations.
- `Badge` — for "Pro tier" / "Verified" markers.

---

## 4. Content hierarchy

- **H1.** "Settings" — once per page.
- **H2.** Section name (matches the rail / tab) — "Account",
  "Notifications", "Billing".
- **H3.** Group title inside a section (`CardTitle`) — "Email",
  "Password".
- **Body.** Field labels and descriptions.

Copy rules:

- Section labels are nouns: "Notifications", not "Manage notifications".
- Field labels match the data ("Email address") — descriptions explain
  the effect ("We send weekly summaries here.").
- Destructive section header is bare and serious: "Delete account".
  No softening copy.
- Confirmation Modal title states the irreversibility: "Delete account?
  This cannot be undone."

---

## 5. Responsive behavior

| Breakpoint | Layout                                                  |
|------------|---------------------------------------------------------|
| `<sm`      | Top `Tabs` for sections; content pane below. No sidebar. |
| `sm`–`md`  | Same as `<sm`, wider content pane.                       |
| `md`–`lg`  | Two-column: 240px sidebar left, content right.           |
| `≥lg`      | Same as `md` with wider content max-width (~ 720px).     |

The sidebar is sticky on `≥md` so section nav stays visible during
scroll.

---

## 6. Accessibility requirements

- **Landmarks.** `<nav aria-label="Settings sections">` for the rail,
  `<main>` for the pane.
- **Active section.** `aria-current="page"` on the active rail item.
- **Forms.** Every control wrapped in a `FormField` with a label and
  description. Errors render on the field.
- **Save state.** Auto-save announces "Saving…" then "Saved" via
  `aria-live="polite"`. A toast on success; an inline error on
  failure.
- **Focus management.** Switching sections moves focus to the section
  H2.
- **Destructive confirmations.** Use Modal; never inline.
- **Keyboard.** `Tab` walks the form in DOM order; arrow keys navigate
  the section rail (Tabs pattern).
- **Color independence.** Saved / unsaved state uses both an icon and
  text — not just a tint change.

---

## 7. Conversion considerations

Settings are retention, not acquisition. Optimise for trust:

- **No surprises.** If the user toggles a switch, the effect is
  immediate and confirmed.
- **Reversible by default.** Destructive sections require a typed
  confirmation ("type DELETE to confirm") for account-level actions.
- **Bulk changes** are explicit ("Apply to all clients?") — never
  silent.
- **Billing is its own route**, but the link from settings goes to the
  payments service flow, not a fake-billing inline form.
- **Don't gate features behind hidden settings.** If a feature exists,
  it has a discoverable toggle.

---

## 8. Common mistakes

- Single giant form with a "Save changes" button at the bottom. Auto-save
  per field; the user shouldn't have to scroll to confirm.
- Settings hidden in a kebab menu. They live at `/settings`, period.
- Destructive actions inline with regular fields. Separate them
  visually and behaviorally.
- "Apply" + "Save" + "Confirm" buttons that mean different things on
  the same screen. Pick one verb.
- Custom field layouts per section. Use `FormField` everywhere.
- Settings spanning ten sections with two fields each. Consolidate.
- Notification preferences as a wall of checkboxes. Group by channel
  (Email, Push) then by event.

---

## 9. AI implementation instructions

1. **Route.** `apps/web/src/app/(app)/settings/[section]/page.tsx` —
   section in the URL.
2. **Each section is a route segment.** Don't render all sections in
   one giant page.
3. **Wrap every control in `FormField`.** Never bare Input / Select.
4. **Auto-save with optimistic UI.** A server action persists the
   change; on success, fire `toast.success("Saved.")`. On failure,
   pass `error` to the field and roll back the optimistic state.
5. **Destructive actions** open a `Modal` with `tone="destructive"`
   and a destructive `Button` inside.
6. **Section H2 matches the rail label.** Don't paraphrase.
7. **Focus management.** On section change, route navigation handles
   focus via Next.js; verify the H2 is focusable on first paint.
8. **Don't render a "Save changes" button per section.** If you have a
   batch-edit case, it gets its own pattern, not the default settings
   shape.
9. **Analytics.** Fire `settings_section_view` per route; never per
   field.
10. **No marketing inside settings** ("Upgrade to Pro for…"). Pricing
    lives at `/pricing`.
