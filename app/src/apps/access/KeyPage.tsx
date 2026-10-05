import { useState } from 'react'
import type { Level, SavedKey } from '../../lib/access'
import type { ViewProps } from './address'
import { LevelChoice } from './LevelChoice'
import { keyState, keyUseLine } from './levels'
import { Page } from './Page'
import { each, put, subjects } from './subjects'

/** One key: its level for every role and every person with their own set, in one save. */
export function KeyPage({ status, view, pending, save, item }: ViewProps & { item: SavedKey }) {
  const list = subjects(status)
  const [levels, setLevels] = useState(() => each<Level | null>(list, ({ set }) => set.keys[item.id] ?? null))
  return <Page view={view} pending={pending} action="Save access" onSave={() => save('grants', { key: item.id, ...levels })}>
    <h2>{item.title} · {keyState(item)}</h2>
    <p>{keyUseLine(item)}</p>
    {list.map(subject => <LevelChoice key={subject.kind + subject.id} legend={subject.label} levels={item.levels}
      value={levels[subject.kind][subject.id]} onChange={level => setLevels(put(levels, subject, level))} />)}
    {!list.length && <p>No roles or people yet.</p>}
  </Page>
}
