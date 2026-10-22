import { useSearchParams } from 'react-router'
import { List } from './List'
import { PlanView } from './PlanView'

// What waits on the signed-in person: a list, and a plan opened from it at `?item=<id>`. The person's computer
// fills it and delivers each answer to its chat. wiki/development/reply-links.md
export function App() {
  const [params] = useSearchParams()
  const id = params.get('item')
  return id ? <PlanView key={id} id={id} /> : <List />
}
