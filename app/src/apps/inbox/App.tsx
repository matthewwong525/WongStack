import { useSearchParams } from 'react-router'
import { useLine } from './line'
import { List } from './List'
import { PlanView } from './PlanView'
import { Schedules } from './Schedules'

// What waits on the signed-in person: a list, a plan opened from it at `?item=<id>`, and their schedules at
// `?view=schedules`. Their computer fills it and delivers each answer to its chat. wiki/development/reply-links.md
export function App() {
  const [params] = useSearchParams()
  // Held here, so moving between views keeps the one line open.
  useLine()
  const id = params.get('item')
  if (id) return <PlanView key={id} id={id} />
  return params.get('view') === 'schedules' ? <Schedules /> : <List />
}
