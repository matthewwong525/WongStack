import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

/** What you can do with one row, behind `⋯`. `modal` is off, so the menu holds neither the keyboard nor the page:
 *  a pick that asks a question hands the keyboard to the question, and Escape hands it back to the dots. */
export function RowMenu({ label, children }: { label: string; children: ReactNode }) {
  return <DropdownMenu modal={false}>
    <DropdownMenuTrigger asChild><Button type="button" variant="outline" size="icon" aria-label={label}><span aria-hidden="true">⋯</span></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end">{children}</DropdownMenuContent>
  </DropdownMenu>
}
