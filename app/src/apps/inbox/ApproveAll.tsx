import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { Item } from './api'

/** One press approves every open approval, one tap each, once the person has read the list it names. */
export function ApproveAll({ items, onApprove }: { items: Item[]; onApprove: () => void }) {
  return <AlertDialog>
    <AlertDialogTrigger asChild><Button type="button" variant="ghost">Approve all</Button></AlertDialogTrigger>
    <AlertDialogContent className="wrap-anywhere">
      <AlertDialogHeader>
        <AlertDialogTitle>Approve all {items.length}?</AlertDialogTitle>
        <AlertDialogDescription>Each goes ahead as its card says:</AlertDialogDescription>
      </AlertDialogHeader>
      <ul className="list-disc ps-5 text-sm">{items.map(item => <li key={item.id}>{item.title}</li>)}</ul>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={onApprove}>Approve all</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
}
