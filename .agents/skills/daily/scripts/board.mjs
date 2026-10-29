// The week board, through the Inbox mini app's daily routes, as the signed-in person. With no app, every call throws
// `unavailable`, so a read is never taken as an empty week. wiki/stack/company-api.md#build-a-skill-on-actions
import { primaryRoot } from '../../memory/scripts/lib/primary-root.mjs';

const BASE = '/apps/inbox/api/';
export class BoardError extends Error {}

/** The person's company client for the checkout holding `cwd`, or null with no app. `load` is for tests. */
export async function boardClient(cwd = process.cwd(), load = () => import('../../../../scripts/company-api.mjs')) {
  try {
    const client = (await load()).companyClient({ root: primaryRoot(cwd).root });
    client.target();
    return client;
  } catch { return null; }
}

/** The board calls over a client promise; each throws a BoardError on a refusal or with no app. */
export function boardCalls(client) {
  const call = async (route, body) => {
    const company = await client;
    if (!company) throw new BoardError('unavailable: this install has no company app, or this computer is not signed in to it');
    const init = body === undefined ? { method: 'GET' }
      : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
    const { value, status } = await company.http(BASE + route, init);
    if (status < 200 || status >= 300) throw new BoardError(`${status}: ${value?.error?.code ?? value?.error ?? 'the board refused the call'}`);
    return value;
  };
  return {
    tasks: week => call(`daily-tasks?week=${encodeURIComponent(week)}`),
    add: body => call('daily-task-add', body),
    place: body => call('daily-task-place', body),
    status: body => call('daily-task-status', body),
    remove: body => call('daily-task-remove', body),
    link: body => call('daily-task-link', body),
    origin: async () => (await client)?.target() ?? null,
  };
}
