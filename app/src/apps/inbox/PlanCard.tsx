import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { label, type Item, type Tap } from './api'
import { TapLine } from './TapLine'

/** A plan waiting for review: what it is, where it came from, *Open plan*, and where its last answer stands. */
export function PlanCard({ item, online, onTap, onReload }: { item: Item; online: boolean; onTap: (tap: Tap) => void; onReload: () => void }) {
  // A changed plan says so inside the plan: here, Open plan already opens the new one.
  const line = item.tap?.state === 'changed' ? null : item.tap
  return <Card className="gap-3 p-4">
    <div className="grid gap-1">
      <h3 className="text-base wrap-anywhere">{item.title}</h3>
      <p className="text-sm text-muted-foreground wrap-anywhere">{item.workspace}</p>
    </div>
    <Button asChild className="justify-self-start"><Link to={`?item=${item.id}`}>Open plan</Link></Button>
    {line && <TapLine tap={line} online={online} copy={`${item.title}: ${line.text || label(line.action)}`} onChange={onTap} onReload={onReload} />}
  </Card>
}
