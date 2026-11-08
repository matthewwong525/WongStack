import { SearchIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/** A box that searches as you type. Escape clears it, or calls `onEscape` when it is empty already. */
export function SearchField({ value, onChange, onEscape, label, autoFocus = true }: {
  value: string; onChange: (value: string) => void; onEscape: () => void; label: string; autoFocus?: boolean
}) {
  return <div className="relative">
    <SearchIcon aria-hidden="true" className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
    <Input type="search" aria-label={label} placeholder={label} value={value} autoFocus={autoFocus}
      onChange={event => onChange(event.target.value)}
      onKeyDown={event => {
        if (event.key !== 'Escape') return
        event.preventDefault()
        if (value) onChange('')
        else onEscape()
      }}
      // The browser's own clear button would sit beside this one.
      className="h-9 pr-9 pl-8 [&::-webkit-search-cancel-button]:hidden" />
    {value && <Button type="button" variant="ghost" size="icon-sm" aria-label="Clear" onClick={() => onChange('')}
      className="text-muted-foreground absolute top-1/2 right-1 -translate-y-1/2"><XIcon aria-hidden="true" /></Button>}
  </div>
}
