import { label, when, type Archived } from './api'

/** What reached the chat from a closed review page, by the page's own button names, and when; or that nothing did,
 *  and when it closed. It sits above the read-only page, so long notes scroll in their own box. */
export function AnswerLine({ archived, labels }: { archived: Archived; labels: Record<string, string> }) {
  const named = (action: string) => action === 'send' ? 'Notes sent' : labels[action] ?? label(action)
  return <div className="grid max-h-32 gap-1 overflow-y-auto rounded-md border px-3 py-2" role="status">
    {archived.answers.length === 0 && <p className="text-sm font-semibold">Archived · No answer, {when(archived.endedAt)}</p>}
    {archived.answers.map((answer, index) => <div key={index} className="grid gap-0.5">
      <p className="text-sm font-semibold">Archived · {named(answer.action)}, {when(answer.at)}</p>
      {answer.text && <p className="text-sm whitespace-pre-wrap text-muted-foreground">With notes: “{answer.text}”</p>}
    </div>)}
  </div>
}
