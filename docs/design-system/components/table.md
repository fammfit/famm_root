# Table

Status: 🟡 Planned. L2 pattern. Owned by the design-system owner + the
feature lead consuming it.

Table is the only approved way to render **tabular data** in the FAMM
product — rows of records with comparable columns. Use it for set
history, payment receipts, trainer rosters, admin lists.

A list of cards is not a table. A pricing comparison is a table. Get
this right.

Custom `<table>` markup styled with raw Tailwind is a CI failure.

---

## 1. Purpose

A semantic `<table>` with consistent header / row / cell rhythm,
sortable columns, optional row selection, sticky headers, and an
accessible empty / loading / error pipeline.

The component owns:

- Semantic `<table> / <thead> / <tbody> / <tr> / <th> / <td>`.
- Column-driven rendering (consumer passes a `columns` array; the table
  renders cells).
- Sort indicators, single or multi-column.
- Row selection via Checkbox primitive.
- Empty state, loading skeletons, and error state.
- Responsive transformation on `<md` (rows become cards).
- Sticky header on scroll.

Data fetching, pagination, and filtering live in the consumer; the
Table renders what it's given.

---

## 2. Variants

```
density:    comfortable (default) | compact
striping:   none (default) | zebra
borders:    rows (default) | cells | none
selectable: false (default) | single | multi
```

- `comfortable` row height ≈ 56px; `compact` ≈ 40px. `compact` is for
  dense admin lists; product UI defaults to `comfortable`.
- `zebra` alternates row background; useful for wide tables where the
  eye needs help following a row.
- `borders="cells"` adds vertical dividers. Reserve for numeric-heavy
  tables.
- `selectable` adds a leading checkbox column with the group-select
  contract.

---

## 3. States

| State            | Trigger                                     |
|------------------|---------------------------------------------|
| `loading`        | `isLoading` prop — renders skeleton rows    |
| `empty`          | No rows + not loading — renders `EmptyState`|
| `error`          | `error` prop set — renders inline error row + retry |
| `populated`      | Rows present                                |
| `sorted`         | A column has an active sort                 |
| `selected`       | One or more rows selected                   |
| `expanded`       | A row has its details expanded (optional)   |

Per-cell states: `default`, `numeric` (right-aligned, mono font),
`muted` (de-emphasized).

Per-row states: `default`, `hover`, `selected`, `expanded`, `disabled`.

---

## 4. Usage rules

1. **Use Table only for tabular data.** Lists of items with one or two
   fields are a `List` (planned). Pricing comparison tables are
   tables. Card grids are not.
2. **Columns are data, not JSX.** Pass `columns: { key, header,
   cell?, sortable?, align? }`; cells render from the row's value or a
   `cell()` function.
3. **3–10 columns.** Above 10, the table is unreadable on desktop and
   collapses badly on mobile. Hide secondary columns behind an
   expandable row.
4. **No raw `<table>` in `apps/web`.** Use Table.
5. **No `className` on rows or cells for visuals.** Layout-only
   utilities on the wrapping container (width, max-height) are allowed.
6. **Sticky header is opt-in.** `stickyHeader` requires the table to
   live inside a scroll container with a defined max-height.
7. **Pagination, search, filters** are sibling components (`Pagination`,
   `Search`, `Filters` — planned), not props on Table.
8. **Don't put a Card around the Table.** Tables are their own surface.

---

## 5. Accessibility requirements

- **Element.** Real `<table>` with `<thead>`, `<tbody>`, `<tr>`,
  `<th scope="col">`, `<td>`.
- **Caption.** A visually-hidden `<caption>` describes the table.
  Required when the table isn't titled by surrounding chrome.
- **Sortable columns.** The `<th>` has `aria-sort` set to `ascending`,
  `descending`, or `none`. The sort control is a `<button>` inside the
  `<th>`, with an accessible name like "Sort by name, currently
  unsorted."
- **Row selection.** Each row checkbox has an `aria-label` that
  includes the row's identifier ("Select row for trainer Sarah Chen").
  The header checkbox is the group "select all" — it carries
  `aria-label="Select all rows"` and uses the `indeterminate` state
  when some rows are selected.
- **Keyboard.**
  - `Tab` enters the table; subsequent `Tab` walks focusable cell
    contents in row-major order.
  - In compact admin tables, arrow-key navigation between cells is
    opt-in (`keyboardNavigation="grid"`) and uses the grid pattern with
    `role="grid"`.
- **Empty / loading / error.** Communicated in the body — a single
  `<tr>` with a full-span `<td>` containing the state. Always announce
  via `aria-live="polite"` on the wrapping container when the state
  changes.
- **Touch target.** Row controls (checkbox, expand button) meet 44×44
  via padding even when `density="compact"`.
- **Color independence.** Sort direction is shown by an icon, not just
  by color. Selected rows have both a tint and a leading checkmark.

---

## 6. Responsive behavior

- **`<md`.** Each row collapses to a **stacked card** with the column
  header inline before each value. The component renders this
  automatically; the consumer passes the same `columns` config.
- **`≥md`.** Standard table layout.
- **`≥lg`.** Wider tables may use `stickyFirstColumn` to keep the row
  identifier visible during horizontal scroll.
- **Horizontal overflow** uses a horizontal scroll container, never a
  shrink-to-fit. The first column is sticky when overflow occurs (if
  `stickyFirstColumn` is set).
- **Loading skeletons** match the responsive shape (rows on desktop,
  cards on mobile).

---

## 7. Content rules

- **Headers.** Sentence case, 1–3 words. Nouns. Don't repeat the
  table's title in column headers.
- **Numeric columns** are right-aligned and use `font.role.mono` so
  the digits line up.
- **Dates** are formatted by the locale's medium style ("May 15, 2026").
  Never raw ISO strings in product tables.
- **Currency** uses the user's locale and the configured currency from
  the payments service.
- **Truncation.** Long values truncate with ellipsis and reveal in a
  Tooltip on hover and focus. Don't wrap cell content unless the
  consumer opts in.
- **Empty state copy.** A noun + verb explaining absence and offering a
  next step: "No workouts yet. Log your first set to see it here."

---

## 8. AI implementation instructions

1. **Import (once shipped).** `import { Table } from "@famm/ui";` with
   the compound API: `Table.Header`, `Table.Row`, `Table.Cell`,
   `Table.Caption`, `Table.Empty`, `Table.Skeleton`, `Table.Error`.
   The data-driven API `<Table columns={...} rows={...} />` is the
   default; compound API is for non-standard layouts.
2. **Never write `<table>` in product code.** Use Table.
3. **Columns are config, not JSX.** Pass:
   ```ts
   const columns = [
     { key: "name", header: "Name", sortable: true },
     { key: "lastSeen", header: "Last seen", align: "right" },
   ];
   ```
4. **State props.** `isLoading`, `error`, `emptyMessage`. Don't render
   skeletons or empty placeholders manually.
5. **Selection.** Pass `selectable="multi"` and bind `selectedIds` /
   `onSelectionChange`. The Checkbox primitive is used internally.
6. **Sorting.** Pass `sort` and `onSortChange`. The component does
   not sort the rows — the consumer applies the sort to the data
   source.
7. **No `className` on rows or cells for visuals.** Layout-only
   utilities on the wrapper are allowed.
8. **Pagination is a sibling.** Render `<Pagination>` below the Table
   when appropriate; don't pass `page` to Table.
9. **Long cell values.** The component wires up a Tooltip on truncation
   automatically; do not add your own.
10. **Don't wrap a Table in a Card.** It's its own surface.

---

## 9. Figma naming convention

```
Page:                08 — Patterns
Section frame:       Table
Component set name:  Table
Variant axes:
  density:    comfortable | compact
  striping:   none | zebra
  borders:    rows | cells | none
  selectable: false | single | multi
Sub-frames:
  Table / Row              (default | hover | selected | expanded | disabled)
  Table / Cell             (default | numeric | muted | truncated)
  Table / HeaderCell       (default | sortable-asc | sortable-desc | sortable-idle)
  Table / Empty            (empty state)
  Table / Skeleton         (loading rows)
  Table / Error            (error row with retry)
  Table / Mobile (<md)     (stacked-card responsive transformation)
```

Tokens used (semantic only): `color.surface.default`,
`color.surface.raised` (zebra), `color.surface.sunken` (selected row
tint), `color.text.primary`, `color.text.secondary`,
`color.text.muted`, `color.border.subtle`, `radius.card` (mobile
cards), `space.inset.md` (cells), `space.inset.sm` (compact),
`font.role.body`, `font.role.mono` (numeric), `motion.role.enter`
(skeleton shimmer — collapses to static under reduced-motion).

---

## 10. Code component naming convention

```
Source:   packages/ui/src/components/patterns/table.tsx
Exports:  Table, TableProps, TableColumn   (compound members via Table.Row, etc.)
Import:   import { Table, type TableColumn } from "@famm/ui";
Tier:     L2 pattern
```

File name `table.tsx`. The default API is data-driven (`<Table
columns={...} rows={...} />`); the compound API is for non-standard
layouts and stays minimal. There is no `DataGrid`, `Grid`, `Spreadsheet`,
or feature-named table component anywhere else in the monorepo.
`DataGrid` is reserved for a future spreadsheet-like editing surface
and would be a separate primitive.
