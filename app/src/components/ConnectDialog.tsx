import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { AssistantSetup } from './AssistantSetup'

// The steps for connecting an assistant, in a popup over the page; the child is what opens it. The popup part keeps
// the keyboard inside it, and closes on Escape, on Close and on a click on the dimmed page round it. It is never
// wider or taller than the screen. The steps are drawn, and so loaded, only while it is open; their heading names
// the popup.
export function ConnectDialog({ children }: { children: ReactNode }) {
  return <Dialog>
    <DialogTrigger asChild>{children}</DialogTrigger>
    <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto" showCloseButton={false} aria-describedby={undefined}>
      <AssistantSetup popup />
      <DialogFooter showCloseButton />
    </DialogContent>
  </Dialog>
}
