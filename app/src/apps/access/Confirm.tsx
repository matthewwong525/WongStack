import { useState, type ReactNode } from 'react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

/** A removal, or leaving with changes not saved, asks first and says what it leaves behind, in a popup over the page:
 *  the one way Access asks a question. It is open while it is drawn. The way out is focused first and is Escape's
 *  answer too; the action is the one solid button; a click on the dimmed page answers nothing. Once answered, the
 *  keyboard goes back to where it was. */
export function Confirm({ title, action, cancel = 'Cancel', pending, onConfirm, onCancel, children }: {
  title: string; action: string; cancel?: string; pending: boolean; onConfirm: () => void; onCancel: () => void; children: ReactNode
}) {
  const [from] = useState(() => document.activeElement as HTMLElement)
  return <AlertDialog open onOpenChange={onCancel}>
    <AlertDialogContent className="wrap-anywhere" onCloseAutoFocus={() => from.focus()}>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{children}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>{cancel}</AlertDialogCancel>
        {/* The part would close the popup on this press: the answer does that, so a save shows as on its way first. */}
        <AlertDialogAction disabled={pending} onClick={event => { event.preventDefault(); onConfirm() }}>{action}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
}
