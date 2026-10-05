import { AssistantSetup } from '../../components/AssistantSetup'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from '@/components/ui/dialog'

// For whoever manages Access: a button beside the heading, and the steps in a popup over the page. The popup part
// keeps the keyboard inside it, and closes on Escape, on Close and on a click on the dimmed page round it. It is
// never wider or taller than the screen. The steps are drawn, and so loaded, only while it is open; their
// heading names the popup.
export function Connect() {
  return <Dialog>
    <DialogTrigger asChild><Button type="button" variant="outline">Connect your assistant</Button></DialogTrigger>
    <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto" showCloseButton={false} aria-describedby={undefined}>
      <AssistantSetup popup />
      <DialogFooter showCloseButton />
    </DialogContent>
  </Dialog>
}
