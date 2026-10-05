import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import type { ViewProps } from './address'

/** One person, role, app or key: a way back to its view, its fields, and one save. */
export function Page({ view, pending, action, onSave, extra, children }: Pick<ViewProps, 'view' | 'pending'> & {
  action: string; onSave: () => void; extra?: ReactNode; children: ReactNode
}) {
  const navigate = useNavigate()
  return <form className="access-form" onSubmit={event => { event.preventDefault(); onSave() }}>
    <Link to={view.home}><span aria-hidden="true">← </span>{view.title}</Link>
    <fieldset className="access-fields" disabled={pending}>
      {children}
      <div className="access-actions">
        <button type="submit" className="access-primary">{action}</button>
        <button type="button" onClick={() => void navigate(view.home)}>Cancel</button>
        {extra}
      </div>
    </fieldset>
  </form>
}
