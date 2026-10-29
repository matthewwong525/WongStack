import { useSearchParams } from 'react-router'
import { PlanView } from './PlanView'
import { Week } from './week/Week'

// The signed-in person's week: their tasks by day and the backlog, and a plan opened from a task at `?item=<id>`. Their
// computer fills it and delivers each answer to its chat. wiki/development/reply-links.md
export function App() {
  const [params] = useSearchParams()
  const id = params.get('item')
  return id ? <PlanView key={id} id={id} /> : <Week />
}
