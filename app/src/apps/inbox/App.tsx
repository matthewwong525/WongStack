import { useSearchParams } from 'react-router'
import { PlanView } from './PlanView'
import { Schedules } from './Schedules'
import { SharedView } from './SharedView'
import { Waiting } from './Waiting'

// The signed-in person's waiting and past pages, schedules at `?view=schedules`, a page at `?item=<id>`, and a page a
// teammate shared at `?shared=<token>`. Their computer fills it and gets each answer. wiki/development/reply-links.md
export function App() {
  const [params] = useSearchParams()
  const id = params.get('item')
  if (id) return <PlanView key={id} id={id} />
  const shared = params.get('shared')
  if (shared) return <SharedView key={shared} token={shared} />
  return params.get('view') === 'schedules' ? <Schedules /> : <Waiting />
}
