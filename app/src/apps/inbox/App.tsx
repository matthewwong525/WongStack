import { useSearchParams } from 'react-router'
import { PlanView } from './PlanView'
import { Reviews } from './Reviews'
import { Week } from './week/Week'

// The signed-in person's week: their tasks by day and the backlog, their review pages at `?view=reviews`, and a page
// opened at `?item=<id>`. Their computer fills it and delivers each answer to its chat. wiki/development/reply-links.md
export function App() {
  const [params] = useSearchParams()
  const id = params.get('item')
  if (id) return <PlanView key={id} id={id} />
  return params.get('view') === 'reviews' ? <Reviews /> : <Week />
}
