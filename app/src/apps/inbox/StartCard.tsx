import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { answerable, type Item, type MorningPlan, type Tap } from './api'
import { Choices, Own } from './Decision'
import { cardId, ownId, type Desk } from './desk'
import { questionsOf } from './drafts'
import { linkify } from './linkify'
import { TapLine } from './TapLine'

const PARTS: [keyof Omit<MorningPlan, 'questions'>, string][] = [['willDo', 'Will do'], ['needs', 'Needs from you'], ['askFirst', 'Asks before']]
const WAITING = { planning: 'Still planning. Go lets it work from its own plan.', 'no-plan': 'No plan came. Go lets it work from its brief.' }

/** What the plan says, part by part, as text. */
function Parts({ plan }: { plan: MorningPlan }) {
  return PARTS.map(([part, title]) => plan[part].length > 0 && <div key={part} className="grid gap-1">
    <p className="text-sm text-muted-foreground">{title}</p>
    <ul className="grid list-disc gap-1 pl-5">{plan[part].map((line, n) => <li key={n} className="wrap-anywhere">{linkify(line)}</li>)}</ul>
  </div>)
}

// The pick is filled like a picked answer: the toggle's own shading is too faint to read at a glance.
const PICKED = 'px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground'

/** Go or Not today, as one pair of toggles. */
function GoToggle({ item, desk, go }: { item: Item; desk: Desk; go: boolean }) {
  return <ToggleGroup type="single" variant="outline" aria-label={`Start ${item.title} today?`} value={go ? 'go' : 'skip'}
    onValueChange={value => { if (value) desk.pick(item, value === 'go' ? 0 : 1) }}>
    <ToggleGroupItem value="go" className={PICKED}>Go</ToggleGroupItem>
    <ToggleGroupItem value="skip" className={PICKED}>Not today</ToggleGroupItem>
  </ToggleGroup>
}

/** The plan's words on Go, what Not today means, or why there is no plan. */
function Body({ item, go }: { item: Item; go: boolean }) {
  const plan = item.start?.state === 'ready' ? item.start.plan : undefined
  if (!go) return <p className="text-sm text-muted-foreground">It stops today and comes back another day.</p>
  if (plan) return <Parts plan={plan} />
  return <p className="text-sm text-muted-foreground">{WAITING[item.start?.state === 'planning' ? 'planning' : 'no-plan']}</p>
}

/** The plan's questions, each answered by the decision parts. */
function Questions({ item, desk }: { item: Item; desk: Desk }) {
  return questionsOf(item).map(question => <div key={question.id} id={cardId(question)} tabIndex={-1} className="grid gap-2 outline-none">
    <p className="font-medium whitespace-pre-wrap wrap-anywhere">{linkify(question.title)}</p>
    <Choices item={question} desk={desk} question={question.title} />
    <Own item={question} desk={desk} />
  </div>)
}

/** An agent's morning plan: Go or Not today, starting on Go, its questions, and a note. Nothing goes until Send. */
export function StartCard({ item, desk, online, said, onTap, onReload }: {
  item: Item; desk: Desk; online: boolean; said?: string; onTap: (tap: Tap) => void; onReload: () => void
}) {
  const draft = desk.draftOf(item)
  const open = answerable(item.tap)
  // Send clears the draft, so a sent card reads its choice from its tap.
  const go = open ? draft?.pick !== 1 : item.tap?.action !== 'skip'
  const ring = open && desk.current?.id === item.id ? 'ring-2 ring-primary' : ''
  const copy = `${item.title}: ${item.tap?.action === 'skip' ? 'Not today' : 'Go'}${item.tap?.text ? `\n${item.tap.text}` : ''}`
  return <Card id={cardId(item)} tabIndex={-1} onFocus={() => desk.select(item)} className={`gap-3 p-4 outline-none ${ring}`}>
    {open && <GoToggle item={item} desk={desk} go={go} />}
    <Body item={item} go={go} />
    {go && open && <Questions item={item} desk={desk} />}
    {open && <Textarea id={ownId(item)} aria-label="A note for this agent" placeholder="A note for this agent" rows={2} value={draft?.own ?? ''}
      onChange={event => desk.note(item, event.target.value)} />}
    {item.tap && <TapLine tap={item.tap} online={online} copy={copy} onChange={onTap} onReload={onReload} />}
    {said && <p className="text-sm" role="alert">{said}</p>}
  </Card>
}
