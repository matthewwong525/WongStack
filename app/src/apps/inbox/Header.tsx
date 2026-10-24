import { useSearchParams } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const PICKED = 'px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground'

/** The title, whether the computer is on, and the switch between the person's agents, the default, and their schedules,
 *  kept in the address at `?view=schedules` so a link opens it. */
export function Header({ online }: { online: boolean }) {
  const [params, setParams] = useSearchParams()
  const show = (view: string) => {
    if (!view) return
    const next = new URLSearchParams(params)
    if (view === 'schedules') next.set('view', view)
    else next.delete('view')
    setParams(next)
  }
  return <div className="grid grid-cols-1 gap-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h1>Inbox</h1>
      {online ? <Badge variant="secondary">Computer online</Badge> : <Badge variant="destructive">Computer offline</Badge>}
    </div>
    <ToggleGroup type="single" variant="outline" aria-label="Show" value={params.get('view') === 'schedules' ? 'schedules' : 'agents'} onValueChange={show}>
      <ToggleGroupItem value="agents" className={PICKED}>Agents</ToggleGroupItem>
      <ToggleGroupItem value="schedules" className={PICKED}>Schedules</ToggleGroupItem>
    </ToggleGroup>
  </div>
}
