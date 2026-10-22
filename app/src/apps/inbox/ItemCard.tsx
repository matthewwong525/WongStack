import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { answerable, label, type Item, type Tap } from './api'
import { TapLine } from './TapLine'

export type Answer = (item: Item, action: string, text: string) => void

function Choices({ item, onAnswer }: { item: Item; onAnswer: Answer }) {
  return <div className="flex flex-wrap gap-2">
    {item.actions.map((action, index) => <Button key={action} type="button" variant={index === 0 ? 'default' : 'ghost'}
      onClick={() => onAnswer(item, action, '')}>{label(action)}</Button>)}
  </div>
}

/** A question's options, the first one recommended, then words of the person's own. */
function Reply({ item, onAnswer }: { item: Item; onAnswer: Answer }) {
  const [text, setText] = useState('')
  const field = `inbox-answer-${item.id}`
  return <form className="grid gap-2" onSubmit={event => { event.preventDefault(); onAnswer(item, 'send', text) }}>
    <div className="flex flex-wrap gap-2">
      {item.detail!.options?.map((option, index) => <Button key={option} type="button" variant={index === 0 ? 'default' : 'outline'}
        className="h-auto whitespace-normal wrap-anywhere" onClick={() => onAnswer(item, 'send', option)}>{option}</Button>)}
    </div>
    <Label htmlFor={field}>Your answer</Label>
    <Textarea id={field} value={text} onChange={event => setText(event.target.value)} rows={2} />
    <Button type="submit" variant="outline" className="justify-self-start" disabled={!text.trim()}>Send</Button>
  </form>
}

/** One thing waiting on the person: what it is, where it came from, how to answer, and where the answer stands. */
export function ItemCard({ item, online, note, onAnswer, onTap, onReload }: {
  item: Item; online: boolean; note?: string; onAnswer: Answer; onTap: (tap: Tap) => void; onReload: () => void
}) {
  const { tap } = item
  const open = answerable(tap)
  // A changed plan says so inside the plan: here, Open plan already opens the new one.
  const line = tap && !(item.kind === 'plan' && tap.state === 'changed') ? tap : null
  return <Card className="gap-3 p-4">
    <div className="grid gap-1">
      <h3 className="text-base wrap-anywhere">{item.title}</h3>
      <p className="text-sm text-muted-foreground wrap-anywhere">{item.workspace}</p>
    </div>
    {item.detail && <p className="whitespace-pre-wrap wrap-anywhere">{item.detail.text}</p>}
    {item.kind === 'plan' && <Button asChild className="justify-self-start"><Link to={`?item=${item.id}`}>Open plan</Link></Button>}
    {open && item.kind === 'approval' && <Choices item={item} onAnswer={onAnswer} />}
    {open && item.kind === 'question' && <Reply item={item} onAnswer={onAnswer} />}
    {line && <TapLine tap={line} online={online} copy={`${item.title}: ${line.text || label(line.action)}`} onChange={onTap} onReload={onReload} />}
    {note && <p className="text-sm" role="alert">{note}</p>}
  </Card>
}
