import { Badge } from '@/components/ui/badge'
import type { Status } from '../../lib/access'
import { appLabels, levelLabels, type AccessSet } from './levels'

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

/** What a role gives, named where a person is opened: a label per app, then one per key with its level. */
export function SetLabels({ status, set }: { status: Status; set: AccessSet }) {
  return <>
    <Labels title="Apps" items={appLabels(status, set.apps)} none="No apps" />
    <Labels title="Keys" items={levelLabels(status, set.keys)} />
  </>
}
