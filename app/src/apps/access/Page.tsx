import { useContext, useEffect, useState, type ReactNode } from 'react'
import { Link, UNSAFE_DataRouterContext, useBlocker, useNavigate } from 'react-router'
import type { ViewProps } from './address'
import { Confirm } from './Confirm'
import { View } from './View'

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

/** One person, role, app or key, inside the frame every screen shares: where it sits under its view, its fields,
 *  and one save. With `changed`, leaving asks first: by the way back, Cancel, or another view. */
export function Page({ name, changed, action, onSave, extra, children, ...props }: ViewProps & {
  name: string; changed: boolean; action: string; onSave: () => void; extra?: ReactNode; children: ReactNode
}) {
  const { view, pending } = props
  const navigate = useNavigate()
  const held = useContext(UNSAFE_DataRouterContext) !== null
  // Where the owner was going when the page asked.
  const [leaving, setLeaving] = useState<string | null>(null)
  // A reload or a closed tab asks through the browser's own question.
  useEffect(() => {
    const ask = (event: BeforeUnloadEvent) => { if (changed) event.preventDefault() }
    window.addEventListener('beforeunload', ask)
    return () => window.removeEventListener('beforeunload', ask)
  }, [changed])
  // Without a router that holds moves, the page's own ways out ask: true once it has.
  const hold = (to: string) => { const asks = changed && !held; if (asks) setLeaving(to); return asks }
  return <View {...props} ask={hold}>
    {changed && held && <Held pending={pending} />}
    {leaving && <Leave onLeave={() => void navigate(leaving)} onStay={() => setLeaving(null)} />}
    <form className="access-form" onSubmit={event => { event.preventDefault(); onSave() }}>
      <p className="access-crumb"><Link to={view.home} onClick={event => { if (hold(view.home)) event.preventDefault() }}>{view.title}</Link><span aria-hidden="true"> › </span><span>{name}</span></p>
      <fieldset className="access-fields" disabled={pending || !!leaving}>
        {children}
        <div className="access-actions">
          <button type="submit" className="access-primary">{action}</button>
          <button type="button" onClick={() => { if (!hold(view.home)) void navigate(view.home) }}>Cancel</button>
          {extra}
        </div>
      </fieldset>
    </form>
  </View>
}
