import { useContext, useEffect, useState, type ReactNode } from 'react'
import { UNSAFE_DataRouterContext, useBlocker, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { ViewProps } from './address'
import { useAsk } from './asking'
import { Confirm } from './Confirm'

// What answers a press itself, on the page beside an open panel.
const OWN = 'a, button, select, tr, [role="menu"]'

function Leave({ onLeave, onStay }: { onLeave: () => void; onStay: () => void }) {
  return <Confirm title="Leave without saving?" action="Leave" cancel="Keep editing" pending={false} onConfirm={onLeave} onCancel={onStay}>
    Your changes here are not saved yet.
  </Confirm>
}

/** Where the app's router can hold a move, every way out asks: a link, the browser's Back button. A save passes. */
function Held({ pending }: { pending: boolean }) {
  const blocker = useBlocker(!pending)
  return blocker.state === 'blocked' && <Leave onLeave={blocker.proceed} onStay={blocker.reset} />
}

/** One person or role in a panel beside its list. The address opens it; closing goes back to the view's own address.
 *  The page beside it stays in use (`modal` off), so views and rows still work. With `changed`, every way out asks. */
export function Page({ name, changed, action, onSave, extra, children, ...props }: ViewProps & {
  name: string; changed: boolean; action?: string; onSave?: () => void; extra?: ReactNode; children: ReactNode
}) {
  const { view, pending } = props
  const navigate = useNavigate()
  const held = useContext(UNSAFE_DataRouterContext) !== null
  // Where the owner was going when the panel asked.
  const [leaving, setLeaving] = useState<string | null>(null)
  // A reload or a closed tab asks through the browser's own question.
  useEffect(() => {
    const ask = (event: BeforeUnloadEvent) => { if (changed) event.preventDefault() }
    window.addEventListener('beforeunload', ask)
    return () => window.removeEventListener('beforeunload', ask)
  }, [changed])
  // Without a router that holds moves, the panel's own ways out and the views' links ask: true once it has.
  const hold = (to: string) => { const asks = changed && !held; if (asks) setLeaving(to); return asks }
  useAsk(hold)
  const close = () => { if (!hold(view.home)) void navigate(view.home) }
  // The keyboard moving to the page beside the panel closes nothing: only a press there does. A press on a link, a
  // control or a row there is that thing's own to answer: it moves where it says, and the panel does not also go home.
  return <Sheet open modal={false} onOpenChange={close}>
    <SheetContent className="w-full gap-0 sm:top-14 sm:h-auto sm:max-w-md" aria-describedby={undefined} onFocusOutside={event => event.preventDefault()}
      onPointerDownOutside={event => { if ((event.target as Element).closest(OWN)) event.preventDefault() }}>
      {changed && held && <Held pending={pending} />}
      {leaving && <Leave onLeave={() => void navigate(leaving)} onStay={() => setLeaving(null)} />}
      <SheetHeader className="pe-12"><SheetTitle className="wrap-anywhere">{name}</SheetTitle></SheetHeader>
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={event => { event.preventDefault(); onSave?.() }}>
        <fieldset className="flex min-h-0 min-w-0 flex-1 flex-col" disabled={pending}>
          <div className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto px-4 pb-4">{children}</div>
          <SheetFooter className="flex-row flex-wrap gap-2.5 border-t">
            {changed && <p className="basis-full text-sm font-semibold">Not saved yet</p>}
            {action && <Button type="submit">{action}</Button>}
            <Button type="button" variant="outline" onClick={close}>{action ? 'Cancel' : 'Close'}</Button>
            {extra}
          </SheetFooter>
        </fieldset>
      </form>
    </SheetContent>
  </Sheet>
}
