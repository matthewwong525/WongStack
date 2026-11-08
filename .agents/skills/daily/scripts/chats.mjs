// The person's chat list in the Inbox, through the Inbox mini app's chat routes, as the signed-in person. With no app,
// every call throws `unavailable`, so a failed send is never taken as an empty list. wiki/development/daily.md
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { primaryRoot } from '../../memory/scripts/lib/primary-root.mjs';

const BASE = '/apps/inbox/api/';
export class ChatListError extends Error {}

/** The loop's step words; a host name `<STEP>: <task>` starts with one. */
export const STEPS = ['EXPLORE', 'PLAN', 'APPLY', 'SHIP', 'DONE'];
/** A typed loop verb's step; null waits for its skill's `set`, because it can plan or build first. */
export const LOOP_STEPS = { explore: 'EXPLORE', plan: 'PLAN', 'improve-code': 'PLAN', apply: null, continue: null, ship: null };
/** Another typed repo skill's step: its name in capitals minus `wong-`. */
export const skillStep = name => name.replace(/^wong-/, '').toUpperCase();

// This script's own skills folder, `.claude/skills` in an install: the skills step-title.mjs names a chat by.
const SKILLS = fileURLToPath(new URL('../../', import.meta.url));
/** Every step word a host name can start with: the loop's and each other repo skill's. */
export function stepWords(skills = SKILLS) {
  let names = [];
  try {
    names = readdirSync(skills).filter(name => !(name in LOOP_STEPS) && existsSync(join(skills, name, 'SKILL.md')));
  } catch { /* none */ }
  return [...new Set([...STEPS, ...names.map(skillStep)])];
}
let leading = null;
const leadingStep = () => (leading ??= new RegExp(`^(${stepWords().join('|')}):\\s*`));
/** A host name minus a leading step word. */
export const withoutStep = name => String(name ?? '').replace(leadingStep(), '').trim();
/** A host name's step word, or null. */
export const stepOf = name => leadingStep().exec(String(name ?? '').trim())?.[1] ?? null;

/** The Paseo label on a chat a schedule's run opened; its row's source is `schedule:<key>`. */
export const SCHEDULE_LABEL = 'wong-schedule';
export const sourceOf = labels => (labels?.[SCHEDULE_LABEL] ? `schedule:${labels[SCHEDULE_LABEL]}` : null);

/** The person's company client for the checkout holding `cwd`, or null with no app. `load` is for tests. */
export async function chatClient(cwd = process.cwd(), load = () => import('../../../../scripts/company-api.mjs')) {
  try {
    const client = (await load()).companyClient({ root: primaryRoot(cwd).root });
    client.target();
    return client;
  } catch { return null; }
}

/** The chat-list calls over a client promise; each throws a ChatListError on a refusal or with no app.
 *  `put` writes one chat's row, `sync` sends this computer's open chats and drops the rest, `remove` drops one. */
export function chatCalls(client) {
  const call = async (method, route, body) => {
    const company = await client;
    if (!company) throw new ChatListError('unavailable: this install has no company app, or this computer is not signed in to it');
    const init = body === undefined ? { method }
      : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
    const { value, status } = await company.http(BASE + route, init);
    if (status < 200 || status >= 300) throw new ChatListError(`${status}: ${value?.error?.code ?? value?.error ?? 'the app refused the call'}`);
    return value;
  };
  return {
    put: body => call('PUT', 'chat', body),
    sync: body => call('POST', 'chats-sync', body),
    remove: body => call('POST', 'chat-remove', body),
    origin: async () => (await client)?.target() ?? null,
  };
}
