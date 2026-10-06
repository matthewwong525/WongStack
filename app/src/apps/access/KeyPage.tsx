import { useState } from 'react'
import type { Level, SavedKey } from '../../lib/access'
import type { ViewProps } from './address'
import { LevelChoice } from './LevelChoice'
import { keyState, keyUseLine } from './levels'
import { FinishStep } from './Notices'
import { Page } from './Page'
import { differs, each, put, subjects } from './subjects'

/** What a key that is not saved yet waits for. Setup makes one key itself: on the live app the owner asks their
 *  assistant to finish, with the request to copy, and a manager is told it is the owner's step; no step can finish
 *  it on a preview. Any other key comes through its link. */
function NextStep({ status, item }: Pick<ViewProps, 'status'> & { item: SavedKey }) {
  if (!item.setup) return <p>Ask your assistant for the key link.</p>
  if (status.environment !== 'live') return null
  return status.viewer.owner
    ? <FinishStep plain>Look-ups need a read-only key. Ask your assistant:</FinishStep>
    : <p>Look-ups need a read-only key. {status.ownerEmail} finishes that in Access setup.</p>
}

/** One key: whether it is saved, with its next step when it is not, then its level for every role and every person
 *  with their own set, in one save. */
export function KeyPage({ item, ...props }: ViewProps & { item: SavedKey }) {
  const { status, save } = props
  const list = subjects(status)
  const [levels, setLevels] = useState(() => each<Level | null>(list, ({ set }) => set.keys[item.id] ?? null))
  const [start] = useState(levels)
  return <Page {...props} name={item.title} changed={differs(start, levels)} action="Save access" onSave={() => save('grants', { key: item.id, ...levels })}>
    <p className="text-muted-foreground">{keyState(item, status.environment)}</p>
    {!item.saved && <NextStep status={status} item={item} />}
    <p>{keyUseLine(status, item)}</p>
    {list.map(subject => <LevelChoice key={subject.kind + subject.id} legend={subject.label} levels={item.levels}
      value={levels[subject.kind][subject.id]} onChange={level => setLevels(put(levels, subject, level))} />)}
    {!list.length && <p>No roles or people yet.</p>}
  </Page>
}
