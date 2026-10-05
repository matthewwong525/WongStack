import { useState } from 'react'
import type { Level, SavedKey } from '../../lib/access'
import type { ViewProps } from './address'
import { LevelChoice } from './LevelChoice'
import { keyState, keyUseLine } from './levels'
import { Page } from './Page'
import { differs, each, put, subjects } from './subjects'

/** One key: its level for every role and every person with their own set, in one save. */
export function KeyPage({ item, ...props }: ViewProps & { item: SavedKey }) {
  const { status, save } = props
  const list = subjects(status)
  const [levels, setLevels] = useState(() => each<Level | null>(list, ({ set }) => set.keys[item.id] ?? null))
  const [start] = useState(levels)
  return <Page {...props} name={item.title} changed={differs(start, levels)} action="Save access" onSave={() => save('grants', { key: item.id, ...levels })}>
    <h2>{item.title} · {keyState(item, status.environment)}</h2>
    <p>{keyUseLine(item)}</p>
    {list.map(subject => <LevelChoice key={subject.kind + subject.id} legend={subject.label} levels={item.levels}
      value={levels[subject.kind][subject.id]} onChange={level => setLevels(put(levels, subject, level))} />)}
    {!list.length && <p>No roles or people yet.</p>}
  </Page>
}
