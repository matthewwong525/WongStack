import { useEffect, useRef, useState, type ReactNode } from 'react'

/** What you can do with one row, behind `⋯`. It closes on a pick, on Escape and on a click anywhere else. */
export function RowMenu({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const menu = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    if (!open) return
    const outside = (event: MouseEvent) => { if (!menu.current!.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('click', outside)
    return () => document.removeEventListener('click', outside)
  }, [open])
  return <details ref={menu} className="access-menu" open={open} onToggle={event => setOpen(event.currentTarget.open)}
    onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); event.currentTarget.querySelector('summary')!.focus() } }}>
    <summary aria-label={label}><span aria-hidden="true">⋯</span></summary>
    <div className="access-menu-items" onClick={() => setOpen(false)}>{children}</div>
  </details>
}
