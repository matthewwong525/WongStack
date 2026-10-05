import { useContext, useEffect, useState, type ReactNode } from 'react'
import { Link, UNSAFE_DataRouterContext, useBlocker, useNavigate } from 'react-router'
import type { ViewProps } from './address'
import { Confirm } from './Confirm'

function Leave({ onLeave, onStay }: { onLeave: () => void; onStay: () => void }) {
  return <Confirm title="Leave without saving?" action="Leave" cancel="Keep editing" pending={false} onConfirm={onLeave} onCancel={onStay}>
    Your changes on this page are not saved yet.
  </Confirm>
}

/** Where the app's router can hold a move, every way out asks: a link, the browser's Back button. A save passes. */
function Held({ pending }: { pending: boolean }) {
  const blocker = useBlocker(!pending)
  return blocker.state === 'blocked' && <Leave onLeave={blocker.proceed} onStay={blocker.reset} />
}

/** One person, role, app or key: a way back to its view, its fields, and one save. With `changed`, leaving asks first. */
export function Page({ view, pending, changed, action, onSave, extra, children }: Pick<ViewProps, 'view' | 'pending'> & {
  changed: boolean; action: string; onSave: () => void; extra?: ReactNode; children: ReactNode
}) {
  const navigate = useNavigate()
  const held = useContext(UNSAFE_DataRouterContext) !== null
  const [leaving, setLeaving] = useState(false)
  // A reload or a closed tab asks through the browser's own question.
  useEffect(() => {
    const ask = (event: BeforeUnloadEvent) => { if (changed) event.preventDefault() }
    window.addEventListener('beforeunload', ask)
    return () => window.removeEventListener('beforeunload', ask)
  }, [changed])
  // Without a router that holds moves, the page's own ways out ask.
  const asks = changed && !held
  return <>
    {changed && held && <Held pending={pending} />}
    {leaving && <Leave onLeave={() => void navigate(view.home)} onStay={() => setLeaving(false)} />}
    <form className="access-form" onSubmit={event => { event.preventDefault(); onSave() }}>
      <Link to={view.home} onClick={event => { if (asks) { event.preventDefault(); setLeaving(true) } }}><span aria-hidden="true">← </span>{view.title}</Link>
      <fieldset className="access-fields" disabled={pending || leaving}>
        {children}
        <div className="access-actions">
          <button type="submit" className="access-primary">{action}</button>
          <button type="button" onClick={() => asks ? setLeaving(true) : void navigate(view.home)}>Cancel</button>
          {extra}
        </div>
      </fieldset>
    </form>
  </>
}
