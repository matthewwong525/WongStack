import type { Status } from '../../lib/access'
import { appTitle } from '../../lib/apps'
import { gaps, levelLabels, type AccessSet } from './levels'

/** Short strings as small labels under one heading, each with its words written out. With none, `none` says so. */
export function Labels({ title, items, none }: { title: string; items: string[]; none?: string }) {
  if (!items.length) return none ? <p>{none}</p> : null
  return <div className="access-label-row">
    <span className="access-muted">{title}</span>
    <ul className="access-labels" aria-label={title}>{items.map(item => <li key={item}>{item}</li>)}</ul>
  </div>
}

/** What a person or a role has: a label per app and per key level, then a marked line per app that can't do its job yet. */
export function SetLabels({ status, set }: { status: Status; set: AccessSet }) {
  const short = gaps(status, set)
  return <>
    <Labels title="Apps" items={set.apps.map(appTitle)} none="No apps" />
    <Labels title="Keys" items={levelLabels(status, set.keys)} />
    {/* The mark and the words carry the gap: nothing depends on colour. */}
    {short.length > 0 && <ul className="access-gaps" aria-label="Can't do yet">{short.map(line =>
      <li key={line}><span aria-hidden="true">! </span>{line}</li>)}</ul>}
  </>
}
