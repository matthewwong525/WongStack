// POST /api/direct/<key>/read and /change: one request passed on to a key's own service by its `forward` entry; the
// key's level alone decides. A project wraps each in its action contract: wiki/stack/company-api.md#use-a-key-directly
import { address, forwardProblem } from './key-rules.mjs';
import { boundedBytes } from './errors.mjs';

/** The service's answer is read up to this size; the action's own output limit leaves room to wrap it. */
export const LIMIT = 1_000_000;
const LEVELS = ['read', 'write'];
const KINDS = { read: 'read', write: 'change' };
export const METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'];
export const CONTENT_TYPE = /^[\w.+-]+\/[\w.+-]+(?:; ?charset=[\w-]+)?$/;
/** Each input field's words, for the project's own schema. */
export const FIELDS = {
  method: "The HTTP method the service's API guide names for this request.",
  path: "The API path under the service's address, with no leading slash and no query, such as pages/123.",
  query: 'Optional query string for the path, without the leading question mark, such as page_size=20.',
  body: 'Optional request body: a JSON value, or a string sent as it is. GET and HEAD send none.',
  contentType: 'Optional content type of the body. Left out, the body is sent as application/json.',
};
export const ERRORS = {
  not_allowed: "The path must stay inside this service's own address: no leading slash, no dot parts, no doubled slash, no query and no other host.",
  too_large: 'The answer is too large. Narrow the request: add a filter or ask for a smaller page.',
  bad_answer: 'The service did not return an answer that can be shown.',
};
/** Only a key that trades an ID and a secret for a token can be refused this. */
export const NO_TOKEN = 'The service gave no token for the saved ID and secret. Ask the owner to send this key again.';
export const LIMITS = { inputBytes: 262_144, outputBytes: 4_194_304, timeoutMs: 30_000 };

const refuse = (code, status) => Response.json({ error: { code } }, { status });
/** Tokens an ID and a secret were traded for, by key, kept in this isolate until a minute before they run out. */
const tokens = new Map();
/** A JSON answer as a value; one that does not parse stays the text it is. */
const parse = text => { try { return JSON.parse(text); } catch { return text; } };
const text = async (body, max) => body ? new TextDecoder().decode(await boundedBytes(body, max, () => new Error('Size limit exceeded'))) : '';

/** The input as one request, or the first thing wrong with it. The same shape a project's schema holds it to. */
export function checkInput(value) {
  const fields = ['method', 'path', 'query', 'body', 'contentType'];
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return { problem: 'input: must be an object' };
  const extra = Object.keys(value).find(name => !fields.includes(name));
  if (extra !== undefined) return { problem: `${extra}: is not a field` };
  const { method, path, query, contentType } = value;
  if (!METHODS.includes(method)) return { problem: `method: must be one of ${METHODS.join(', ')}` };
  if (typeof path !== 'string' || path.length < 1 || path.length > 2000) return { problem: 'path: must be 1 to 2000 characters' };
  if (query !== undefined && (typeof query !== 'string' || query.length > 4000)) return { problem: 'query: must be at most 4000 characters' };
  if (contentType !== undefined && (typeof contentType !== 'string' || !CONTENT_TYPE.test(contentType))) return { problem: 'contentType: must be one content type' };
  return { input: value };
}

/** A `METHOD path` look-up entry as a test of one request: `*` stands for one path part. */
const entryTest = entry => new RegExp(`^${entry.split('*').map(part => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]+')}$`);

/** A request only reads when the web's own rules say so, or the key's setup names it as a look-up. */
const looksUp = (forward, method, path) => method === 'GET' || method === 'HEAD' ||
  (forward.lookups ?? []).some(entry => entryTest(entry).test(`${method} ${path}`));

/** One record per request sent: who, which key, what kind, and where. Never the query, the body or the key. */
const record = line => console.log(JSON.stringify({ event: 'direct_request', ...line }));

/** What a token address answers: the standard client-credentials fields alone, or null. */
const traded = value => value && typeof value === 'object' && typeof value.access_token === 'string' && value.access_token !== '' &&
  (value.expires_in === undefined || typeof value.expires_in === 'number') ? value : null;

/** A short token for a key that trades its ID and secret: the one kept, unless `fresh`, or a new one from the token
 *  address. Null when the service gives none. The trade follows no redirect, so the secret goes nowhere else. */
async function tokenFor(id, forward, clientId, secret, send, signal, fresh) {
  const pair = `${clientId}\n${secret}`;
  const held = tokens.get(id);
  if (!fresh && held?.pair === pair && held.until > Date.now()) return held.token;
  tokens.delete(id);
  const response = await send(forward.exchange.url, { method: 'POST', redirect: 'manual', signal,
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: secret }) });
  const answer = traded(response.ok ? parse(await text(response.body, 65_536).catch(() => '')) : null);
  if (!answer) return null;
  const { access_token: token, expires_in: seconds = 0 } = answer;
  tokens.set(id, { pair, token, until: Date.now() + (seconds - 60) * 1000 });
  return token;
}

/** The fixed headers, what answers to accept, the body's type, and the key's own header last, so no fixed header
 *  can replace it. A key with no secret sends no credential. */
const requestHeaders = (forward, secret, contentType) => ({ ...forward.headers, Accept: 'application/json',
  ...(contentType && { 'Content-Type': contentType }), ...(secret !== null && { [forward.header]: `${forward.prefix ?? ''}${secret}` }) });

/** The service's answer as the action returns it, or a refusal when it carries the key itself, its ID or its token,
 *  in its body or in its content type. */
function answered(response, body, hidden) {
  const type = response.headers.get('content-type') ?? '';
  if (hidden.some(value => value !== null && `${type}\n${body}`.includes(value))) return refuse('bad_answer', 502);
  return Response.json({ status: response.status, contentType: type, body: /json/i.test(type) ? parse(body) : body });
}

/** One action's handler: `secret(name)` reads a saved value, `caller` names who asked, for the record. */
const handler = (id, forward, kind, send) => async (given, { secret: read, signal, caller }) => {
  const checked = checkInput(given);
  if (!checked.input) return refuse('invalid_input', 400);
  const { method, path, query, body: value, contentType } = checked.input;
  const body = value === undefined ? undefined : typeof value === 'string' ? value : JSON.stringify(value);
  if (kind === 'read' && !looksUp(forward, method, path)) return refuse('not_a_lookup', 400);
  const url = address(forward, path, query);
  if (!url) return refuse('not_allowed', 400);
  const secret = forward.secret === undefined ? null : String(read(forward.secret));
  const clientId = forward.exchange ? String(read(`${forward.secret}_ID`)) : null;
  // A key that trades for a token sends the token; any other sends its secret as it is.
  const credential = fresh => clientId === null ? secret : tokenFor(id, forward, clientId, secret, send, signal, fresh);
  const sends = body !== undefined && method !== 'GET' && method !== 'HEAD';
  // A redirect comes back unfollowed, so the key is never sent on.
  const ask = sent => send(url, { method, redirect: 'manual', signal,
    headers: requestHeaders(forward, sent, sends ? contentType ?? 'application/json' : null), ...(sends && { body }) });
  let status = 0;
  let response;
  let sent = await credential(false);
  if (clientId !== null && sent === null) return refuse('no_token', 502);
  try {
    response = await ask(sent);
    // A token the service no longer takes is traded again, once.
    if (response.status === 401 && clientId !== null) {
      sent = await credential(true);
      if (sent === null) return refuse('no_token', 502);
      response = await ask(sent);
    }
    status = response.status;
  } finally {
    record({ caller, key: id, kind, method, path, status });
  }
  if (status >= 300 && status < 400) return refuse('bad_answer', 502);
  let answer;
  try { answer = await text(response.body, LIMIT); } catch { return refuse('too_large', 413); }
  return answered(response, answer, [secret, clientId, sent]);
};

/** One action's words and handler. */
function action(id, key, forward, kind, send) {
  const reads = kind === 'read';
  const named = (forward.lookups ?? []).join(', ');
  // A key that offers Read alone has no change action to point at.
  const other = (key.levels ?? LEVELS).includes('write') ? `Anything else needs ${id}.change, which needs Read & write.` : 'This key passes on nothing else.';
  return {
    id, kind, operationId: `${id}.${kind}`, summary: `${reads ? 'Look something up in' : 'Change something in'} ${key.title}`,
    description: `Send one request to ${key.title}'s API at ${forward.base}${forward.secret ? ' with the saved key' : ''}, and return the service's status and answer. ` +
      '`path` is the API path under that address, with no leading slash. ' +
      (reads ? `Only look-ups run here: GET, HEAD${named && `, and ${named}`}. ${other} `
        : `It can change or send things in ${key.title}, so it needs Read & write. Use ${id}.read for a look-up. `) +
      'A status of 400 or more is the service\'s own refusal: read its body.',
    effect: reads ? 'read' : 'external',
    errors: { ...ERRORS, not_a_lookup: `Only look-ups run here. ${other}`, ...(forward.exchange && { no_token: NO_TOKEN }) },
    examples: [reads ? { input: { method: 'GET', path: 'items', query: 'limit=5' }, output: { status: 200, contentType: 'application/json', body: { items: [] } } }
      : { input: { method: 'POST', path: 'items', body: { name: 'Sample' } }, output: { status: 201, contentType: 'application/json', body: { id: 'item-1' } } }],
    limits: LIMITS,
    handler: handler(id, forward, kind, send),
  };
}

/** Each set-up key's look-up action, and its change action at Read & write, keyed by route. Throws, naming the key,
 *  on a bad `forward` entry. `send` is the request; a test replaces it. */
export function forwardActions(registry, send = (...call) => fetch(...call)) {
  const routes = new Map();
  const access = new Map();
  for (const [id, key] of Object.entries(registry)) {
    const { forward } = key;
    if (!forward) continue;
    const wrong = forwardProblem(id, key, forward);
    if (wrong) throw new Error(`${id}: ${wrong}`);
    for (const level of key.levels ?? LEVELS) {
      const route = `POST /api/direct/${id}/${KINDS[level]}`;
      routes.set(route, action(id, key, forward, KINDS[level], send));
      access.set(route, { keys: [id], direct: true });
    }
  }
  return { routes, access };
}
