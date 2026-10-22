import { Card } from '@/components/ui/card'
import type { Item, Status, Tap } from './api'
import { Decision } from './Decision'
import type { Desk } from './desk'
import type { Group } from './groups'
import { LinkRow } from './LinkRow'
import { linkify } from './linkify'
import { PlanCard } from './PlanCard'
import { StartCard } from './StartCard'

/** Where an agent stands in one line: its latest step and the chief's last action, or its checked proof. */
function StatusLine({ status }: { status: Status }) {
  const words = status.state === 'done' ? status.proof || 'Done' : status.state === 'planning' ? 'Planning'
    : [status.step, status.action].filter(Boolean).join(' · ') || 'Working'
  return <p className="text-sm text-muted-foreground wrap-anywhere">{linkify(words)}</p>
}

type Props = { group: Group; online: boolean; desk: Desk; said: Record<string, string>; onTap: (item: Item, tap: Tap) => void
  onReload: (item: Item) => void }

/** One agent or chat: its title and where it stands, then under Needs you each item it waits on, answered there. */
export function AgentCard({ group, online, desk, said, onTap, onReload }: Props) {
  const line = group.status && (group.place !== 'Needs you' || group.status.state === 'working')
  const head = (group.title || line) && <div className="grid min-w-0 gap-0.5">
    {group.title && <h3 className="text-base wrap-anywhere">{group.title}</h3>}
    {line && <StatusLine status={group.status!} />}
  </div>
  // An answer that just reached the agent says so here, as it did on its own card, until the item leaves the list.
  const sent = group.items.some(item => item.tap?.state === 'sent')
  if (group.place !== 'Needs you') return <Card className="gap-2 px-4 py-3">{head}{sent && <p className="text-sm" role="status">Sent</p>}</Card>
  return <Card className="gap-3 p-4">
    {head}
    {group.items.map(item => {
      const own = { item, online, onTap: (tap: Tap) => onTap(item, tap), onReload: () => onReload(item) }
      if (item.link) return <LinkRow key={item.id} item={item} link={item.link} />
      if (item.kind === 'plan') return <PlanCard key={item.id} {...own} />
      if (item.kind === 'start') return <StartCard key={item.id} {...own} desk={desk} said={said[item.id]} />
      return <Decision key={item.id} {...own} desk={desk} said={said[item.id]} />
    })}
  </Card>
}
