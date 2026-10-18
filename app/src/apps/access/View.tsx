import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { VIEWS, viewLabel, type Tab, type ViewProps } from './address'
import { Asking, type Ask } from './asking'
import { keyRows } from './mcp'
import { Notices } from './Notices'

// The current view is boxed, bold and underlined: never marked by colour alone.
const TAB = 'rounded-md border border-transparent px-3 py-2 no-underline aria-[current=page]:border-border aria-[current=page]:font-bold aria-[current=page]:underline'

/** The views' line: a link per view with its count, then the add button. `onMove` holds a move that must ask first. */
export function Switch({ views, view, counts, add, onMove }: {
  views: readonly Tab[]; view: Tab; counts: Partial<Record<string, number | null>>; add?: ReactNode; onMove?: (to: string) => boolean
}) {
  return <div className="flex flex-wrap items-center justify-between gap-2.5">
    <nav aria-label="Access views" className="flex flex-wrap gap-2.5">{views.map(item =>
      <Link key={item.name} to={item.home} className={TAB} aria-current={item === view ? 'page' : undefined}
        onClick={event => { if (onMove?.(item.home)) event.preventDefault() }}><span id={viewLabel(item)}>{item.title}</span> <span className="font-normal text-muted-foreground">{counts[item.name]}</span></Link>)}</nav>
    {add}
  </div>
}

/** The frame of every owner screen: the switch between the views with the add button, the one spot for notices,
 *  the list, and whatever is opened beside it. An opened item with changes holds a move through `useAsk`. */
export function View({ add, children, ...props }: ViewProps & { add?: ReactNode; children: ReactNode }) {
  const { status, mcp, view } = props
  const ask = useRef<Ask | null>(null)
  const [leave] = useState(() => (next: Ask | null) => { ask.current = next })
  // The owner is a person too; a removed one is not counted. Services counts its keys and MCPs once they are read.
  const counts = { people: 1 + status.people.filter(person => person.status === 'active').length, roles: status.roles.length,
    services: mcp.data && keyRows(status.keys).length + mcp.data.servers.length }
  return <Asking value={leave}><section aria-label={view.title} className="grid min-w-0 gap-4">
    <Switch views={VIEWS} view={view} counts={counts} add={add} onMove={to => !!ask.current?.(to)} />
    <Notices {...props} />
    {children}
  </section></Asking>
}
