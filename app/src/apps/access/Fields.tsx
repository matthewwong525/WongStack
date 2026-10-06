import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

/** One field of an opened item: its name, then the field under it. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <Label className="grid gap-2">{label}{children}</Label>
}

/** A group of ticks or level choices under its own bold name, for a person and a role. No box goes round it:
 *  the name and more room above than between its lines set it apart. */
export function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return <fieldset className="mt-2 grid min-w-0 gap-3.5"><legend className="mb-3 font-bold">{legend}</legend>{children}</fieldset>
}

/** One tick with its words: a real checkbox, so the device draws it and the keyboard reaches it. */
export function Tick({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode }) {
  return <Label className="font-semibold">
    <input type="checkbox" className="size-4 accent-primary" checked={checked} onChange={event => onChange(event.target.checked)} />
    {children}
  </Label>
}
