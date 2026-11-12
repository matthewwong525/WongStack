import { html } from "./vendor/preact-htm.mjs";
import { viewLabel } from "./address.mjs";
import { Link, useWhere } from "./router.mjs";
import { cn, TABLE } from "./ui.mjs";

// On a narrow page each row stacks into short lines: the name with its menu beside it, then a line per cell.
// The page measures itself (`@container` on it), so the rows stack by the room they have, and nothing scrolls sideways.
const STACK = {
  table: "@max-[44rem]:block",
  // The header row stays for a screen reader once rows stack: hidden from sight, never removed.
  head: "@max-[44rem]:sr-only",
  row: "@max-[44rem]:grid @max-[44rem]:grid-cols-[minmax(0,1fr)_auto] @max-[44rem]:gap-x-2.5 @max-[44rem]:gap-y-1 @max-[44rem]:py-3",
  // A stacked line may wrap, and a long word breaks.
  cell: "@max-[44rem]:block @max-[44rem]:p-0 @max-[44rem]:whitespace-normal @max-[44rem]:wrap-anywhere @max-[44rem]:first:font-semibold",
  // A cell whose words don't say what it is shows its column's name first.
  line: "@max-[44rem]:not-first:col-span-full @max-[44rem]:data-label:before:text-muted-foreground @max-[44rem]:data-label:before:content-[attr(data-label)_\":_\"]",
  actions: "@max-[44rem]:col-start-2 @max-[44rem]:row-start-1",
};
// A column that gives way: on a computer it takes a share of the row and no more, so every row stays one line.
const SHARE = "w-[30%] max-w-0 @max-[44rem]:w-auto @max-[44rem]:max-w-none";
// Words too long for their column end in "…"; the whole of them is in `title`.
const CUT = "truncate @max-[44rem]:whitespace-normal";
// The row of the item that is open: filled, with a bar on its leading edge, so it is not marked by colour alone.
// Every row is the same height on a computer, with or without a control in it; stacked rows take what they need.
const EVEN = "h-14 @max-[44rem]:h-auto";
const OPEN = "aria-[current=true]:bg-muted aria-[current=true]:[&>td:first-child]:shadow-[inset_0.2rem_0_0_var(--color-primary)]";

/** A list: a table whose columns every row shares, named by the current link in the switch, or by the id `label`.
 *  `actions` names a last column of row menus. These rows stack on a narrow page instead of scrolling sideways. */
export function Table({ view, label = viewLabel(view), columns, actions, children }) {
  return html`<table data-slot="table" class=${cn("w-full text-sm", STACK.table)} aria-labelledby=${label}>
    <thead data-slot="table-header" class=${cn(TABLE.header, STACK.head)}><tr data-slot="table-row" class=${cn(TABLE.row, "hover:bg-transparent")}>
      ${columns.map(column => html`<th scope="col" data-slot="table-head" class=${cn(TABLE.head, "text-muted-foreground")} key=${column}>${column}</th>`)}
      ${actions && html`<th scope="col" data-slot="table-head" class=${TABLE.head}><span class="sr-only">${actions}</span></th>`}
    </tr></thead>
    <tbody data-slot="table-body" class=${cn(TABLE.body, STACK.table)}>${children}</tbody>
  </table>`;
}

/** One row, divided from the next by a line. With `to`, a click anywhere on it that is not a control opens that
 *  item, as the link in its first cell does. `current` marks the row of the item that is open. */
export function Row({ to, current, children }) {
  const { go } = useWhere();
  return html`<tr data-slot="table-row" aria-current=${current ? "true" : undefined}
    class=${cn(TABLE.row, STACK.row, EVEN, OPEN, to ? "cursor-pointer focus-within:bg-muted/50" : "hover:bg-transparent")}
    onClick=${event => { if (to && !event.target.closest("a, button, select, [role='menu']")) go(to); }}>${children}</tr>`;
}

/** One cell, on one line. With `label`, the cell names its column once rows stack; with `actions`, it holds the row's
 *  menu and sits beside the name. */
export const Cell = ({ label, actions, class: className, children }) =>
  html`<td data-slot="table-cell" data-label=${label} class=${cn(TABLE.cell, STACK.cell, actions ? STACK.actions : STACK.line, className)}>${children}</td>`;

/** A row's first cell: what the row is, as the link that opens it when it has `to`. A long name ends in "…", with
 *  the whole of it in `title`; the words beside it, such as You, are never cut. `class` can widen the cell. */
export const Name = ({ title, to, marks = [], class: className }) => html`<${Cell} class=${cn(SHARE, className)}><div class="flex min-w-0 items-baseline gap-x-2">
  ${to ? html`<${Link} class=${CUT} title=${title} to=${to}>${title}<//>` : html`<span class=${CUT} title=${title}>${title}</span>`}
  ${marks.filter(mark => mark !== false).map(mark => [" ", html`<span key=${mark} class="shrink-0 font-normal text-muted-foreground">${mark}</span>`])}
</div><//>`;
