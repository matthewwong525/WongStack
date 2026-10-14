import { useState, type ReactNode } from 'react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

/** The one way Access asks a question: a popup, open while it is drawn. The way out is focused first and is Escape's
 *  answer too; a click on the dimmed page answers nothing. */
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

/** Giving Admin asks first, in a person's row and in their panel: it is full trust. */
export function MakeAdmin({ email, ...props }: { email: string; pending: boolean; onConfirm: () => void; onCancel: () => void }) {
  return <Confirm title={`Make ${email} an Admin?`} action="Make Admin" {...props}>Every app, every key, and can change anyone's access.</Confirm>
}
