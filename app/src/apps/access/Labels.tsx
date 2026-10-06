import { Badge } from '@/components/ui/badge'
import type { Status } from '../../lib/access'
import { appTitle } from '../../lib/apps'
import { count, gaps, levelLabels, summary, type AccessSet } from './levels'

type Named = { title: string; items: string[]; none?: string }

/** Short strings as small labels, each with its words written out and a border round it, so a label is never marked
 *  by colour alone. The row wraps and a long label breaks. With none, `none` says so. */
function Names({ title, items, none }: Named) {
  if (!items.length) return none ? <p>{none}</p> : null
  return <ul className="flex min-w-0 flex-wrap gap-1.5" aria-label={title}>{items.map(item =>
    <li className="min-w-0" key={item}><Badge variant="outline" className="max-w-full shrink rounded-xl text-left whitespace-normal wrap-anywhere">{item}</Badge></li>)}</ul>
}

/** The labels under a heading of their own. */
export function Labels(props: Named) {
  if (!props.items.length) return <Names {...props} />
  return <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5"><span className="text-muted-foreground">{props.title}</span><Names {...props} /></div>
}

/** A marked line per app of a set that can't do its job yet. The mark, the bold words and the bar carry the gap: nothing depends on colour. */
function Gaps({ status, set }: { status: Status; set: AccessSet }) {
  const short = gaps(status, set)
  return short.length > 0 && <ul className="grid gap-1" aria-label="Can't do yet">{short.map(line =>
    <li className="border-s-[0.2rem] border-primary ps-2.5 font-semibold wrap-anywhere" key={line}><span aria-hidden="true">! </span>{line}</li>)}</ul>
}

/** What a person or a role has, on one line of a list: how many apps and keys, then how many of those apps can't
 *  do their job yet. The "!" and the bold words carry the gap: nothing depends on colour. Opened, the names show. */
export function Summary({ status, set }: { status: Status; set: AccessSet }) {
  const { line, gaps } = summary(status, set)
  return <>{line}{gaps > 0 && <> <strong className="font-semibold"><span aria-hidden="true">! </span>{count(gaps, 'gap')}</strong></>}</>
}

/** What a role gives, named where a person is opened: a label per app and per key level, then the gaps. */
export function SetLabels({ status, set }: { status: Status; set: AccessSet }) {
  return <>
    <Labels title="Apps" items={set.apps.map(appTitle)} none="No apps" />
    <Labels title="Keys" items={levelLabels(status, set.keys)} />
    <Gaps status={status} set={set} />
  </>
}
