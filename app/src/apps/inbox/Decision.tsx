import type { KeyboardEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { answerable, type Item, type Tap } from './api'
import { cardId, noteId, ownId, type Desk } from './desk'
import { choicesOf, NOTE, pickOf, say } from './drafts'
import { TapLine } from './TapLine'

type Props = { item: Item; desk: Desk }

/** Enter or Escape closes a field; Shift+Enter is a new line, and Enter mid-word in an IME finishes the word. */
const closes = (event: KeyboardEvent) => event.key === 'Escape' || (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing)

/** What a decision's tap said, to copy into the chat: a question's words, or the choice and its note. */
const copyOf = (tap: Tap) => tap.action === 'send' ? tap.text : [say(tap.action), tap.text].filter(Boolean).join('\n')

/** Where a decision came from: its title, unless that only repeats the question, and its workspace. A long line wraps
 *  under the Risky tag, never cut off, so a phone shows all of it. */
function Who({ item, question }: { item: Item; question: string }) {
  return <p className="min-w-0 text-sm text-muted-foreground">
    {item.kind === 'approval' && <Badge variant="outline" className="mr-2 border-destructive align-middle text-destructive">Risky</Badge>}
    <span className="wrap-anywhere">{[item.title !== question && item.title, item.workspace].filter(Boolean).join(' · ')}</span>
  </p>
}

/** The answers as large buttons, one per line, each with its key; a question's last is the person's own words. */
function Choices({ item, desk, question }: Props & { question: string }) {
  const picked = desk.draftOf(item)?.pick
  const labels = [...choicesOf(item).map(choice => choice.label), ...item.kind === 'question' ? ['Your own answer'] : []]
  return <div role="radiogroup" aria-label={question} className="grid gap-2">
    {labels.map((text, n) => <Button key={n} type="button" role="radio" aria-checked={picked === n} variant={picked === n ? 'default' : 'outline'}
      className="h-auto min-h-11 w-full justify-start gap-3 py-2.5 text-left whitespace-normal wrap-anywhere" onClick={() => desk.pick(item, n)}>
      {n < 6 && <span aria-hidden="true" className={`min-w-6 rounded px-1 text-center text-xs font-semibold ${picked === n
        ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground'}`}>{n + 1}</span>}
      <span>{text}</span>
    </Button>)}
  </div>
}

/** The person's own words, once they pick that choice. */
function Own({ item, desk }: Props) {
  return <Textarea id={ownId(item)} aria-label="Your answer" rows={2} value={desk.draftOf(item)?.own ?? ''}
    onChange={event => desk.own(item, event.target.value)}
    onKeyDown={event => { if (closes(event)) { event.preventDefault(); desk.fold(item) } }} />
}

/** A note that goes with the answer, written in a short field the N key also opens. */
function Note({ item, desk }: Props) {
  const note = desk.draftOf(item)?.note ?? ''
  if (desk.noting === item.id) return <Input id={noteId(item)} maxLength={NOTE} aria-label="Note" placeholder="Note for the agent" value={note}
    onChange={event => desk.update(item, { note: event.target.value })}
    onKeyDown={event => { if (closes(event)) { event.preventDefault(); desk.closeNote(item) } }} />
  return <div className="flex items-center gap-2">
    <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{note.trim() && `Note: ${note}`}</span>
    <Button type="button" variant="ghost" size="sm" onClick={() => desk.openNote(item)}>{note.trim() ? 'Edit note' : '+ Add a note'}</Button>
  </div>
}

/** A question or an approval. Picking sends nothing: a picked card folds to its answer until Change opens it again. */
export function Decision({ item, desk, online, said, onTap, onReload }: Props & {
  online: boolean; said?: string; onTap: (tap: Tap) => void; onReload: () => void
}) {
  const question = item.detail?.text ?? item.title
  const draft = desk.draftOf(item)
  const choice = pickOf(item, draft)
  const open = answerable(item.tap)
  const ring = open && desk.current?.id === item.id ? 'ring-2 ring-primary' : ''
  const card = { id: cardId(item), tabIndex: -1, onFocus: () => desk.select(item) }
  if (open && choice && !desk.held(item) && desk.noting !== item.id && !said) {
    return <Card {...card} className={`flex-row items-center gap-3 py-2 pr-2 pl-4 outline-none ${ring}`}>
      <span className="min-w-0 max-w-[55%] truncate font-medium">✓ {choice.label}</span>
      <div className="min-w-0 flex-1"><Who item={item} question={question} /></div>
      <Button type="button" variant="ghost" size="sm" onClick={() => desk.reopen(item)}>Change</Button>
    </Card>
  }
  return <Card {...card} className={`gap-3 p-4 outline-none ${ring}`}>
    <Who item={item} question={question} />
    <h3 className="text-base whitespace-pre-wrap wrap-anywhere">{question}</h3>
    {open && <>
      <Choices item={item} desk={desk} question={question} />
      {draft?.pick === choicesOf(item).length && <Own item={item} desk={desk} />}
      <Note item={item} desk={desk} />
    </>}
    {item.tap && <TapLine tap={item.tap} online={online} copy={`${item.title}: ${copyOf(item.tap)}`} onChange={onTap} onReload={onReload} />}
    {said && <p className="text-sm" role="alert">{said}</p>}
  </Card>
}
