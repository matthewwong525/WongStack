import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

/** What you can do with one row, behind `⋯`. The menu part closes it on a pick, on Escape and on a click anywhere
 *  else, and moves through it by arrow keys. It does not hold the keyboard or the page while it is open (`modal`
 *  off): a pick that asks a question first hands the keyboard to the question, and Escape hands it back to the dots. */
export function RowMenu({ label, children }: { label: string; children: ReactNode }) {
  return <DropdownMenu modal={false}>
    <DropdownMenuTrigger asChild><Button type="button" variant="outline" size="icon" aria-label={label}><span aria-hidden="true">⋯</span></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end">{children}</DropdownMenuContent>
  </DropdownMenu>
}
