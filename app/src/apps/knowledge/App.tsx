import { useParams } from 'react-router'
import { List } from './List'
import { Reader } from './Reader'

// The Knowledge app: /apps/knowledge/ lists every page, and /apps/knowledge/<address> shows one. Its server side,
// app/worker/apps/knowledge/, reads the knowledge repository's newest save. wiki/stack/knowledge-reader.md
export function App() {
  const at = useParams()['*']!.replace(/\/$/, '')
  return at ? <Reader key={at} at={at} /> : <List />
}
