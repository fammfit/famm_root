# Error states

Status: Pattern documentation. Applies to every surface that can fail:
data fetches, form submissions, route loads, payments, network
outages, permission denials, not-found responses.

Errors are inevitable; surprise errors are bugs. The pattern's job is
to communicate **what happened**, **what the user can do**, and
**whether their data is safe**, in that order.

There is one canonical `ErrorState` component for full-region failure
and one canonical inline `FieldError` for per-field failure. Custom
"oops, something went wrong" pages are a review failure.

---

## 1. Purpose

Replace "broken" with a calm, actionable explanation. Five kinds of
errors, each handled differently:

1. **Field validation.** Inline on the field via `FormField`'s
   `error` prop.
2. **Submit / action failure.** Inline near the action, with a Retry
   button. Optional Toast for ambient confirmation.
3. **Region failure.** A part of the page (a Card, a Table) failed to
   load. Replace that region with an `ErrorState`.
4. **Page failure.** The whole route failed. Next.js `error.tsx`
   renders an `ErrorState` taking the full surface.
5. **Not found.** A specific resource doesn't exist. A `NotFoundState`
   — similar shape, different copy and icon.

---

## 2. Recommended layout

The same shape as `EmptyState`, with a different tone:

1. **Icon.** 48px from `lucide-react` (`AlertTriangle`, `WifiOff`,
   `ServerCrash`, `ShieldOff`). Subtle `color.signal.danger` tint —
   never red flood-fill.
2. **Title.** H3, concrete: "Couldn't load workouts." Not "Error".
3. **Description.** What happened, what the user can do, what's safe.
   ≤ 2 sentences.
4. **Primary action.** "Retry" — `Button variant="default"`.
5. **Secondary action.** "Refresh page" / "Go back" / "Contact
   support" — `Button variant="ghost"` or a `Link`.
6. **Diagnostic detail (collapsed).** An `Accordion` or `<details>`
   reveals the error code and request id. Hidden by default.

For field-level errors: inline below the field, no icon, no action.
The action is on the form's submit button.

---

## 3. Required components

- `ErrorState` (L2 pattern at
  `packages/ui/src/components/patterns/error-state.tsx` when shipped).
- `Icon` (`lucide-react`).
- `Button` — primary retry, secondary action.
- `Accordion` — optional diagnostic details.
- `Toast` (`toast.error(...)`) — for ambient action failures.
- `FormField` — for inline field errors.
- `Link` — "Contact support" links.

---

## 4. Content hierarchy

- **Title.** Subject + verb + what failed. "Couldn't load workouts."
  "Payment didn't go through." Sentence case, terminal period.
- **Description.** Two short sentences max. State cause if known,
  state safety ("Your changes are still saved.") and next step.
- **Primary action.** "Retry", "Try again". Never "OK".
- **Secondary.** "Go back", "Refresh page", "Contact support".

Copy rules:

- Use plain language. "Something went wrong" is a smell — be specific
  if at all possible ("Couldn't reach the server.").
- Don't blame the user unless they made a recoverable mistake.
- Reassure on data: "Your draft is saved." or "Nothing was charged."
- No stack traces in the user-facing message.
- Include the request id (small, monospace) so support can correlate.

---

## 5. Responsive behavior

Identical to `EmptyState`:

| Breakpoint | Layout                                                       |
|------------|--------------------------------------------------------------|
| `<sm`      | Full-width with `space.inset.md`. Action button `w-full`.    |
| `sm`–`md`  | Centred column, max-width ~ 360px.                           |
| `≥md`      | Centred column, max-width ~ 480px.                           |

Page-level errors take the full surface; region-level errors fit the
region's bounds.

---

## 6. Accessibility requirements

- **Roles.**
  - Inline action errors and field errors: `role="alert"` on the
    error paragraph. Announced on focus / appearance.
  - Region and page errors: a `<section role="alert" aria-labelledby>`
    so screen readers pick up the title immediately.
- **Headings.** Title at the heading level of the surface it replaces
  (H3 for a Card region, H1 for a full page).
- **Focus.** On page-level errors, focus moves to the title. On inline
  action errors, focus stays on the failing control unless the error
  invalidates the user's previous focus target.
- **Keyboard.** Retry button reachable via `Tab`; activated via
  `Enter` / `Space`. Diagnostic details revealed via the Accordion
  pattern.
- **Color independence.** Severity communicated by both icon and
  title text. The danger tint is supplemental, not the only signal.
- **Reduced motion.** No entrance animation.
- **Don't blink** the error. Animated red banners are inaccessible and
  hostile.

---

## 7. Conversion considerations

Errors are retention moments. A user who recovers cleanly trusts the
product more.

- **Recover, don't restart.** A failed submit preserves the user's
  input. A failed page load offers a Retry that doesn't lose the
  scroll position.
- **Distinguish transient from terminal.** Transient errors retry
  silently with a small inline indicator; terminal errors get the
  full ErrorState.
- **Don't toast everything.** Toasts are for ambient errors. Page
  failures need the full state.
- **Provide a path forward.** Retry + an alternative ("Contact
  support") + a safe-exit ("Go to dashboard").
- **Be honest.** "Our servers are currently offline" beats "Something
  went wrong" when it's true.
- **Status page link** on long-running outages.

---

## 8. Common mistakes

- "Oops!" / "Whoops!" / "Uh-oh!" copy. Be specific.
- A toast for a destructive failure ("Couldn't delete the workout").
  Use an inline ErrorState near the action.
- Stack traces or error codes in the title. Codes go in the
  diagnostic details.
- A page that crashes to a white screen. Next.js `error.tsx` must
  render `ErrorState`.
- Validation errors as toasts. Errors live on the field.
- "Try again later" without a Retry button.
- An ErrorState that doesn't reach the right severity. A bg-red flood
  is rarely the right call.
- Error states that throw away the user's input on submit failure.

---

## 9. AI implementation instructions

1. **Imports (once shipped).**
   ```tsx
   import { ErrorState, NotFoundState } from "@famm/ui";
   import { toast } from "@famm/ui";
   ```
2. **Pick the right kind:**
   - Field validation → `<FormField error="..." />` on the input.
   - Action failure (failed submit / failed save) → inline
     `ErrorState` near the action **plus** preserve the user's input.
   - Region failure (Card-level data didn't load) → replace the
     Card's body with `ErrorState`.
   - Route-level failure → `apps/web/src/app/.../error.tsx` renders
     `ErrorState`.
   - Resource not found → `apps/web/src/app/.../not-found.tsx` renders
     `NotFoundState`.
3. **Always offer a Retry.** Idempotent operations retry directly;
   non-idempotent ones (payments) re-open the confirm Modal.
4. **Preserve user input on failure.** Server Actions return previous
   form state.
5. **Toast for ambient failures only** (background sync,
   non-critical refresh). Critical failures get an inline state.
6. **Diagnostic details collapsed.** Use `Accordion`; never expose a
   stack trace by default.
7. **Request id** in the diagnostic block (monospace, small) so
   support can correlate logs.
8. **Don't pile on.** One ErrorState per region; one Toast per
   transient.
9. **Live region** wiring is automatic when you use the component.
   Don't sprinkle your own `role="alert"`.
10. **Analytics.** Fire `error_view` with `{ kind, surface, code,
    requestId }`. Don't log the full message (PII).
11. **Never reload the page automatically on error.** The user
    decides whether to retry.
