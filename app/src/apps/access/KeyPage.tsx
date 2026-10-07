import { useState } from 'react'
import type { Level, SavedKey } from '../../lib/access'
import type { ViewProps } from './address'
import { LevelChoice } from './LevelChoice'
import { directLine, directName, keyState, keyUseLine } from './levels'
import { FinishStep } from './Notices'
import { Page } from './Page'
import { ProjectStep } from './ProjectStep'
import { differs, each, put, subjects } from './subjects'

/** What a key that is not saved yet waits for. Project code names its own step, the same one a person's page shows.
 *  Setup makes one key itself: on the live app the owner asks their assistant to finish, with the request to copy,
 *  and a manager is told it is the owner's step; no step can finish it on a preview. Any other key comes through its link. */
function NextStep({ status, item }: Pick<ViewProps, 'status'> & { item: SavedKey }) {
  if (item.id === 'code') return <ProjectStep status={status} />
  if (!item.setup) return <p>Ask your assistant for the key link.</p>
  if (status.environment !== 'live') return null
  return status.viewer.owner
    ? <FinishStep plain>Look-ups need a read-only key. Ask your assistant:</FinishStep>
    : <p>Look-ups need a read-only key. {status.ownerEmail} finishes that in Access setup.</p>
}

/** One key: whether it is saved, with its next step when it is not, then its direct-use choice, then its level for
 *  every role and every person with their own set. Direct use sits above the levels because it changes what they
 *  mean: the line under it says what the pick opens and how many people hold a level it reaches, as the page stands.
 *  A changed choice is saved first, then the levels. A key whose service is not set up says so and offers no choice;
 *  one setup makes, and Project code, can never be set up and says only that. */
export function KeyPage({ item, ...props }: ViewProps & { item: SavedKey }) {
  const { status, save } = props
  const list = subjects(status)
  const [levels, setLevels] = useState(() => each<Level | null>(list, ({ set }) => set.keys[item.id] ?? null))
  const [start] = useState(levels)
  const chosen = item.direct?.mode ?? null
  const [mode, setMode] = useState(chosen)
  const reached = status.people.filter(person => person.status === 'active' && (person.role ? levels.roles[person.role] : levels.people[person.email])).length
  return <Page {...props} name={item.title} changed={differs(start, levels) || mode !== chosen} action="Save access"
    onSave={() => save('grants', { key: item.id, ...levels }, undefined, mode === chosen ? undefined : { key: item.id, mode: mode ?? 'off' })}>
    <p className="text-muted-foreground">{keyState(item, status.environment)}</p>
    {!item.saved && <NextStep status={status} item={item} />}
    <p>{keyUseLine(status, item)}</p>
    {item.direct
      ? <LevelChoice legend="Direct use" names={directName} levels={item.direct.offered} value={mode} notes={[directLine(mode, reached)]} onChange={setMode} />
      : <div className="grid gap-1.5"><p className="text-sm">Direct use</p><p className="text-sm text-muted-foreground">{item.setup || item.id === 'code' ? 'Not offered for this key.' : 'Not set up for this key. Ask your assistant to add it.'}</p></div>}
    {list.map(subject => <LevelChoice key={subject.kind + subject.id} legend={subject.label} levels={item.levels}
      value={levels[subject.kind][subject.id]} onChange={level => setLevels(put(levels, subject, level))} />)}
    {!list.length && <p>No roles or people yet.</p>}
  </Page>
}
