import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { AssistantSetup } from './AssistantSetup'

// The steps for connecting an assistant, in a popup opened by its child: Home's card, the one way in. It is never
// wider or taller than the screen, and the steps are drawn, and so loaded, only while it is open.
export function ConnectDialog({ children }: { children: ReactNode }) {
  return <Dialog>
    <DialogTrigger asChild>{children}</DialogTrigger>
    <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto"><AssistantSetup /></DialogContent>
  </Dialog>
}
