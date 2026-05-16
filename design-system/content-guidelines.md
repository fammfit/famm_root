# Content Guidelines

How FAMM talks. Voice, tone, capitalization, and the exact patterns for the
strings that show up most often.

## Voice

- **Direct.** "Start workout", not "Let's get started on your workout!"
- **Quietly confident.** We're a tool the user runs through; we don't
  cheerlead by default.
- **Respectful of effort.** We acknowledge work without overpraising it.
  "Set complete" not "Amazing job!". Saving that for the PR.
- **Human, never breezy.** No "Oops!", "Whoops!", "Uh-oh!".

## Tone shifts by surface

| Surface | Tone | Example |
|---------|------|---------|
| Marketing | Aspirational, calm | "Track your training. See your progress." |
| Onboarding | Reassuring, brief | "Add your first workout — you can edit it later." |
| In-session | Minimal, immediate | "Set 3 of 5", "Rest 60s", "Next" |
| Errors | Plain, actionable | "Couldn't save — check your connection and try again." |
| PR / completion | Earned celebration | "Personal record." (no exclamation) |
| Empty states | One sentence + an action | "No workouts yet. Add one to get started." |

## Capitalization

- **Sentence case** for buttons, labels, headings, menu items, toasts.
  "Save changes", not "Save Changes".
- **Title case** for proper nouns and product names only: "FAMM", "Apple
  Health".
- **All caps** only for short uppercase labels (`text-xs tracking-wide`),
  e.g. "TODAY" in a date header, or KPI labels in a StatCard.

## Numbers and units

- **Weights**: integer-default. Show decimal only when the data has it.
  "82 kg", "180 lb", "82.5 kg".
- **Time**: `m:ss` for under an hour; `h:mm:ss` for over. "1:30" reads as
  one minute thirty seconds in workout context.
- **Currency**: symbol prefix, two decimals, never abbreviated. "$24.00",
  not "24$" or "$24".
- **Percentages**: integer with no space. "12%", not "12 %".
- **Dates**: `Intl.DateTimeFormat` with the user's locale. Default format
  for a workout: "Mon, May 15".
- **Tabular numerals** in any column of numbers. `font-variant-numeric:
  tabular-nums` (`tabular-nums` Tailwind utility).

## Buttons

A button label is a verb phrase that names the outcome.

- ✅ "Save changes", "Start workout", "Delete account", "Add exercise"
- ❌ "OK", "Yes", "Continue", "Submit", "Click here"

Two-button confirmations:

- Destructive: confirm verb on the destructive button, plain "Cancel" on
  the other. "Delete workout" / "Cancel".
- Non-destructive: action verb / "Cancel". "Save draft" / "Cancel".

## Error messages

The shape: **What went wrong + what to do about it.**

| Bad | Good |
|-----|------|
| "An error occurred." | "Couldn't save — check your connection and try again." |
| "Invalid input." | "Enter a weight between 0 and 500 kg." |
| "ERR_AUTH_403" | "Sign in again to continue." |
| "Required field." | "Add your email address." |

Avoid: blame ("You forgot..."), jargon ("Endpoint returned 500"),
exclamation points, "please".

## Empty states

One sentence describing what *would* be there + one button that fills it.

- "No bookings yet. **Find a trainer** to book your first session."
- "Your workout history will show here. **Log your first workout**."

## Confirmations

Toasts after destructive or significant actions:

- "Workout saved."
- "Booking cancelled."
- "Account deleted."

Past-tense, plain, no praise.

## Inclusive language

- **Person-first** when referring to roles ("trainer", "member"), not
  identity. Avoid demographic adjectives unless functionally relevant.
- **No idioms** that don't translate ("knock it out of the park", "low-
  hanging fruit"). FAMM ships in multiple locales.
- **They/them by default** when gender isn't specified or known.
- **No body-shaming framing.** Goals are framed as the user's stated goal,
  not as deficiencies. "Build strength" rather than "Get unweak".

## Pluralization

Use `Intl.PluralRules` or a phrase that avoids the singular/plural split.

- ✅ "5 sets remaining"
- ✅ "Sets remaining: 5"
- ❌ "5 set(s) remaining"
- ❌ "5 set remaining"

## Domain words

Settle on one term and use it everywhere.

| Use | Don't use |
|-----|-----------|
| Workout | Session (reserved for trainer sessions), routine, exercise (that's a sub-unit) |
| Exercise | Movement, lift |
| Set | Round |
| Rep | Repetition |
| Trainer | Coach, instructor |
| Member | Customer, user (in UI) |
| Booking | Appointment, reservation |
| Personal record / PR | Best, record, milestone |
