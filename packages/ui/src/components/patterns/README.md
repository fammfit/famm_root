# L2 Patterns

Composite components built from L1 primitives + tokens. See
`docs/DESIGN_SYSTEM.md` §3 for promotion rules.

Empty for now. Candidates to land here as the product grows:

- `StatCard` — labelled metric for dashboards (weight, streak, volume).
- `WorkoutRow` — exercise row with set/rep/load and quick-edit affordance.
- `SessionTimer` — accessible countdown/stopwatch with `aria-live`.
- `FormField` — `<label>` + `Input` + help text + error, wired together.
- `EmptyState`, `Pagination`, `Tabs`, `Modal`, `Toast`.

Do not add anything here that doesn't compose existing primitives and tokens.
If you need a new primitive first, add it to `../primitives/` and follow §3.
