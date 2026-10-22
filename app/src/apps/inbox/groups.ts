import type { Item, Status } from './api'

/** Where an agent's card goes: something waits on the person, it is working, or the chief checked its proof. */
export const PLACES = ['Needs you', 'Working', 'Done'] as const
type Place = (typeof PLACES)[number]
/** One agent or chat: its title (empty for a chat with no workspace: its items carry their own), where it stands, and
 *  the items it sent besides its status. */
export type Group = { key: string; title: string; status: Status | null; items: Item[]; place: Place }

const ORDER: Item['kind'][] = ['start', 'question', 'link', 'approval', 'plan']

/** Whether an item waits on the person: any but a status, until its answer reached the chat or it closed unsent. */
const waits = (item: Item) => item.kind !== 'agent' && item.tap?.state !== 'sent' && item.tap?.state !== 'expired'

/** The items as one group per workspace, which every item carries. A chat nothing watches has no status, so it shows
 *  only under Needs you. */
export function groupsOf(items: Item[]): Group[] {
  const by = new Map<string, Item[]>()
  for (const item of items) by.set(item.workspace, [...(by.get(item.workspace) ?? []), item])
  return [...by].map(([key, all]) => {
    const agent = all.find(item => item.kind === 'agent')
    const rest = all.filter(item => item.kind !== 'agent').sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind))
    const status = agent?.status ?? null
    const place: Place = !agent || rest.some(waits) ? 'Needs you' : status?.state === 'done' ? 'Done' : 'Working'
    return { key, title: agent?.title ?? key, status, items: rest, place }
  })
}
