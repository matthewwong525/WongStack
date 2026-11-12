import { useSearchParams } from 'react-router'
import { PlanView } from './PlanView'
import { Schedules } from './Schedules'
import { Waiting } from './Waiting'

// The signed-in person's waiting and past review pages, schedules at `?view=schedules`, and a page at `?item=<id>`.
// Their computer fills it and delivers each answer to its chat. wiki/development/reply-links.md
export function App() {
  const [params] = useSearchParams()
  const id = params.get('item')
  if (id) return <PlanView key={id} id={id} />
  return params.get('view') === 'schedules' ? <Schedules /> : <Waiting />
}
