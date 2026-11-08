// The person's open chats on this computer, sent to the Inbox's chat list each watch pass, and `/close` for a chat the
// person closed there. On doubt it sends nothing and tries again next pass. wiki/development/daily.md#your-chat-list
import { basename, join } from 'node:path';
import { sourceOf, stepOf, withoutStep } from './chats.mjs';

// A chat the person closed gets `/close` this long after their last word there; 3 tries a close.
const QUIET_MS = 15 * 60e3;
const CLOSE_TRIES = 3;
const MAX_CHATS = 200;

export const closesFile = stateDir => join(stateDir, 'closes.json');

const live = agent => agent && agent.status !== 'closed' && !agent.archivedAt;
const working = agent => agent.status === 'running' || agent.status === 'initializing';
const oneLine = value => String(value).split('\n')[0].slice(0, 200);
const folderName = cwd => basename(String(cwd ?? '').replace(/\/+$/, ''));

/** Each open chat to send: the watched ones, the top-level ones in this repo, and `ignore`'s there; never
 *  `self`. `ownRepo` takes a chat's folder. A name `<STEP>: <task>` goes as its task and step. */
export function openChats({ rows, list, known = {}, ignore = [], self = null, ownRepo = () => true }) {
  const ids = new Set([...rows.map(row => row.agentId), ...Object.keys(known).filter(id => known[id]?.parent === null)]);
  const mine = agent => ids.has(agent.id) || (ignore.includes(agent.id) && ownRepo(agent.cwd));
  return list.filter(agent => live(agent) && agent.id !== self && mine(agent)).slice(0, MAX_CHATS).map(agent => {
    const row = rows.find(each => each.agentId === agent.id);
    const name = String(agent.name ?? row?.title ?? row?.workspace ?? agent.id).replace(/\s+/g, ' ').trim();
    const folder = folderName(agent.cwd ?? row?.cwd) || row?.workspace || 'chat';
    return { agentId: agent.id, name: withoutStep(name).slice(0, 200) || 'Chat', step: stepOf(name), folder: folder.slice(0, 100),
      source: sourceOf(agent.labels) };
  });
}

// Sends the list once; it throws when the app does not take it. Each chat the answer says the person closed gets
// `/close` once a close ask, when it is idle and they have been quiet there 15 minutes.
export async function keepChats({ stateDir, chats, sync, computer, list, send, typedAt = () => null, line = () => {},
  now = new Date(), read, write }) {
  const answer = await sync({ computer, chats });
  if (!Array.isArray(answer?.chats)) throw new Error('The app gave no chat list.');
  const sent = each => each?.closeAskedAt != null && chats.some(chat => chat.agentId === each.agentId);
  const asked = new Map(answer.chats.filter(sent).map(each => [each.agentId, String(each.closeAskedAt)]));
  const before = read(closesFile(stateDir));
  const kept = Object.fromEntries([...asked].map(([agentId, askedAt]) =>
    [agentId, before[agentId]?.askedAt === askedAt ? before[agentId] : { askedAt, tries: 0 }]));
  for (const [agentId, entry] of Object.entries(kept)) {
    const agent = list.find(each => each.id === agentId);
    if (entry.ended || working(agent) || now - (Date.parse(typedAt(agentId) ?? 0) || 0) < QUIET_MS) continue;
    const title = chats.find(chat => chat.agentId === agentId).name;
    try {
      await send(agentId);
      Object.assign(entry, { ended: 'sent' });
      line({ event: 'close', agent: agentId, title });
    } catch (error) {
      entry.tries += 1;
      if (entry.tries < CLOSE_TRIES) continue;
      entry.ended = 'failed';
      line({ event: 'not-closed', agent: agentId, title, error: oneLine(error.message) });
    }
  }
  write(closesFile(stateDir), kept);
}
