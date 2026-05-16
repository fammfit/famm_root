# Contact form

Status: Pattern documentation. Applies to `apps/web/src/app/contact/`,
to the in-product "Contact support" surface, and to any feature-area
contact form (sales lead, trainer-application).

A contact form is the lowest-friction conversion the marketing site
has. The pattern's job is to make it short, clearly successful, and
recoverable on failure.

---

## 1. Purpose

Collect a small set of structured information and route it to the
right inbox. The pattern owns:

- The form layout (a single column of `FormField`s).
- The submit lifecycle (idle → submitting → success / error).
- Validation per field, errors on the field.
- The success state (clear acknowledgement, no redirect by default).
- The failure state (recoverable, retry, no data loss).

---

## 2. Recommended layout

A single `Card` (on `≥md`) or full-width column (on `<sm`):

1. **Heading + subheading.** "Talk to us." + ≤ 1 sentence of context.
2. **Fields.** 3–6 fields max:
   - Name (`Input`).
   - Email (`Input type="email"`).
   - Topic (`Select` or `Radio` — Support / Sales / Other).
   - Message (`Textarea` when shipped; `Input` placeholder until then).
   - Optional: company, phone, attachment.
3. **Consent line.** Checkbox for marketing opt-in (when relevant);
   plain text for privacy policy acknowledgement.
4. **Submit button.** Full-width on `<sm`, content-width on `≥md`.
   `Button variant="default" size="md"`.
5. **Side panel (optional, `≥lg`).** Trust signals: response-time
   commitment, alternative contact methods.

Field spacing `space.stack.md`. Section spacing `space.stack.lg`.

---

## 3. Required components

All from `@famm/ui`:

- `FormField` (L2) wrapping every input.
- `Input`, `Select`, `Radio`, `Checkbox`, `Textarea` (when shipped).
- `Button` — submit.
- `Toast` — success confirmation (in addition to the inline success
  state).
- `Card` — form surface on `≥md`.
- `Link` — privacy policy link inside the consent line.
- `Spinner` — inside the submit button via `loading` prop.

---

## 4. Content hierarchy

- **H1.** "Contact us" or context-specific ("Talk to sales").
- **H2** for sub-sections only when grouping is useful — rare for a
  contact form.
- **Field labels.** Sentence case, 1–3 words.
- **Success message.** H2 + 1-line confirmation + "What happens next".

Copy rules:

- Topic options are 2–4 in number. Don't expose 12 categories.
- Placeholders are format examples, never instructions.
- The button label is verb-first: "Send message", "Talk to sales".
  Not "Submit".
- Success copy is specific: "Got it — we'll reply within 1 business
  day." Not "Thanks!".
- Failure copy explains and offers a retry: "Couldn't send your
  message. Try again — your text is saved."

---

## 5. Responsive behavior

| Breakpoint | Layout                                                       |
|------------|--------------------------------------------------------------|
| `<sm`      | Single column; form takes full viewport width with `space.inset.md` page inset. Submit button `w-full`. |
| `sm`–`md`  | Same as `<sm` with wider max-width (~ 480px).                |
| `md`–`lg`  | Form in a Card (~ 560px wide), centred.                      |
| `≥lg`      | Card + optional side panel; total max-width ~ 880px.         |

The form never spans more than ~ 560px of input width — long lines
hurt scannability.

---

## 6. Accessibility requirements

- **Landmarks.** `<main>` with the form inside; the form is a `<form>`.
- **Heading.** H1 above the form.
- **Labels.** Every field has a programmatic label via `FormField`.
- **Required fields** marked with both the `required` attribute and a
  visible "Required" mark (not "*").
- **Errors.** Per-field, inline, `role="alert"`. Focus moves to the
  first invalid field on submit.
- **Submit state.** Submit button uses `loading` prop with
  `aria-busy`. The button does **not** lock the form — only itself —
  so users can correct fields mid-submission if validation fails.
- **Success state.** Announced via `role="status" aria-live="polite"`,
  with the inline confirmation paragraph.
- **Failure state.** Announced via `role="alert"`. The failure does
  not clear the form — values persist.
- **Keyboard.** `Tab` walks fields in DOM order; `Enter` submits when
  focus is on a field (default native behaviour).
- **Reduced motion.** Submit / success transitions collapse to fade.

---

## 7. Conversion considerations

- **Shorter is better.** Every optional field costs conversion.
- **Email + message is the floor.** If you only need to reply, those
  two are enough.
- **Honeypot, not CAPTCHA, by default.** A hidden field detects bots.
  Add CAPTCHA only when honeypot fails at scale — CAPTCHAs tank
  legitimate conversion.
- **Don't redirect on success.** Show the success state inline so the
  user keeps context. Optionally fire a CTA ("Read our docs" /
  "Return to home") below.
- **Pre-fill from auth.** Logged-in users see name + email
  pre-filled.
- **One CTA.** No "Submit" + "Submit and sign up for newsletter" — one
  primary action per form.
- **Confirmation email.** Send within 30s; the user should see proof
  in their inbox.

---

## 8. Common mistakes

- Marketing copy as field labels ("Tell us what's on your mind!" as a
  label instead of "Message").
- Required fields without visible required marks.
- Errors as a toast instead of inline on the field.
- Wiping the form on failure — data loss is unforgivable.
- Disabling the submit button forever after one failed attempt.
- Asking for phone number on a web contact form when you'll only
  reply by email.
- CAPTCHA as the default ("Just to make sure you're human") —
  inaccessible and conversion-hostile.
- Modal-based contact forms. Use a route so users can refresh.

---

## 9. AI implementation instructions

1. **Route.** `apps/web/src/app/contact/page.tsx` for marketing;
   `apps/web/src/app/(app)/support/page.tsx` for in-product.
2. **Server action.** Submission goes through a Next.js Server Action
   (`'use server'`); no client-only fetch / no exposing the API
   endpoint.
3. **Validation.** Use Zod on the server; mirror the schema in the
   client for instant feedback via `FormField`'s `error` prop.
4. **Wrap every field in `FormField`.** Never bare `Input`.
5. **`Button loading={isPending}` on submit.** Don't roll your own
   spinner.
6. **Don't redirect on success.** Replace the form's contents with a
   success card; keep the URL unchanged.
7. **Preserve values on failure.** Pass the previous form state back
   from the server action so fields retain their content.
8. **Toast + inline success.** Toast for ambient confirmation; inline
   card for context. Both happen on success.
9. **Honeypot field.** A visually-hidden `<input>` with a name like
   `website`; bots fill it, real users don't. Reject submissions
   where it's non-empty.
10. **Pre-fill from auth** when the user is logged in — name and
    email from the session.
11. **Analytics.** `contact_view`, `contact_submit_attempt`,
    `contact_submit_success`, `contact_submit_error`. Don't fire per
    field.
12. **Privacy.** Show the privacy policy link inside the consent
    sentence; never check a "subscribe me" box by default.
