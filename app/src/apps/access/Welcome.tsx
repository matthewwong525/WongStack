import { useState, type ReactNode } from 'react'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { setupSchema, useAccess, type Status } from '../../lib/access'
import { CopyText } from '../../components/CopyText'
import { mayConnect, welcomeNote } from './note'

type Props = { status: Status; person: Parameters<typeof welcomeNote>[1]; children: (note: string) => ReactNode }

/** The viewer's own setup message, the same for everyone, read once for a person who may connect. Until it is read,
 *  or when it can't be, the note falls back to the address and email. */
function WithSetup({ status, person, children }: Props) {
  const { data } = useAccess('setup', setupSchema)
  return children(welcomeNote(status, person, data?.prompt.state === 'ready' ? data.prompt.text : undefined))
}

/** The message to send a person, handed to `children`. Only a person who may connect gets the setup message, so only
 *  then is it read. */
function Note(props: Props) {
  return mayConnect(props.status, props.person) ? <WithSetup {...props} /> : props.children(welcomeNote(props.status, props.person))
}

/** The message as it reads, with one button to copy it. Copying sends nothing. */
function Body({ note, variant }: { note: string; variant: 'default' | 'outline' }) {
  return <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
    <p className="whitespace-pre-line wrap-anywhere text-sm text-muted-foreground">{note}</p>
    <CopyText text={note} label="Copy" variant={variant} shown />
  </div>
}

/** The popup after a save that gives a person the project: the message to send them, Copy, and Done. */
export function WelcomeDialog({ status, person }: Pick<Props, 'status' | 'person'>) {
  const [open, setOpen] = useState(true)
  return <AlertDialog open={open} onOpenChange={setOpen}>
    <AlertDialogContent className="wrap-anywhere">
      <AlertDialogHeader>
        <AlertDialogTitle>Send {person.email} this message</AlertDialogTitle>
        <AlertDialogDescription>They paste it into their AI assistant to connect.</AlertDialogDescription>
      </AlertDialogHeader>
      <Note status={status} person={person}>{note => <Body note={note} variant="default" />}</Note>
      <AlertDialogFooter><AlertDialogCancel>Done</AlertDialogCancel></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
}

/** The same message folded under a person's own Project tick, to copy it again. */
export function WelcomeFold({ status, person }: Pick<Props, 'status' | 'person'>) {
  return <details className="text-sm">
    <summary className="cursor-pointer">Message to send them</summary>
    <div className="mt-2"><Note status={status} person={person}>{note => <Body note={note} variant="outline" />}</Note></div>
  </details>
}
