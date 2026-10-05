import { useId, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/** A removal, or leaving with changes not saved, asks first and says what it leaves behind: on the page, not in a popup. */
export function Confirm({ title, action, cancel = 'Cancel', pending, onConfirm, onCancel, children }: {
  title: string; action: string; cancel?: string; pending: boolean; onConfirm: () => void; onCancel: () => void; children: ReactNode
}) {
  const id = useId()
  return <section aria-labelledby={id}><Card className="gap-3 p-4 wrap-anywhere">
    <h2 id={id}>{title}</h2>
    <p>{children}</p>
    <div className="flex flex-wrap gap-2.5">
      <Button type="button" variant="outline" disabled={pending} onClick={onConfirm} autoFocus>{action}</Button>
      <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>{cancel}</Button>
    </div>
  </Card></section>
}
