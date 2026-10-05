import { useState } from 'react'
import { appTitle } from '../../lib/apps'
import type { ViewProps } from './address'
import { Tick } from './Fields'
import { LevelChoice } from './LevelChoice'
import { appUses, capital, fill, usesLine } from './levels'
import { Page } from './Page'
import { differs, each, put, subjects } from './subjects'

/** One app: a tick per role and per person with their own set, and beside each tick the levels of the keys the app uses. */
export function AppAccessPage({ app, ...props }: ViewProps & { app: string }) {
  const { status, save } = props
  const list = subjects(status)
  const keys = appUses(status, app).map(use => use.key)
  const [rows, setRows] = useState(() => each(list, ({ set }) => ({ on: set.apps.includes(app), keys: fill(keys, set.keys, null) })))
  const [start] = useState(rows)
  const row = ({ kind, id }: (typeof list)[number]) => rows[kind][id]
  return <Page {...props} name={appTitle(app)} changed={differs(start, rows)} action="Save access"
    onSave={() => save('grants', { app, ...each(list, subject => row(subject).on), keys: each(list.filter(subject => row(subject).on), subject => row(subject).keys) })}>
    <h2>{appTitle(app)}</h2>
    <p>{capital(usesLine(status, app))}</p>
    {list.map(subject => <div role="group" aria-label={subject.label} className="grid min-w-0 gap-2" key={subject.kind + subject.id}>
      {/* Ticking gives Read on each of the app's keys still at None, never Read & write. */}
      <Tick checked={row(subject).on} onChange={on => setRows(put(rows, subject, { on, keys: fill(keys, row(subject).keys, on ? 'read' : null) }))}>{subject.label}</Tick>
      {row(subject).on && keys.map(key => <LevelChoice key={key.id} legend={key.title} levels={key.levels} value={row(subject).keys[key.id]}
        onChange={level => setRows(put(rows, subject, { on: true, keys: { ...row(subject).keys, [key.id]: level } }))} />)}
    </div>)}
    {!list.length && <p>No roles or people yet.</p>}
    <p>A level holds in every app.</p>
  </Page>
}
