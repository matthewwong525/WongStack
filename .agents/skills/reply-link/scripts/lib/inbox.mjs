// The live app's inbox, reached as the signed-in person through the company helper. Every call answers null on a
// 404, a refused sign-in or a network error, so the caller falls back to the file. wiki/development/reply-links.md

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { primaryRoot } from '../../../memory/scripts/lib/primary-root.mjs';

const BASE = '/apps/inbox/api/';
const COMPANY_API = 'scripts/company-api.mjs';

/** True when the checkout holding `cwd` has a company app, signed in or not: such a project never opens a tunnel for
 * a reply link. Every install ships the helper, so the app is the origin its record names, as the helper reads it. */
export function hasApp(cwd = process.cwd()) {
  try {
    const { root } = primaryRoot(cwd);
    if (!existsSync(join(root, COMPANY_API))) return false;
    const { companyApi, memory } = JSON.parse(readFileSync(join(root, '.claude', '.wong-stack.json'), 'utf8')).components ?? {};
    return Boolean(companyApi?.origin || memory?.worker);
  } catch { return false; }
}

/** The person's company client for the checkout holding `cwd`, or null outside one, or where it has no helper or no
 * connection. `load` is for tests. */
export async function companyFor(cwd = process.cwd(), load = () => import('../../../../../scripts/company-api.mjs')) {
  try {
    const client = (await load()).companyClient({ root: primaryRoot(cwd).root });
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

// A 25 MB file on a slow line takes minutes, not the 20 seconds a call gets.
const UPLOAD_MS = 15 * 60_000;
const sha256Of = bytes => createHash('sha256').update(bytes).digest('hex');

/** Uploads raw `bytes` to `route` with `query`: `{status, value}`, or null when no answer came. A Buffer body sends its
 *  Content-Length, which the app needs to refuse a large one early. */
async function uploadBytes(client, route, query, bytes) {
  try {
    return await client.http(`${BASE}${route}?${new URLSearchParams(query)}`,
      { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: bytes, signal: AbortSignal.timeout(UPLOAD_MS) });
  } catch { return null; }
}

/** Writes an item: `{id, kind, title, workspace, body, actions, version, closesAt}`, and `plain: true` for a page that
 * asks nothing. A page's HTML uploads first and the item names it by hash; an app before that takes it in the item. */
export async function upload(client, item) {
  if (item.kind !== 'plan' || typeof item.body !== 'string' || !item.body) return ask(client, 'item', 'PUT', item);
  const bytes = Buffer.from(item.body, 'utf8');
  const sha256 = sha256Of(bytes);
  const answer = await uploadBytes(client, 'page-body', { id: item.id, sha256 }, bytes);
  if (answer?.status === 404) return ask(client, 'item', 'PUT', item);
  return answer?.status === 200 ? ask(client, 'item', 'PUT', { ...item, body: '', bodySha256: sha256 }) : null;
}

/** Uploads one file for the person's page `id`, raw, before the page names it; `media` for a picture or video the
 *  page shows: `{status, value}`, or null when no answer came. */
const uploadPageFile = (client, id, { name, sha256, bytes, media = false }) =>
  uploadBytes(client, 'page-file', { id, name, sha256, ...(media && { media: '1' }) }, bytes);

/** Each `{name, path}` with its `size` and `sha256`, read one at a time. */
export const hashFiles = list => list.map(({ name, path }) => {
  const bytes = readFileSync(path);
  return { name, path, size: bytes.length, sha256: sha256Of(bytes) };
});

/** Puts page `item`: each of `files` and `media`, hashed by hashFiles, uploads first, then the item names them.
 *  `{value}`, a null value when the put failed, or `{refused: {name, code}}` for the first file the app refused. */
export async function putPage(client, item, { files = [], media = [] } = {}) {
  for (const [list, isMedia] of [[files, false], [media, true]]) {
    for (const file of list) {
      const answer = await uploadPageFile(client, item.id, { name: file.name, sha256: file.sha256, bytes: readFileSync(file.path), media: isMedia });
      if (answer?.status !== 200) return { refused: { name: file.name, code: answer?.value?.error?.code } };
    }
  }
  const named = list => list.map(({ name, size, sha256 }) => ({ name, size, sha256 }));
  return { value: await upload(client, { ...item, ...(files.length && { files: named(files) }), ...(media.length && { media: named(media) }) }) };
}
/** Shares the person's page `id` with the team: `{token}`, the same while it stays shared, or null. */
export const sharePage = (client, id) => ask(client, 'share', 'POST', { id });

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
/** The person's review pages still waiting, whose titles hold the words of `q`: `[{id, title, …}]`, or null. */
export const waitingReviews = async (client, q) => {
  const answer = await inTime(ask(client, `reviews?q=${encodeURIComponent(q)}`, 'GET'));
  return Array.isArray(answer?.waiting) ? answer.waiting : null;
};
/** Collects the taps waiting on `items`, `[{id, item, action, text, version, files}]`, or null. Each one is this
 * computer's to deliver from then on: the app hands it out once, and fails it when no result comes. */
export const checkin = async (client, items) => (await ask(client, 'checkin', 'POST', { items }))?.taps ?? null;
/** A tap's file from the app, part by part: `{name, type, question, size, bytes}`, or null when any part fails. Each
 * part read holds the round's taps in the app a while longer; `held` hears each. */
export async function readFile(client, id, held = () => {}) {
  const parts = [];
  let first = null;
  for (let n = 0; n < (first?.parts ?? 1); n++) {
    const part = await ask(client, `file?id=${encodeURIComponent(id)}&part=${n}`, 'GET');
    if (!part || typeof part.data !== 'string' || !Number.isInteger(part.parts) || part.parts < 1 || part.parts > 100) return null;
    held();
    first ??= part;
    parts.push(Buffer.from(part.data, 'base64'));
  }
  const { name, type, question, size } = first;
  return typeof name === 'string' && typeof question === 'string' && Number.isInteger(size) ? { name, type, question, size, bytes: Buffer.concat(parts) } : null;
}
export const tapResult = (client, id, state) => ask(client, 'tap-result', 'POST', { id, state });

/** The app's live line for this computer, a WebSocket that only ever says look. */
export const openSocket = (client, computer) => client.socket(`${BASE}line?computer=${computer}`);
