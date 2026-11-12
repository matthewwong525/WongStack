import { beforeEach, expect, test } from 'vitest';
import { AccessError, boundedJson, reply } from './errors.mjs';
import { checkedTool, readTools, storedTools, TOOL_ID, toolInput, toolSecret, toolsRoute } from './tools.mjs';

const notion = { title: 'Notion', purpose: 'Read our team wiki', docs: 'https://developers.notion.example/reference',
  forward: { base: 'https://api.notion.example/v1/', header: 'Authorization', prefix: 'Bearer ', lookups: ['POST search'] } };
const shopify = { title: 'Shopify', purpose: 'Store orders', docs: 'https://shopify.dev/docs/api/admin-rest',
  forward: { base: 'https://claymoo.myshopify.com/admin/api/2026-10/', header: 'X-Shopify-Access-Token', prefix: '',
    exchange: { url: 'https://claymoo.myshopify.com/admin/oauth/access_token' } } };

/** A store in memory: the tools, the change record, and each tool's cleared levels. */
const memoryStore = () => {
  const store = { rows: new Map(), events: [], cleared: [], broken: false,
    async tools() { if (store.broken) throw new Error('no table'); return [...store.rows.values()]; },
    async saveTool({ row, actor, clearLevels }) { store.rows.set(row.id, { ...row, added_by: actor }); if (clearLevels) store.cleared.push(row.id); store.events.push('tool_saved'); },
    async removeTool(id) { store.rows.delete(id); store.cleared.push(id); store.events.push('tool_removed'); },
    async audit(actor, event) { store.events.push(event); },
    async audited(event) { return store.events.includes(event); } };
  return store;
};
let store;
let started;
const route = (id, method, value, { live = true, keys = { stripe: { title: 'Stripe', purpose: 'Payments', secrets: ['STRIPE_SECRET_KEY'] } } } = {}) => {
  const request = new Request(`https://app.example/api/access/tools/${id}`, { method, ...(value !== undefined && { body: JSON.stringify(value) }) });
  return toolsRoute({ request, url: new URL(request.url), path: `tools/${id}`, pass: { email: 'owner@example.com', actor: 'owner@example.com', owner: true, live },
    store, registry: {}, slots: { keys: () => keys }, json: limit => boundedJson(request, limit), reply,
    refuse: (code, status, message) => reply({ error: { code, ...(message && { message }) } }, status), start: async () => { started += 1; } });
};
const error = async response => [response.status, (await response.json()).error];

beforeEach(() => { store = memoryStore(); started = 0; });

test('saves a tool from a chat with its own key, Read alone unless asked, and names the save', async () => {
  const saved = await route('notion', 'PUT', notion);
  expect([saved.status, await saved.json()]).toEqual([200, { id: 'notion', secret: 'TOOL_NOTION' }]);
  expect(store.rows.get('notion')).toMatchObject({ title: 'Notion', levels_json: '["read"]', added_by: 'owner@example.com',
    forward_json: JSON.stringify({ ...notion.forward, secret: 'TOOL_NOTION' }) });
  expect([store.events, started]).toEqual([['tool_saved'], 1]);
  const { entries } = await storedTools([...store.rows.values()]);
  expect(entries.notion).toMatchObject({ secrets: ['TOOL_NOTION'], levels: ['read'], liveOnly: true, chat: true });
  // A tool that trades an ID and a secret needs both.
  expect(await (await route('shopify', 'PUT', shopify)).json()).toEqual({ id: 'shopify', secret: 'TOOL_SHOPIFY' });
  expect((await storedTools([...store.rows.values()])).entries.shopify.secrets).toEqual(['TOOL_SHOPIFY', 'TOOL_SHOPIFY_ID']);
});

test('refuses a bad tool by its rule, an unknown field, an MCP server, a project key, a bad id and a save off the live app', async () => {
  expect(await error(await route('notion', 'PUT', { ...notion, forward: { ...notion.forward, lookups: ['POST ../admin'] } }))).toEqual([400,
    { code: 'bad_tool', message: 'the look-up "POST ../admin" must be METHOD path, with a path that stays under base' }]);
  expect(await error(await route('notion', 'PUT', { ...notion, forward: { ...notion.forward, base: 'http://api.notion.example/' } }))).toEqual([400,
    { code: 'bad_tool', message: 'base must be an HTTPS address ending in /' }]);
  expect(await error(await route('notion', 'PUT', { ...notion, forward: { ...notion.forward, secret: 'STRIPE_SECRET_KEY' } }))).toEqual([400,
    { code: 'bad_tool', message: "secret must be the tool's own, TOOL_NOTION" }]);
  expect(await error(await route('notion', 'PUT', { ...notion, extra: true }))).toEqual([400, { code: 'bad_tool', message: 'extra: is not a field' }]);
  expect(await error(await route('notion', 'PUT', { ...notion, forward: { ...notion.forward, lookups: undefined, mcp: { path: 'mcp', reads: [] } } })))
    .toEqual([400, { code: 'bad_tool', message: 'forward.mcp: is not a field' }]);
  expect(await error(await route('notion', 'PUT', { ...notion, docs: '' }))).toEqual([400, { code: 'bad_tool', message: "a key used directly needs docs, the service's API guide" }]);
  expect(await error(await route('shopify', 'PUT', { ...shopify, forward: { ...shopify.forward, exchange: { url: 'https://evil.example/oauth/access_token' } } }))).toEqual([400,
    { code: 'bad_tool', message: "the token address https://evil.example/oauth/access_token must be HTTPS on base's own host" }]);
  expect(await error(await route('shopify-id', 'PUT', notion))).toEqual([400, { code: 'bad_tool', message: "a tool's id never ends in -id" }]);
  expect(await error(await route('stripe', 'PUT', notion))).toEqual([409, { code: 'code_key' }]);
  expect(await error(await route('Bad_Id', 'PUT', notion))).toEqual([404, { code: 'not_found' }]);
  expect(await error(await route('notion', 'GET'))).toEqual([404, { code: 'not_found' }]);
  expect(await error(await route('notion', 'PUT', notion, { live: false }))).toEqual([409, { code: 'live_only' }]);
  expect(store.rows.size).toBe(0);
});

test('checks every field of a tool, strictly', () => {
  const wrong = change => toolInput({ ...notion, ...change }).problem;
  expect(toolInput(notion).tool).toEqual({ ...notion, levels: ['read'] });
  expect(toolInput({ ...notion, title: '  Notion  ' }).tool.title).toBe('Notion');
  for (const [change, problem] of [[{ title: ' ' }, 'title: must be 1 to 60 characters'], [{ purpose: 1 }, 'purpose: must be text'],
    [{ docs: 'x'.repeat(501) }, 'docs: must be text of at most 500 characters'], [{ forward: [] }, 'forward: must be an object'],
    [{ forward: { ...notion.forward, base: 1 } }, 'forward.base: must be text of at most 500 characters'],
    [{ forward: { ...notion.forward, prefix: 'x'.repeat(101) } }, 'forward.prefix: must be text of at most 100 characters'],
    [{ forward: { ...notion.forward, header: undefined } }, 'forward.header: must be text of at most 100 characters'],
    [{ forward: { ...notion.forward, headers: { 'Bad Name': 'x' } } }, 'forward.headers: must name headers with text values'],
    [{ forward: { ...notion.forward, lookups: Array(51).fill('GET x') } }, 'forward.lookups: must be at most 50 entries of text'],
    [{ forward: { ...notion.forward, exchange: 'x' } }, 'forward.exchange: must be an object'],
    [{ forward: { ...notion.forward, exchange: { url: 'https://x/', other: 1 } } }, 'forward.exchange.other: is not a field'],
    [{ forward: { ...notion.forward, exchange: { url: 1 } } }, 'forward.exchange.url: must be text of at most 500 characters'],
    [{ levels: ['write'] }, 'levels: must be ["read"] or ["read", "write"]'], [{ levels: ['read,write'] }, 'levels: must be ["read"] or ["read", "write"]']]) {
    expect(wrong(change), JSON.stringify(change)).toBe(problem);
  }
  expect(toolInput('tool').problem).toBe('tool: must be an object');
  expect(toolInput({ ...notion, levels: ['read', 'write'] }).tool.levels).toEqual(['read', 'write']);
  expect([TOOL_ID.test('a'.repeat(41)), toolSecret('my-tool'), checkedTool('X', toolInput(notion).tool).problem])
    .toEqual([false, 'TOOL_MY_TOOL', "a tool's id is lowercase letters, digits and hyphens, at most 40"]);
});

test('clears every level on a tool when a save changes what it reads, keeps them on a new name, and removes a tool', async () => {
  await route('notion', 'PUT', notion);
  await route('notion', 'PUT', { ...notion, title: 'Notion wiki' });
  expect(store.cleared).toEqual([]);
  for (const changed of [{ ...notion, forward: { ...notion.forward, lookups: ['POST search', 'POST databases/*/query'] } }, { ...notion, levels: ['read', 'write'] }]) {
    expect((await route('notion', 'PUT', changed)).status).toBe(200);
  }
  expect(store.cleared).toEqual(['notion', 'notion']);
  // A stored row that can not be read counts as a change.
  store.rows.get('notion').forward_json = '{';
  await route('notion', 'PUT', notion);
  expect(store.cleared).toHaveLength(3);
  expect([(await route('notion', 'DELETE')).status, await error(await route('notion', 'DELETE'))]).toEqual([200, [404, { code: 'not_found' }]]);
  expect(store.events.at(-1)).toBe('tool_removed');
  expect(await error(await route('stripe', 'DELETE'))).toEqual([409, { code: 'code_key' }]);
});

test('refuses with no detail when the store can not be read, and passes on a refusal of its own', async () => {
  store.broken = true;
  expect(await error(await route('notion', 'PUT', notion))).toEqual([503, { code: 'access_unavailable' }]);
  store.broken = false;
  store.saveTool = async () => { throw new AccessError('revision_conflict', 409); };
  expect(await error(await route('notion', 'PUT', notion))).toEqual([409, { code: 'revision_conflict' }]);
});

test('reads back only the rows that keep the rules, and skips an MCP tool, naming it once in the change record', async () => {
  await route('notion', 'PUT', notion);
  store.rows.set('bad', { ...store.rows.get('notion'), id: 'bad', forward_json: '{"base":"https://evil.example/","header":"Authorization","secret":"STRIPE_SECRET_KEY"}' });
  store.rows.set('torn', { ...store.rows.get('notion'), id: 'torn', levels_json: '[' });
  store.rows.set('docs', { ...store.rows.get('notion'), id: 'docs', forward_json: '{"base":"https://mcp.docs.example/","mcp":{"path":"mcp","reads":[]}}' });
  expect(await storedTools([...store.rows.values()])).toMatchObject({ skipped: ['docs'] });
  expect(Object.keys(await readTools(store, 'owner@example.com'))).toEqual(['notion']);
  expect(Object.keys(await readTools(store))).toEqual(['notion']);
  expect(store.events.filter(event => event.startsWith('tool_skipped'))).toEqual(['tool_skipped_mcp:docs']);
  // A record that can not be written leaves the list as it is; a store that can not be read gives none.
  store.audited = async () => { throw new Error('no record'); };
  expect(Object.keys(await readTools(store))).toEqual(['notion']);
  store.broken = true;
  expect(await readTools(store)).toEqual({});
});
