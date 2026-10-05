import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

/** One field of a page: its name, then the field under it. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <Label className="grid gap-2">{label}{children}</Label>
}

/** A boxed group of ticks or level choices under its own name, on a person's and a role's page. */
export function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return <fieldset className="grid min-w-0 gap-3.5 rounded-lg border px-4 pt-3 pb-4"><legend className="px-1.5 font-bold">{legend}</legend>{children}</fieldset>
}

/** One tick with its words: a real checkbox, so the device draws it and the keyboard reaches it. */
export function Tick({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode }) {
  return <Label className="font-semibold">
    <input type="checkbox" className="size-4 accent-primary" checked={checked} onChange={event => onChange(event.target.checked)} />
    {children}
  </Label>
}
