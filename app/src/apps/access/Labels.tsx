import type { Status } from '../../lib/access'
import { appTitle } from '../../lib/apps'
import { gaps, levelLabels, type AccessSet } from './levels'

type Named = { title: string; items: string[]; none?: string }

/** Short strings as small labels, each with its words written out: what fills a cell whose column names them. With none, `none` says so. */
export function Names({ title, items, none }: Named) {
  if (!items.length) return none ? <p>{none}</p> : null
  return <ul className="access-labels" aria-label={title}>{items.map(item => <li key={item}>{item}</li>)}</ul>
}

/** The same labels under a heading of their own, where no column names them. */
export function Labels(props: Named) {
  if (!props.items.length) return <Names {...props} />
  return <div className="access-label-row"><span className="access-muted">{props.title}</span><Names {...props} /></div>
}

/** A marked line per app of a set that can't do its job yet. The mark and the words carry the gap: nothing depends on colour. */
export function Gaps({ status, set }: { status: Status; set: AccessSet }) {
  const short = gaps(status, set)
  return short.length > 0 && <ul className="access-gaps" aria-label="Can't do yet">{short.map(line =>
    <li key={line}><span aria-hidden="true">! </span>{line}</li>)}</ul>
}

/** What a person or a role has: a label per app and per key level, then the gaps. */
export function SetLabels({ status, set }: { status: Status; set: AccessSet }) {
  return <>
    <Labels title="Apps" items={set.apps.map(appTitle)} none="No apps" />
    <Labels title="Keys" items={levelLabels(status, set.keys)} />
    <Gaps status={status} set={set} />
  </>
}
