import { useId, type ComponentProps, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

// On a narrow page each row stacks into short lines: the name with its menu beside it, then a line per cell.
// The page measures itself (`@container` on it), so the rows stack by the room they have, and nothing scrolls sideways.
const STACK = {
  table: '@max-[44rem]:block',
  // The header row stays for a screen reader once rows stack: hidden from sight, never removed.
  head: '@max-[44rem]:sr-only',
  row: '@max-[44rem]:grid @max-[44rem]:grid-cols-[1fr_auto] @max-[44rem]:gap-x-2.5 @max-[44rem]:gap-y-1 @max-[44rem]:py-3',
  cell: '@max-[44rem]:block @max-[44rem]:p-0 @max-[44rem]:first:font-semibold',
  // A cell whose words don't say what it is shows its column's name first.
  line: '@max-[44rem]:not-first:col-span-full @max-[44rem]:data-label:before:text-muted-foreground @max-[44rem]:data-label:before:content-[attr(data-label)_":_"]',
  actions: '@max-[44rem]:col-start-2 @max-[44rem]:row-start-1',
}

/** The frame of a list: its title, the add spot on the right, then a table whose columns every row shares.
 *  `actions` names a last column of row menus, for a screen reader alone. With `empty`, that is said in the table's place.
 *  The table itself is a plain one: the ready-made frame round a table scrolls sideways, and these rows stack instead. */
export function Table({ title, add, columns, actions, empty, children }: {
  title: string; add: ReactNode; columns: string[]; actions?: string; empty?: ReactNode; children: ReactNode
}) {
  const id = useId()
  return <>
    <div className="flex flex-wrap items-center justify-between gap-2.5"><h2 id={id}>{title}</h2>{add}</div>
    {empty || <table className={cn('w-full text-sm', STACK.table)} aria-labelledby={id}>
      <TableHeader className={STACK.head}><TableRow className="hover:bg-transparent">
        {columns.map(column => <TableHead scope="col" className="text-muted-foreground" key={column}>{column}</TableHead>)}
        {actions && <TableHead scope="col"><span className="sr-only">{actions}</span></TableHead>}
      </TableRow></TableHeader>
      <TableBody className={STACK.table}>{children}</TableBody>
    </table>}
  </>
}

/** One row: a line divides it from the next, and no box goes round it. With `to`, a click anywhere on it that is
 *  not a control opens that page, as the link in its first cell does, and the row says so under the pointer. */
export function Row({ to, children }: { to?: string; children: ReactNode }) {
  const navigate = useNavigate()
  return <TableRow className={cn(STACK.row, to ? 'cursor-pointer focus-within:bg-muted/50' : 'hover:bg-transparent')}
    onClick={event => { if (to && !(event.target as Element).closest('a, button, select, [role="menu"]')) void navigate(to) }}>{children}</TableRow>
}

/** One cell. No column has a fixed width, and a long word breaks. With `label`, the cell names its column once rows
 *  stack; with `actions`, it holds the row's menu and sits beside the name. */
export function Cell({ label, actions, className, ...props }: ComponentProps<'td'> & { label?: string; actions?: boolean }) {
  return <TableCell data-label={label} className={cn('align-top whitespace-normal wrap-anywhere', STACK.cell, actions ? STACK.actions : STACK.line, className)} {...props} />
}
