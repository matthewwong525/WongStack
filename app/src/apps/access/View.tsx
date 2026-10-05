import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { VIEWS, type ViewProps } from './address'
import { Notices } from './Notices'

/** The frame of every owner screen, a list or a page under it: the switch between the four views, each with its
 *  count and this one marked by more than colour, then the one spot for notices, then the screen itself.
 *  `ask` lets a changed page hold a move to another view: it returns true once it has asked. */
export function View({ ask, children, ...props }: ViewProps & { ask?: (to: string) => boolean; children: ReactNode }) {
  const { status, view } = props
  // The owner is a person too; a removed one is not counted.
  const counts = { people: 1 + status.people.filter(person => person.status === 'active').length,
    roles: status.roles.length, apps: status.apps.length, keys: status.keys.length }
  return <section aria-label={view.title} className="access-view">
    <nav aria-label="Access views" className="access-views">{VIEWS.map(item =>
      <Link key={item.name} to={item.home} aria-current={item === view ? 'page' : undefined}
        onClick={event => { if (ask?.(item.home)) event.preventDefault() }}>{item.title} <span className="access-count">{counts[item.name]}</span></Link>)}</nav>
    <Notices {...props} />
    {children}
  </section>
}
