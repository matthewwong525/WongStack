import { useState } from 'react'
import type { Area, Level } from '../../lib/access'
import type { ViewProps } from './address'
import { Tick } from './Fields'
import { LevelChoice } from './LevelChoice'
import { appUses, capital, dots, fill, reachName, usesLine } from './levels'
import { Page } from './Page'
import { differs, each, put, subjects } from './subjects'

const AREA_LEVELS: Level[] = ['read', 'write']

/** One area, an app or one with no screen: a tick per role and per person with their own set, and beside each tick
 *  the area's level, then the levels of the keys it uses. A tick starts at Look up. */
export function AppAccessPage({ area, ...props }: ViewProps & { area: Area }) {
  const { status, save } = props
  const list = subjects(status)
  const keys = appUses(status, area.id).map(use => use.key)
  const [rows, setRows] = useState(() => each<{ level: Level | null; keys: ReturnType<typeof fill> }>(list, ({ set }) => ({ level: set.apps[area.id] ?? null, keys: fill(keys, set.keys, null) })))
  const [start] = useState(rows)
  const row = ({ kind, id }: (typeof list)[number]) => rows[kind][id]
  // Giving the area gives Read on each of its keys still at None, never Read & write; taking it away leaves every key as it is.
  const given = (subject: (typeof list)[number], level: Level | null) =>
    setRows(put(rows, subject, { level, keys: fill(keys, row(subject).keys, level && !row(subject).level ? 'read' : null) }))
  return <Page {...props} name={area.title} changed={differs(start, rows)} action="Save access"
    onSave={() => save('grants', { app: area.id, ...each(list, subject => row(subject).level), keys: each(list.filter(subject => row(subject).level), subject => row(subject).keys) })}>
    <p className="text-muted-foreground">{dots(!area.screen && 'No screen', capital(usesLine(status, area.id)))}</p>
    {list.map(subject => <div role="group" aria-label={subject.label} className="grid min-w-0 gap-2" key={subject.kind + subject.id}>
      <Tick checked={!!row(subject).level} onChange={on => given(subject, on ? 'read' : null)}>{subject.label}</Tick>
      {row(subject).level && <LevelChoice legend={area.title} names={reachName} levels={AREA_LEVELS} value={row(subject).level} onChange={level => given(subject, level)} />}
      {row(subject).level && keys.map(key => <LevelChoice key={key.id} legend={key.title} levels={key.levels} value={row(subject).keys[key.id]}
        onChange={level => setRows(put(rows, subject, { ...row(subject), keys: { ...row(subject).keys, [key.id]: level } }))} />)}
    </div>)}
    {!list.length && <p>No roles or people yet.</p>}
    <p>A level holds in every app.</p>
  </Page>
}
