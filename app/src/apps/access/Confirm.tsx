import { useId, type ReactNode } from 'react'

/** A removal asks first, and says what it leaves behind. */
export function Confirm({ title, action, pending, onConfirm, onCancel, children }: {
  title: string; action: string; pending: boolean; onConfirm: () => void; onCancel: () => void; children: ReactNode
}) {
  const id = useId()
  return <section aria-labelledby={id} className="access-removal">
    <h2 id={id}>{title}</h2>
    <p>{children}</p>
    <div className="access-actions"><button type="button" disabled={pending} onClick={onConfirm} autoFocus>{action}</button><button type="button" disabled={pending} onClick={onCancel}>Cancel</button></div>
  </section>
}
