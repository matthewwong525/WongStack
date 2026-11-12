import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { checkInput, forwardActions } from './forward.mjs';

// A made-up registry. Notion offers both levels and names two searches it sends as POST; Ledger offers Read alone and
// sends its key bare in a header of its own; Shop trades an ID and a secret for a token; Stripe is not used directly.
const registry = {
  notion: { title: 'Notion', purpose: 'Notion work', docs: 'https://developers.notion.example/', secrets: ['NOTION_TOKEN'], forward: { base: 'https://api.notion.example/v1/', secret: 'NOTION_TOKEN',
    header: 'Authorization', prefix: 'Bearer ', headers: { 'Notion-Version': '2022-06-28' }, lookups: ['POST search', 'POST databases/*/query'] } },
  ledger: { title: 'Ledger', purpose: 'Ledger work', secrets: ['LEDGER_ID', 'LEDGER_KEY'], levels: ['read'], forward: { base: 'https://ledger.example/', secret: 'LEDGER_KEY', header: 'X-Api-Key' } },
  shop: { title: 'Shop', purpose: 'Store orders', secrets: ['SHOP', 'SHOP_ID'], levels: ['read'], forward: { base: 'https://shop.example/admin/', secret: 'SHOP',
    header: 'X-Shop-Token', prefix: '', exchange: { url: 'https://shop.example/admin/oauth/access_token' } } },
  stripe: { title: 'Stripe', purpose: 'Stripe work', secrets: ['STRIPE_SECRET_KEY'] },
};
const saved = { NOTION_TOKEN: 'notion-token-value', LEDGER_KEY: 'ledger-key-value', SHOP: 'shop-secret', SHOP_ID: 'shop-client' };
let answer;
let send;
let log;
const ask = (key, kind, input) => forwardActions(registry, send).routes.get(`POST /api/direct/${key}/${kind}`)
  .handler(input, { secret: name => saved[name], signal: new AbortController().signal, caller: 'owner@example.com' });
const code = async response => [response.status, (await response.json()).error.code];
const sent = () => { const [url, init] = send.mock.calls.at(-1); return { url: String(url), init }; };

beforeEach(() => {
  answer = () => Response.json({ results: [] });
  send = vi.fn(async url => String(url).endsWith('oauth/access_token') ? Response.json({ access_token: 'token-1', expires_in: 3600 }) : answer());
  log = vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); });

test('builds a look-up action per key set up, a change action where it offers Read & write, each mapped to its key', () => {
  const { routes, access } = forwardActions(registry, send);
  expect([...access]).toEqual([
    ['POST /api/direct/notion/read', { keys: ['notion'], direct: true }], ['POST /api/direct/notion/change', { keys: ['notion'], direct: true }],
    ['POST /api/direct/ledger/read', { keys: ['ledger'], direct: true }], ['POST /api/direct/shop/read', { keys: ['shop'], direct: true }]]);
  const notion = routes.get('POST /api/direct/notion/read');
  expect([notion.operationId, notion.effect, routes.get('POST /api/direct/notion/change').effect]).toEqual(['notion.read', 'read', 'external']);
  expect(notion.description).toContain('GET, HEAD, and POST search, POST databases/*/query. Anything else needs notion.change, which needs Read & write.');
  expect(routes.get('POST /api/direct/ledger/read').description).toContain('GET, HEAD. This key passes on nothing else.');
  expect(Object.keys(notion.errors).sort()).toEqual(['bad_answer', 'not_a_lookup', 'not_allowed', 'too_large']);
  expect('no_token' in routes.get('POST /api/direct/shop/read').errors).toBe(true);
  expect(() => forwardActions({ bad: { ...registry.notion, forward: { ...registry.notion.forward, base: 'http://x.example/' } } })).toThrow('bad: base must be an HTTPS address ending in /');
});

test('passes a look-up on with the key added, and a change with its body; refuses what is not a look-up at Read', async () => {
  const looked = await ask('notion', 'read', { method: 'GET', path: 'pages/abc', query: 'page_size=5' });
  expect(await looked.json()).toEqual({ status: 200, contentType: 'application/json', body: { results: [] } });
  expect(sent().url).toBe('https://api.notion.example/v1/pages/abc?page_size=5');
  expect(sent().init.headers).toEqual({ 'Notion-Version': '2022-06-28', Accept: 'application/json', Authorization: 'Bearer notion-token-value' });
  expect([sent().init.method, sent().init.redirect, sent().init.body]).toEqual(['GET', 'manual', undefined]);
  expect((await ask('notion', 'read', { method: 'POST', path: 'databases/db-1/query', body: { q: 1 } })).status).toBe(200);
  expect(sent().init.body).toBe('{"q":1}');
  expect(await code(await ask('notion', 'read', { method: 'POST', path: 'databases/a/b/query' }))).toEqual([400, 'not_a_lookup']);
  expect((await ask('notion', 'change', { method: 'PATCH', path: 'pages/abc', body: 'title=x', contentType: 'text/plain' })).status).toBe(200);
  expect([sent().init.body, sent().init.headers['Content-Type']]).toEqual(['title=x', 'text/plain']);
  expect((await ask('ledger', 'read', { method: 'GET', path: 'accounts' })).status).toBe(200);
  expect(sent().init.headers).toEqual({ Accept: 'application/json', 'X-Api-Key': 'ledger-key-value' });
});

test('refuses a path off the address and an input it does not take, before any request leaves', async () => {
  for (const path of ['/pages', '//evil.example/x', '../v2', 'pages?x=1']) expect(await code(await ask('notion', 'change', { method: 'GET', path }))).toEqual([400, 'not_allowed']);
  for (const input of [null, [], { method: 'GET', path: '' }, { method: 'TRACE', path: 'x' }, { method: 'GET', path: 'x', query: 1 },
    { method: 'GET', path: 'x', contentType: 'text/plain\r\nX: 1' }, { method: 'GET', path: 'x', headers: {} }]) {
    expect(await code(await ask('notion', 'change', input)), JSON.stringify(input)).toEqual([400, 'invalid_input']);
  }
  expect(checkInput({ method: 'GET', path: 'x', headers: {} })).toEqual({ problem: 'headers: is not a field' });
  expect(send).not.toHaveBeenCalled();
  expect(log).not.toHaveBeenCalled();
});

test('follows no redirect, bounds the answer, and returns none that carries the key', async () => {
  answer = () => new Response(null, { status: 302, headers: { Location: 'https://elsewhere.example/' } });
  expect(await code(await ask('notion', 'read', { method: 'GET', path: 'pages' }))).toEqual([502, 'bad_answer']);
  answer = () => new Response('x'.repeat(1_000_001));
  expect(await code(await ask('notion', 'read', { method: 'GET', path: 'pages' }))).toEqual([413, 'too_large']);
  answer = () => new Response('ok', { headers: { 'content-type': 'text/plain; note=notion-token-value' } });
  expect(await code(await ask('notion', 'read', { method: 'GET', path: 'pages' }))).toEqual([502, 'bad_answer']);
  answer = () => new Response('<html>', { status: 500, headers: { 'content-type': 'application/json' } });
  expect(await (await ask('notion', 'read', { method: 'GET', path: 'pages' })).json()).toEqual({ status: 500, contentType: 'application/json', body: '<html>' });
  answer = () => new Response(null, { status: 204 });
  expect(await (await ask('notion', 'change', { method: 'DELETE', path: 'pages/a' })).json()).toEqual({ status: 204, contentType: '', body: '' });
});

test('records each request with who, which key, what kind and where, and never the query, the body or the key', async () => {
  await ask('notion', 'change', { method: 'POST', path: 'pages', query: 'private=1', body: { title: 'Private title' } });
  send.mockImplementationOnce(async () => { throw new Error('unreachable'); });
  await expect(ask('notion', 'read', { method: 'GET', path: 'pages' })).rejects.toThrow('unreachable');
  expect(log.mock.calls.map(([line]) => JSON.parse(line))).toEqual([
    { event: 'direct_request', caller: 'owner@example.com', key: 'notion', kind: 'change', method: 'POST', path: 'pages', status: 200 },
    { event: 'direct_request', caller: 'owner@example.com', key: 'notion', kind: 'read', method: 'GET', path: 'pages', status: 0 }]);
  for (const hidden of ['private', 'Private title', 'notion-token-value']) expect(JSON.stringify(log.mock.calls)).not.toContain(hidden);
});

test('trades the ID and the secret for a token once, trades again on a refusal, and refuses when none comes', async () => {
  answer = () => Response.json({ shop: 'Claymoo' });
  expect(await (await ask('shop', 'read', { method: 'GET', path: 'shop.json' })).json()).toMatchObject({ status: 200 });
  await ask('shop', 'read', { method: 'GET', path: 'shop.json' });
  const trades = () => send.mock.calls.filter(([url]) => String(url).endsWith('oauth/access_token'));
  expect(trades()).toHaveLength(1);
  expect(String(trades()[0][1].body)).toBe('grant_type=client_credentials&client_id=shop-client&client_secret=shop-secret');
  expect(sent().init.headers).toEqual({ Accept: 'application/json', 'X-Shop-Token': 'token-1' });
  answer = () => Response.json({}, { status: 401 });
  expect(await (await ask('shop', 'read', { method: 'GET', path: 'shop.json' })).json()).toMatchObject({ status: 401 });
  expect(trades()).toHaveLength(2);
  send.mockImplementation(async url => String(url).endsWith('oauth/access_token') ? Response.json({ token: 'wrong-field' }) : answer());
  expect(await code(await ask('shop', 'read', { method: 'GET', path: 'shop.json' }))).toEqual([502, 'no_token']);
  // A second trade that gives nothing refuses too.
  let first = true;
  send.mockImplementation(async url => String(url).endsWith('oauth/access_token')
    ? first ? (first = false, Response.json({ access_token: 'token-2' })) : new Response(null, { status: 400 }) : Response.json({}, { status: 401 }));
  expect(await code(await ask('shop', 'read', { method: 'GET', path: 'shop.json' }))).toEqual([502, 'no_token']);
});
