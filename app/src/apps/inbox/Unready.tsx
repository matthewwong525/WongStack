import { Loading } from '@/components/Loading'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

/** A view before its first answer: loading, or unavailable with Retry. */
export function Unready({ error, label, onRetry }: { error: boolean; label: string; onRetry: () => void }) {
  return <div className="grid gap-4">
    <h1>Inbox</h1>
    {error ? <><p role="alert">The inbox is unavailable.</p>
      <Button type="button" variant="outline" className="justify-self-start" onClick={onRetry}>Retry</Button></>
      : <Loading label={label} className="grid gap-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></Loading>}
  </div>
}
