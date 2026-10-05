import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { VIEWS, type ViewProps } from './address'
import { Notices } from './Notices'

// The current view is boxed, bold and underlined: never marked by colour alone.
const TAB = 'rounded-md border border-transparent px-3 py-2 no-underline aria-[current=page]:border-border aria-[current=page]:font-bold aria-[current=page]:underline'

/** The frame of every owner screen, a list or a page under it: the switch between the four views, each with its
 *  count and this one marked by more than colour, then the one spot for notices, then the screen itself.
 *  `ask` lets a changed page hold a move to another view: it returns true once it has asked. */
export function View({ ask, children, ...props }: ViewProps & { ask?: (to: string) => boolean; children: ReactNode }) {
  const { status, view } = props
  // The owner is a person too; a removed one is not counted.
  const counts = { people: 1 + status.people.filter(person => person.status === 'active').length,
    roles: status.roles.length, apps: status.apps.length, keys: status.keys.length }
  return <section aria-label={view.title} className="grid min-w-0 gap-4">
    <nav aria-label="Access views" className="flex flex-wrap gap-2.5">{VIEWS.map(item =>
      <Link key={item.name} to={item.home} className={TAB} aria-current={item === view ? 'page' : undefined}
        onClick={event => { if (ask?.(item.home)) event.preventDefault() }}>{item.title} <span className="font-normal text-muted-foreground">{counts[item.name]}</span></Link>)}</nav>
    <Notices {...props} />
    {children}
  </section>
}
