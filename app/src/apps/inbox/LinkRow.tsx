import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { Item } from './api'

type Link = NonNullable<Item['link']>
const WHAT: Record<Link['what'], string> = { key: 'Key', login: 'Login', card: 'Card', form: 'Form', view: 'Live view' }

/** When a link closes, as the person's clock says it. */
const closing = (at: number) => new Date(at).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })

/** A private page waiting on the person: what it is, when it closes, and *Open*. It opens in a new tab that never
 *  learns this page's address, and sends nothing here. */
export function LinkRow({ item, link }: { item: Item; link: Link }) {
  return <Card className="gap-3 p-4">
    <div className="grid gap-1">
      <h3 className="text-base wrap-anywhere">{item.title}</h3>
      <p className="text-sm text-muted-foreground wrap-anywhere">{[WHAT[link.what], `Closes ${closing(item.closesAt)}`, item.workspace].filter(Boolean).join(' · ')}</p>
    </div>
    <a href={link.url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ className: 'justify-self-start' })}>Open</a>
  </Card>
}
