// A small client for the app at `app` in .agents/access/slots.json, signed in through signin/computer.mjs. A project
// with its own helper (WongStack's company-api.mjs) hands its own client, with the same calls.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SLOTS } from './services.mjs';

const LIMIT = 4 * 1024 * 1024;

/** This computer's sign-in headers for the app, or an error that says how to sign in. */
async function signedIn(origin) {
  const { headers, signInHelp } = await import('../../signin/computer.mjs');
  const signed = headers(origin);
  if (!signed) throw new Error(`This computer is not signed in to the app: ${signInHelp(origin)}.`);
  return signed;
}

const readJson = file => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return {}; } };
/** The app's HTTPS origin: `app` in slots.json, else the one a WongStack install records, as its app helper finds it:
 *  the company origin, then the origin memory runs on. Else an error that names what to fill. */
export function appOrigin(root) {
  const installed = readJson(join(root, '.claude', '.wong-stack.json')).components ?? {};
  const memory = URL.canParse(installed.memory?.worker) ? new URL(installed.memory.worker).origin : undefined;
  const app = readJson(join(root, SLOTS)).app ?? installed.companyApi?.origin ?? memory;
  if (typeof app !== 'string' || !URL.canParse(app) || new URL(app).protocol !== 'https:') {
    throw new Error(`Name the app's HTTPS address: add "app" (such as "https://app.example.com") to ${SLOTS}.`);
  }
  return new URL(app).origin;
}

/** `headers(origin)`: this person's sign-in headers; `send`: the request, which a test replaces. */
export function accessClient({ root, headers = signedIn, send = (...call) => fetch(...call) }) {
  const target = () => appOrigin(root);
  /** One request to the app, signed in: `{ value, status }`. `business.check` names the read to run before repeating
   *  a change whose outcome is unknown. */
  async function http(path, init = {}, origin = target(), _token, business) {
    if (!/^\/(?:api\/|apps\/)[^#]*$/.test(path) || path.includes('..') || path.includes('\\')) throw new Error('Refused an arbitrary server URL');
    const signed = await headers(origin);
    let response;
    try {
      response = await send(new URL(path, origin), { ...init, redirect: 'manual', headers: { ...signed, ...init.headers }, signal: AbortSignal.timeout(business ? 60_000 : 20_000) });
    } catch {
      throw new Error(business ? `The app did not answer; the outcome may be unknown. Do not repeat it at once.${business.check ?? ''}` : 'The app could not be reached.');
    }
    if (response.status >= 300 && response.status < 400) throw new Error('The app sent a redirect: sign in again.');
    if (response.status === 401 || response.status === 403) throw new Error('The sign-in expired or access was denied: sign in again.');
    const text = await response.text();
    if (text.length > LIMIT) throw new Error('The app\'s answer is too large.');
    let value;
    try { value = text ? JSON.parse(text) : {}; } catch { throw new Error(`The app did not answer with JSON (HTTP ${response.status}).`); }
    if (Object.values(signed).some(secret => typeof secret === 'string' && secret.length >= 8 && text.includes(secret))) throw new Error('The app\'s answer held sign-in material.');
    if (!response.ok && !value.error) throw new Error(`The app refused the request (HTTP ${response.status}).`);
    return { value, status: response.status };
  }
  /** A key used directly: `<key>.read` or `<key>.change`, sent to its direct route. */
  async function call(id, input) {
    const [, key, kind] = /^([a-z][a-z0-9-]*)\.(read|change)$/.exec(id ?? '') ?? [];
    if (!key) throw new Error(`${id} is not a key's read or change.`);
    const { value } = await http(`/api/direct/${key}/${kind}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) },
      undefined, undefined, kind === 'change' ? { check: ` Look it up with ${key}.read first.` } : undefined);
    return value;
  }
  /** What `record` reads of a key: its name and guide from the services list. */
  async function describe(id) {
    const key = id.split('.')[0];
    const { value } = await http('/api/services?all=1');
    const row = (Array.isArray(value?.services) ? value.services : []).find(service => service.id === key);
    if (!row) throw new Error(`No service named ${key}: run services --all.`);
    return { operationId: id, description: '', keys: [{ id: key, name: row.name, ...(row.docs && { docs: row.docs }) }] };
  }
  return { target, http, call, describe };
}
