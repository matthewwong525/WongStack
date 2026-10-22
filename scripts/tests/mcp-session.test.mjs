import test from 'node:test';
import assert from 'node:assert/strict';
import { directSend, mcpSession, rpcAnswer, toolText } from '../mcp-session.mjs';
import { mcpCommand, toolLines } from '../company-api.mjs';

const TOOLS = [{ name: 'search', description: 'Find pages by words. Returns at most ten.', inputSchema: { type: 'object', properties: { q: { type: 'string' } } } },
  { name: 'delete_page', description: '  Delete a page\n for good!  It cannot be undone.' }];
const READS = ['search'];
const LOOKUPS = ['initialize', 'notifications/initialized', 'tools/list'];
/** The app's sort, as the door applies it, for the stand-in. */
const looksUp = ({ method, body }) => method === 'POST' && body && !Array.isArray(body) &&
  (LOOKUPS.includes(body.method) || (body.method === 'tools/call' && READS.includes(body.params?.name)));

/** A stand-in for the company helper's `call`: it sorts like the door, then answers as an MCP server would.
 *  `format` picks JSON or an event stream; `reply(message)` may replace a tool's result. */
function door({ format = 'sse', reply, status = 200 } = {}) {
  const calls = [];
  const call = async (id, input) => {
    calls.push({ id, input });
    if (id === 'docs.read' && !looksUp(input)) return { error: { code: 'not_a_lookup', message: 'Only look-ups run here. Anything else needs docs.change, which needs Read & write.' } };
    const message = input.body;
    if (message.method === 'notifications/initialized') return { status: 202, contentType: '', body: '' };
    const result = message.method === 'initialize' ? { protocolVersion: '2025-06-18' } : message.method === 'tools/list' ? { tools: TOOLS }
      : reply?.(message) ?? { content: [{ type: 'text', text: `ran ${message.params.name}` }, { type: 'image', data: 'x' }, { type: 'text', text: 'done' }] };
    const answer = { jsonrpc: '2.0', id: message.id, result };
    return { status, contentType: format === 'sse' ? 'text/event-stream' : 'application/json',
      body: format === 'sse' ? `event: message\ndata: ${JSON.stringify(answer)}\n\n` : answer, ...(message.method === 'initialize' && { session: 'S-1' }) };
  };
  return { call, calls };
}
const session = (stand = door()) => mcpSession({ send: directSend(stand.call, 'docs'), path: 'mcp', name: 'Docs' });

test('rpcAnswer finds the answer to its id in JSON text, a parsed value or an event stream', () => {
  const answer = { jsonrpc: '2.0', id: 2, result: { ok: true } };
  assert.deepEqual(rpcAnswer(JSON.stringify(answer), 2), answer);
  assert.deepEqual(rpcAnswer(answer, 2), answer);
  assert.deepEqual(rpcAnswer([{ id: 1 }, answer], 2), answer);
  assert.deepEqual(rpcAnswer(`event: message\ndata: {"id":1}\n\ndata: not json\r\ndata: ${JSON.stringify(answer)}\n\n`, 2), answer);
  assert.equal(rpcAnswer('event: ping\n\n', 2), null);
  assert.equal(rpcAnswer('', 2), null);
});

test('a session opens once, carries its id, lists tools on Read, and runs a look-up tool on Read', async () => {
  for (const format of ['sse', 'json']) {
    const stand = door({ format });
    const docs = session(stand);
    assert.deepEqual((await docs.tools()).map(tool => tool.name), ['search', 'delete_page'], format);
    assert.equal(toolText(await docs.tool('search', { q: 'a' }), 'Docs'), 'ran search\ndone');
    assert.equal(docs.session, 'S-1');
    assert.deepEqual(stand.calls.map(({ id, input }) => [id, input.body.method, input.session ?? null]), [
      ['docs.read', 'initialize', null], ['docs.read', 'notifications/initialized', 'S-1'], ['docs.read', 'tools/list', 'S-1'], ['docs.read', 'tools/call', 'S-1']]);
    assert.deepEqual(stand.calls[0].input.body.params, { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'wongstack', version: '1' } });
    assert.equal(stand.calls[1].input.body.id, undefined, 'a notice has no id');
    assert.deepEqual(stand.calls[3].input, { method: 'POST', path: 'mcp', body: { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'search', arguments: { q: 'a' } } }, session: 'S-1' });
  }
});

test('tools follows the server\'s next page until there is none, and stops at 20 pages', async () => {
  const lists = [];
  /** A server with `pages` pages of one tool each, every page but the last naming the next. */
  const paged = pages => async (id, input) => {
    const message = input.body;
    if (message.method === 'notifications/initialized') return { status: 202, contentType: '', body: '' };
    if (message.method === 'initialize') return { status: 200, contentType: 'application/json', body: { jsonrpc: '2.0', id: message.id, result: {} } };
    lists.push(message.params ?? null);
    const at = message.params ? Number(message.params.cursor.slice(1)) : 0;
    const result = { tools: [{ name: `tool_${at}` }], ...(at + 1 < pages && { nextCursor: `c${at + 1}` }) };
    return { status: 200, contentType: 'application/json', body: { jsonrpc: '2.0', id: message.id, result } };
  };
  const open = pages => mcpSession({ send: directSend(paged(pages), 'docs'), path: 'mcp', name: 'Docs' });
  assert.deepEqual((await open(3).tools()).map(tool => tool.name), ['tool_0', 'tool_1', 'tool_2']);
  assert.deepEqual(lists, [null, { cursor: 'c1' }, { cursor: 'c2' }]);
  assert.equal((await open(20).tools()).length, 20);
  await assert.rejects(open(21).tools(), /^Error: Docs lists more than 20 pages of tools$/);
});

test('a tool that changes something is tried as a look-up, refused, then sent as a change', async () => {
  const stand = door();
  assert.equal(toolText(await session(stand).tool('delete_page'), 'Docs'), 'ran delete_page\ndone');
  assert.deepEqual(stand.calls.slice(2).map(({ id, input }) => [id, input.body.params]), [['docs.read', { name: 'delete_page', arguments: {} }], ['docs.change', { name: 'delete_page', arguments: {} }]]);
});

test('a refusal, a service error, a tool error and a missing answer each become an error in plain words', async () => {
  const refused = async () => ({ error: { code: 'forbidden', message: 'Docs: Read & write needed' } });
  await assert.rejects(mcpSession({ send: directSend(refused, 'docs'), path: 'mcp', name: 'Docs' }).tools(), /^Error: docs: Docs: Read & write needed$/);
  await assert.rejects(session(door({ status: 503 })).tools(), /Docs refused initialize \(HTTP 503\)/);
  await assert.rejects(session(door({ reply: () => ({ content: [{ type: 'text', text: 'No page p9' }], isError: true }) })).tool('search').then(result => toolText(result, 'Docs')), /^Error: Docs: No page p9$/);
  assert.throws(() => toolText({ isError: true }, 'Docs'), /Docs: the tool failed/);
  const silent = async (id, input) => ({ status: 200, contentType: 'text/event-stream', body: input.body.method === 'initialize' ? 'event: ping\n\n' : '' });
  await assert.rejects(mcpSession({ send: directSend(silent, 'docs'), path: 'mcp', name: 'Docs' }).tools(), /Docs gave no answer to initialize/);
  const erring = async (id, input) => ({ status: 200, contentType: 'application/json', body: { jsonrpc: '2.0', id: input.body.id, error: { code: -32601, message: 'Method not found' } } });
  await assert.rejects(mcpSession({ send: directSend(erring, 'docs'), path: 'mcp', name: 'Docs' }).tools(), /^Error: Docs: Method not found$/);
});

/** A stand-in company client: the services list and the door. */
const client = (stand = door(), services = [{ id: 'docs', name: 'Docs', mcp: { path: 'mcp' } }, { id: 'stripe', name: 'Stripe' }]) =>
  ({ http: async path => (assert.equal(path, '/api/services?all=1'), { value: { services } }), call: stand.call });

test('the mcp command lists tools by name and first sentence, shows one tool, and runs one', async () => {
  assert.deepEqual(toolLines(TOOLS), ['search       Find pages by words.', 'delete_page  Delete a page for good!']);
  assert.deepEqual(toolLines([{ name: 'bare' }]), ['bare']);
  assert.deepEqual(toolLines([]), ['No tools.']);
  assert.equal(await mcpCommand(client(), 'docs', ['tools']), toolLines(TOOLS).join('\n'));
  assert.deepEqual(JSON.parse(await mcpCommand(client(), 'docs', ['tools', 'search'])), TOOLS[0]);
  await assert.rejects(mcpCommand(client(), 'docs', ['tools', 'missing']), /Docs has no tool named missing/);
  const stand = door();
  assert.equal(await mcpCommand(client(stand), 'docs', ['tool', 'search'], () => ({ q: 'a' })), 'ran search\ndone');
  assert.deepEqual(stand.calls.at(-1).input.body.params, { name: 'search', arguments: { q: 'a' } });
});

test('the mcp command refuses a wrong use, a service that is not MCP and bad arguments before sending a tool call', async () => {
  const stand = door();
  for (const args of [[], ['tool'], ['run', 'x'], ['tools', 'a', 'b']]) await assert.rejects(mcpCommand(client(stand), 'docs', args, () => ({})), /usage:/, args.join(' '));
  await assert.rejects(mcpCommand(client(stand), undefined, ['tools']), /usage:/);
  await assert.rejects(mcpCommand(client(stand), 'stripe', ['tools']), /Stripe is not an MCP server; use call stripe.read/);
  await assert.rejects(mcpCommand(client(stand), 'xero', ['tools']), /No service named xero: run services/);
  for (const bad of [[], 'text', null]) await assert.rejects(mcpCommand(client(stand), 'docs', ['tool', 'search'], () => bad), /arguments as a JSON object/);
  assert.equal(stand.calls.length, 0);
});
