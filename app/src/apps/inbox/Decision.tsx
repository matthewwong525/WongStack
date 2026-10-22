import type { KeyboardEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { answerable, type Item, type Tap } from './api'
import { cardId, ownId, type Desk } from './desk'
import { choicesOf, multi, pickOf, say } from './drafts'
import { linkify } from './linkify'
import { TapLine } from './TapLine'

type Props = { item: Item; desk: Desk }

/** Enter or Escape closes a field; Shift+Enter is a new line, and Enter mid-word in an IME finishes the word. */
const closes = (event: KeyboardEvent) => event.key === 'Escape' || (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing)

/** What a decision's tap said, to copy into the chat: the words sent, or the choice and words an older tap carried. */
const copyOf = (tap: Tap) => tap.action === 'send' ? tap.text : [say(tap.action), tap.text].filter(Boolean).join('\n')

/** Where a decision came from: its title, unless that only repeats the question, and its workspace. A long line wraps
 *  under the Risky tag, never cut off, so a phone shows all of it. */
function Who({ item, question }: { item: Item; question: string }) {
  return <p className="min-w-0 text-sm text-muted-foreground">
    {item.kind === 'approval' && <Badge variant="outline" className="mr-2 border-destructive align-middle text-destructive">Risky</Badge>}
    <span className="wrap-anywhere">{[item.title !== question && item.title, item.workspace].filter(Boolean).join(' · ')}</span>
  </p>
}

const ROW = 'h-auto min-h-11 w-full cursor-pointer justify-start gap-3 py-2.5 text-left whitespace-normal wrap-anywhere'
const picks = (event: KeyboardEvent) => event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')

/** A choice's key, for the first six. */
const Key = ({ n, on }: { n: number; on: boolean }) => n < 6 && <span aria-hidden="true"
  className={`min-w-6 rounded px-1 text-center text-xs font-semibold ${on ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground'}`}>{n + 1}</span>

/** The answers as large rows, one per line, each with its key. A row is no button, so a link in its words opens. */
export function Choices({ item, desk, question }: Props & { question: string }) {
  const draft = desk.draftOf(item)
  if (multi(item)) return <div role="group" aria-label={question} className="grid gap-2">
    {choicesOf(item).map(({ label }, n) => {
      const on = draft?.ticks?.includes(n) === true
      return <div key={n} className={buttonVariants({ variant: 'outline', className: ROW })} onClick={() => desk.pick(item, n)}>
        <Key n={n} on={false} /><Checkbox checked={on} aria-label={label} /><span>{linkify(label)}</span>
      </div>
    })}
  </div>
  return <div role="radiogroup" aria-label={question} className="grid gap-2">
    {choicesOf(item).map(({ label }, n) => {
      const on = draft?.pick === n
      return <div key={n} role="radio" aria-checked={on} tabIndex={0} className={buttonVariants({ variant: on ? 'default' : 'outline', className: ROW })}
        onClick={() => desk.pick(item, n)} onKeyDown={event => { if (picks(event)) { event.preventDefault(); desk.pick(item, n) } }}>
        <Key n={n} on={on} /><span>{linkify(label)}</span>
      </div>
    })}
  </div>
}

/** The person's own words, always open: typing picks them, and Enter or Escape folds the card. */
export function Own({ item, desk }: Props) {
  return <Textarea id={ownId(item)} aria-label="Your own answer" placeholder="Or type your own answer" rows={2}
    value={desk.draftOf(item)?.own ?? ''} onChange={event => desk.own(item, event.target.value)}
    onKeyDown={event => { if (closes(event)) { event.preventDefault(); desk.fold(item) } }} />
}

/** A question or an approval. Picking sends nothing: a picked card folds to its answer until Change opens it again. */
export function Decision({ item, desk, online, said, onTap, onReload }: Props & {
  online: boolean; said?: string; onTap: (tap: Tap) => void; onReload: () => void
}) {
  const question = item.detail?.text ?? item.title
  const choice = pickOf(item, desk.draftOf(item))
  const open = answerable(item.tap)
  const ring = open && desk.current?.id === item.id ? 'ring-2 ring-primary' : ''
  const card = { id: cardId(item), tabIndex: -1, onFocus: () => desk.select(item) }
  if (open && choice && !desk.held(item) && !said) {
    return <Card {...card} className={`flex-row items-center gap-3 py-2 pr-2 pl-4 outline-none ${ring}`}>
      <span className="min-w-0 max-w-[55%] truncate font-medium">✓ {choice.label}</span>
      <div className="min-w-0 flex-1"><Who item={item} question={question} /></div>
      <Button type="button" variant="ghost" size="sm" onClick={() => desk.reopen(item)}>Change</Button>
    </Card>
  }
  return <Card {...card} className={`gap-3 p-4 outline-none ${ring}`}>
    <Who item={item} question={question} />
    <h3 className="text-base whitespace-pre-wrap wrap-anywhere">{linkify(question)}</h3>
    {open && <><Choices item={item} desk={desk} question={question} /><Own item={item} desk={desk} /></>}
    {item.tap && <TapLine tap={item.tap} online={online} copy={`${item.title}: ${copyOf(item.tap)}`} onChange={onTap} onReload={onReload} />}
    {said && <p className="text-sm" role="alert">{said}</p>}
  </Card>
}
