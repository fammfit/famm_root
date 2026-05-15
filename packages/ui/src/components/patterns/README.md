# L2 Patterns

Composite components built from L1 primitives + tokens. See
`docs/DESIGN_SYSTEM.md` §3 for promotion rules.

Promoted so far:

- `FormField` — label + control + hint/error wired with the right aria.
- `StatCard` — labelled metric for dashboards.
- `SessionTimer` — accessible countdown with reduced-motion support.

Next candidates:

- `WorkoutRow` — exercise row with set/rep/load and quick-edit affordance.
- `EmptyState`, `Pagination`, `Tabs`, `Modal`, `Toast`.

Do not add anything here that doesn't compose existing primitives and tokens.
If you need a new primitive first, add it to `../primitives/` and follow §3.
