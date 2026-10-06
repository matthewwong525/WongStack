import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { VIEWS, viewLabel, type ViewProps } from './address'
import { Asking, type Ask } from './asking'
import { Notices } from './Notices'

// The current view is boxed, bold and underlined: never marked by colour alone.
const TAB = 'rounded-md border border-transparent px-3 py-2 no-underline aria-[current=page]:border-border aria-[current=page]:font-bold aria-[current=page]:underline'

/** The frame of every owner screen: the switch between the four views, each with its count and this one marked by
 *  more than colour, with the view's add button at the end of that line. The switch is the heading: the current
 *  link names the list under it. Then the one spot for notices, then the list, and beside it whatever is opened.
 *  An opened item with changes holds a move to another view through `useAsk`. */
export function View({ add, children, ...props }: ViewProps & { add?: ReactNode; children: ReactNode }) {
  const { status, view } = props
  const ask = useRef<Ask | null>(null)
  const [leave] = useState(() => (next: Ask | null) => { ask.current = next })
  // The owner is a person too; a removed one is not counted.
  const counts = { people: 1 + status.people.filter(person => person.status === 'active').length,
    roles: status.roles.length, apps: status.apps.length, keys: status.keys.length }
  return <Asking value={leave}><section aria-label={view.title} className="grid min-w-0 gap-4">
    <div className="flex flex-wrap items-center justify-between gap-2.5">
      <nav aria-label="Access views" className="flex flex-wrap gap-2.5">{VIEWS.map(item =>
        <Link key={item.name} to={item.home} className={TAB} aria-current={item === view ? 'page' : undefined}
          onClick={event => { if (ask.current?.(item.home)) event.preventDefault() }}><span id={viewLabel(item)}>{item.title}</span> <span className="font-normal text-muted-foreground">{counts[item.name]}</span></Link>)}</nav>
      {add}
    </div>
    <Notices {...props} />
    {children}
  </section></Asking>
}
