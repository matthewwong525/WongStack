// The live app's inbox, reached as the signed-in person through the company helper. Every call answers null on a
// 404, a refused sign-in or a network error, so the caller falls back to the tunnel. wiki/development/reply-links.md

const BASE = '/apps/inbox/api/';

/** The person's company client, or null where this copy has no helper or no connection. `load` is for tests. */
export async function companyFor(load = () => import('../../../../../scripts/company-api.mjs')) {
  try {
    const client = (await load()).companyClient();
    client.target();
    return client;
  } catch { return null; }
}

/** One call's answer, or null when it was not a success. */
async function ask(client, route, method, body) {
  try {
    const { value, status } = await client.http(BASE + route, body ? { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { method });
    return status >= 200 && status < 300 ? value : null;
  } catch { return null; }
}

/** The app's origin when its inbox answers this person, else null. */
export async function probe(client) {
  return (await ask(client, 'items', 'GET')) ? client.target() : null;
}

/** Writes an item: `{id, kind, title, workspace, body, actions, version, closesAt}`. */
export const upload = (client, item) => ask(client, 'item', 'PUT', item);

// A private link opens whether or not the app answers: a listing, or its close, waits at most this long.
const LINK_WAIT_MS = 3_000;
/** `call`'s answer, or null once LINK_WAIT_MS passes first. */
export function inTime(call) {
  let timer;
  return Promise.race([call, new Promise(done => { timer = setTimeout(done, LINK_WAIT_MS, null); })]).finally(() => clearTimeout(timer));
}

/** Lists a private link by its address alone, never what the person types into it; null when that failed. */
export const listLink = (client, { id, what, title, url, closesAt, workspace }) => inTime(upload(client,
  { id, kind: 'link', title, workspace, body: JSON.stringify({ what, url }), actions: [], version: 'link', closesAt }));
export const closeItem = (client, id) => inTime(ask(client, 'item-close', 'POST', { id }));
/** Collects the taps waiting on `items`, `[{id, item, action, text, version}]`, or null. Each one is this computer's
 * to deliver from then on: the app hands it out once, and fails it when no result comes. */
export const checkin = async (client, items) => (await ask(client, 'checkin', 'POST', { items }))?.taps ?? null;
export const tapResult = (client, id, state) => ask(client, 'tap-result', 'POST', { id, state });
