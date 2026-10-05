import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { VIEWS, type ViewProps } from './address'

/** One of the owner's four views: the switch, with this view marked by more than colour, then its list. */
export function View({ view, children }: Pick<ViewProps, 'view'> & { children: ReactNode }) {
  return <section aria-label={view.title} className="access-view">
    <nav aria-label="Access views" className="access-views">{VIEWS.map(item =>
      <Link key={item.name} to={item.home} aria-current={item === view ? 'page' : undefined}>{item.title}</Link>)}</nav>
    {children}
  </section>
}
