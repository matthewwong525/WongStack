import { Fragment, type ComponentProps, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { viewLabel, type ViewProps } from './address'

// On a narrow page each row stacks into short lines: the name with its menu beside it, then a line per cell.
// The page measures itself (`@container` on it), so the rows stack by the room they have, and nothing scrolls sideways.
const STACK = {
  table: '@max-[44rem]:block',
  // The header row stays for a screen reader once rows stack: hidden from sight, never removed.
  head: '@max-[44rem]:sr-only',
  row: '@max-[44rem]:grid @max-[44rem]:grid-cols-[minmax(0,1fr)_auto] @max-[44rem]:gap-x-2.5 @max-[44rem]:gap-y-1 @max-[44rem]:py-3',
  // A stacked line may wrap, and a long word breaks.
  cell: '@max-[44rem]:block @max-[44rem]:p-0 @max-[44rem]:whitespace-normal @max-[44rem]:wrap-anywhere @max-[44rem]:first:font-semibold',
  // A cell whose words don't say what it is shows its column's name first.
  line: '@max-[44rem]:not-first:col-span-full @max-[44rem]:data-label:before:text-muted-foreground @max-[44rem]:data-label:before:content-[attr(data-label)_":_"]',
  actions: '@max-[44rem]:col-start-2 @max-[44rem]:row-start-1',
}
// A column that gives way: on a computer it takes a share of the row and no more, so every row stays one line.
const SHARE = 'w-[30%] max-w-0 @max-[44rem]:w-auto @max-[44rem]:max-w-none'
// Words too long for their column end in "…"; the whole of them is in `title`.
const CUT = 'truncate @max-[44rem]:whitespace-normal'
// The row of the item that is open: filled, with a bar on its leading edge, so it is not marked by colour alone.
// Every row is the same height on a computer, with or without a control in it; stacked rows take what they need.
const EVEN = 'h-14 @max-[44rem]:h-auto'
const OPEN = 'aria-[current=true]:bg-muted aria-[current=true]:[&>td:first-child]:shadow-[inset_0.2rem_0_0_var(--color-primary)]'

/** A list: a table whose columns every row shares, each row one line on a computer. The current link in the switch
 *  above is its heading and names it. `actions` names a last column of row menus, for a screen reader alone. With
 *  `empty`, that is said in the table's place; `hint` is a quiet line under the table. The table itself is a plain
 *  one: the ready-made frame round a table scrolls sideways, and these rows stack instead. */
export function Table({ view, columns, actions, empty, hint, children }: {
  view: ViewProps['view']; columns: string[]; actions?: string; empty?: ReactNode; hint?: string; children: ReactNode
}) {
  return empty || <>
    <table className={cn('w-full text-sm', STACK.table)} aria-labelledby={viewLabel(view)}>
      <TableHeader className={STACK.head}><TableRow className="hover:bg-transparent">
        {columns.map(column => <TableHead scope="col" className="text-muted-foreground" key={column}>{column}</TableHead>)}
        {actions && <TableHead scope="col"><span className="sr-only">{actions}</span></TableHead>}
      </TableRow></TableHeader>
      <TableBody className={STACK.table}>{children}</TableBody>
    </table>
    {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
  </>
}

/** One row: a line divides it from the next, and no box goes round it. With `to`, a click anywhere on it that is
 *  not a control opens that item, as the link in its first cell does, and the row says so under the pointer.
 *  `current` marks the row of the item that is open. */
export function Row({ to, current, children }: { to?: string; current?: boolean; children: ReactNode }) {
  const navigate = useNavigate()
  return <TableRow aria-current={current ? 'true' : undefined} className={cn(STACK.row, EVEN, OPEN, to ? 'cursor-pointer focus-within:bg-muted/50' : 'hover:bg-transparent')}
    onClick={event => { if (to && !(event.target as Element).closest('a, button, select, [role="menu"]')) void navigate(to) }}>{children}</TableRow>
}

/** One cell, on one line. With `label`, the cell names its column once rows stack; with `actions`, it holds the row's
 *  menu and sits beside the name. With `cut`, those words are the cell: its column gives way and they end in "…". */
export function Cell({ label, actions, cut, className, children, ...props }: ComponentProps<'td'> & { label?: string; actions?: boolean; cut?: string }) {
  return <TableCell data-label={label} title={cut} className={cn(STACK.cell, actions ? STACK.actions : STACK.line, cut !== undefined && `${SHARE} ${CUT}`, className)} {...props}>{cut ?? children}</TableCell>
}

/** A row's first cell: what the row is, as the link that opens it when it has `to`. A long name ends in "…", with
 *  the whole of it in `title`; the words beside it, such as You, are never cut. */
export function Name({ title, to, marks = [] }: { title: string; to?: string; marks?: (string | false)[] }) {
  return <Cell className={SHARE}><div className="flex min-w-0 items-baseline gap-x-2">
    {to ? <Link className={CUT} title={title} to={to}>{title}</Link> : <span className={CUT} title={title}>{title}</span>}
    {marks.filter(mark => mark !== false).map(mark => <Fragment key={mark}>{' '}<span className="shrink-0 font-normal text-muted-foreground">{mark}</span></Fragment>)}
  </div></Cell>
}
