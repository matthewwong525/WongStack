import { useSearchParams } from 'react-router'
import { PlanView } from './PlanView'
import { Reviews } from './Reviews'
import { Schedules } from './Schedules'
import { Week } from './week/Week'

// The signed-in person's week by day and the backlog, reviews at `?view=reviews`, schedules at `?view=schedules`, and a
// page at `?item=<id>`. Their computer fills it and delivers each answer to its chat. wiki/development/reply-links.md
export function App() {
  const [params] = useSearchParams()
  const id = params.get('item')
  if (id) return <PlanView key={id} id={id} />
  const view = params.get('view')
  return view === 'reviews' ? <Reviews /> : view === 'schedules' ? <Schedules /> : <Week />
}
