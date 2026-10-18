import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { classify, codexServers, importMcps, localMcps, offerText, REASONS, removeLocal, sortMcps } from '../lib/mcp-import.mjs';

const CODEX = `# Codex settings
model = "o3"
mcp_servers.inline = { url = "https://inline.example.com/mcp" }

[mcp_servers.notion]
url = "https://mcp.notion.com/mcp"
enabled = true # a comment

[mcp_servers.github]
url = "https://api.githubcopilot.com/mcp/"
bearer_token_env_var = "SECRET-TOML-BEARER"

[mcp_servers."local files"]
command = "npx"
args = [
  "-y", # a comment inside
  "@modelcontextprotocol/server-filesystem",
]
env = { "API_KEY" = "SECRET-TOML-ENV" }

[mcp_servers.stripe]
url = 'https://mcp.stripe.com'
[mcp_servers.stripe.http_headers]
"X-Key" = "SECRET-TOML-HEADER"

[mcp_servers.canva-again]
url = "https://mcp.canva.com/mcp/"

[profiles.other]
url = "https://not-an-mcp.example.com"
`;

// A computer with Claude and Codex settings, each credentials file beside them holding a value no read may touch.
function computer(t, { codexHome } = {}) {
  const home = mkdtempSync(join(tmpdir(), 'mcp-import-')); t.after(() => rmSync(home, { recursive: true, force: true }));
  const checkout = join(home, 'work', 'project'), codex = codexHome ? join(home, codexHome) : join(home, '.codex');
  for (const dir of [checkout, join(home, '.claude'), codex]) mkdirSync(dir, { recursive: true });
  writeFileSync(join(home, '.claude.json'), JSON.stringify({ numStartups: 4, mcpServers: {
    canva: { type: 'http', url: 'https://mcp.canva.com/mcp' },
    files: { command: 'npx', args: ['-y', 'files'], env: { ROOT: 'SECRET-CLAUDE-ENV' } },
    sentry: { type: 'http', url: 'https://mcp.sentry.dev/mcp', headers: { Authorization: 'Bearer SECRET-CLAUDE-HEADER' } },
    events: { type: 'sse', url: 'https://old.example.com/sse' },
    exa: { type: 'http', url: 'https://mcp.exa.ai/mcp?exaApiKey=SECRET-QUERY' },
    dev: { type: 'http', url: 'http://localhost:3000/mcp' },
  }, projects: { [checkout]: { mcpServers: { linear: { type: 'http', url: 'https://mcp.linear.app/mcp' } } },
    '/somewhere/else': { mcpServers: { elsewhere: { type: 'http', url: 'https://elsewhere.example.com/mcp' } } } } }));
  writeFileSync(join(checkout, '.mcp.json'), JSON.stringify({ mcpServers: { figma: { type: 'http', url: 'https://mcp.figma.com/mcp' },
    docs: { type: 'http', url: 'https://docs.example.com/mcp', env: { TOKEN: 'SECRET-PROJECT-ENV' } } } }));
  writeFileSync(join(codex, 'config.toml'), CODEX);
  writeFileSync(join(home, '.claude', '.credentials.json'), '{"token":"SECRET-CREDENTIAL"}');
  writeFileSync(join(codex, 'auth.json'), '{"token":"SECRET-CODEX-AUTH"}');
  const reads = [];
  const read = path => { reads.push(path); try { return readFileSync(path, 'utf8'); } catch { return null; } };
  const env = codexHome ? { CODEX_HOME: codex } : {};
  return { home, checkout, codex, reads, where: { home, env, checkout, read } };
}
// The app, as the helper's company client sees it: its MCP list and each Add, recorded.
function app(servers = []) {
  const added = [];
  return { added, http: async (path, init = {}) => {
    if (path !== '/api/mcp/servers') throw new Error(`unexpected ${path}`);
    if (!init.method) return { value: { sealed: true, manages: false, me: 'ada@example.com', servers }, status: 200 };
    const body = JSON.parse(init.body); added.push(body);
    if (body.name === 'inline') return { value: { error: { code: 'mcp_refused', message: 'That address has no sign-in we can use.', requestId: 'r' } }, status: 422 };
    return { value: { server: { id: body.name, name: body.name, url: body.url, connect: `https://company.example.com/apps/access/services/${body.name}` } }, status: 201 };
  } };
}

test('each settings shape becomes an address to add or a skip with its reason', () => {
  assert.deepEqual(classify({ type: 'http', url: 'https://mcp.canva.com/mcp#top' }), { url: 'https://mcp.canva.com/mcp' });
  assert.deepEqual(classify({ url: 'https://mcp.notion.com/mcp' }), { url: 'https://mcp.notion.com/mcp' });
  assert.deepEqual(classify({ type: 'http', url: 'https://a.example.com', headers: {} }), { url: 'https://a.example.com/' }, 'an empty header list holds no key');
  for (const [config, reason] of [[{ command: 'npx' }, 'local'], [{ type: 'stdio', url: 'https://a.example.com' }, 'local'],
    [{ url: 'https://a.example.com', headers: { A: 'b' } }, 'key'], [{ url: 'https://a.example.com', headersHelper: './token.sh' }, 'key'],
    [{ url: 'https://a.example.com', env: { A: 'b' } }, 'key'], [{ url: 'https://a.example.com', bearer_token_env_var: 'A' }, 'key'],
    [{ url: 'https://a.example.com', http_headers: true }, 'key'], [{ url: 'https://a.example.com', env_http_headers: true }, 'key'],
    [{ url: 'https://a.example.com/mcp?key=b' }, 'key'], [{ url: 'https://user:pass@a.example.com/mcp' }, 'key'],
    [{ type: 'sse', url: 'https://a.example.com/sse' }, 'sse'], [{ url: 'http://a.example.com' }, 'https'], [{ url: 'not an address' }, 'https'],
    [{ type: 'http' }, 'address'], [null, 'address']]) assert.deepEqual(classify(config), { skip: REASONS[reason] }, JSON.stringify(config));
});

test('reads Claude user, this project\'s local and .mcp.json entries and Codex tables; skips each with its reason; shows no value', t => {
  const c = computer(t);
  const { offer, skipped } = sortMcps(localMcps(c.where), [{ url: 'https://mcp.linear.app/mcp/' }]);
  assert.deepEqual(offer.map(({ name, from, scope, url }) => ({ name, from, scope, url })), [
    { name: 'canva', from: 'Claude', scope: 'user', url: 'https://mcp.canva.com/mcp' },
    { name: 'figma', from: 'Claude', scope: 'project', url: 'https://mcp.figma.com/mcp' },
    { name: 'inline', from: 'Codex', scope: undefined, url: 'https://inline.example.com/mcp' },
    { name: 'notion', from: 'Codex', scope: undefined, url: 'https://mcp.notion.com/mcp' }], 'canva-again is the same address as canva');
  assert.deepEqual(Object.fromEntries(skipped.map(entry => [entry.name, entry.skip])), { files: REASONS.local, sentry: REASONS.key, events: REASONS.sse,
    exa: REASONS.key, dev: REASONS.https, linear: REASONS.added, docs: REASONS.key, github: REASONS.key, 'local files': REASONS.local, stripe: REASONS.key });
  const text = offerText({ offer, skipped });
  assert.match(text, /^Found canva and figma in Claude, and inline and notion in Codex\. Add them\? Then press Connect on each\.\n/);
  assert.match(text, /\nSkipped: files \(runs on this computer\), sentry \(uses a fixed key\), events \(uses an older connection the app doesn't speak\), exa/);
  assert.match(text, /\nTo add them: node scripts\/company-api\.mjs mcp import --yes$/);
  assert.doesNotMatch(text, /SECRET|elsewhere|not-an-mcp/);
  assert.deepEqual(c.reads.sort(), [join(c.checkout, '.mcp.json'), join(c.codex, 'config.toml'), join(c.home, '.claude.json')].sort(), 'no credentials file is opened');
  assert.equal(offerText({ offer: [], skipped: [] }), 'Found no MCPs in Claude or Codex that the app can add.');
});

test('Codex settings come from $CODEX_HOME when set, and Claude\'s from $CLAUDE_CONFIG_DIR', t => {
  const c = computer(t, { codexHome: 'elsewhere-codex' });
  assert.ok(localMcps(c.where).some(entry => entry.name === 'notion'));
  assert.ok(!localMcps({ ...c.where, env: {} }).some(entry => entry.from === 'Codex'), 'the default ~/.codex has no settings here');
  mkdirSync(join(c.home, 'claude-config')); writeFileSync(join(c.home, 'claude-config', '.claude.json'), JSON.stringify({ mcpServers: { moved: { type: 'http', url: 'https://moved.example.com/mcp' } } }));
  const moved = localMcps({ ...c.where, env: { CLAUDE_CONFIG_DIR: join(c.home, 'claude-config') } }).filter(entry => entry.from === 'Claude' && entry.scope === 'user');
  assert.deepEqual(moved.map(entry => entry.name), ['moved']);
});

test('the Codex reader keeps only mcp_servers tables and survives a broken file', () => {
  const servers = codexServers(CODEX);
  assert.deepEqual(Object.keys(servers), ['inline', 'notion', 'github', 'local files', 'stripe', 'canva-again']);
  assert.equal(servers.stripe.http_headers, true); assert.equal(servers['local files'].args.length, 2); assert.equal(servers.notion.url, 'https://mcp.notion.com/mcp');
  assert.deepEqual(codexServers('[mcp_servers.half\nurl = "https://a.example.com"'), {});
  assert.deepEqual(codexServers('[mcp_servers.x]\nurl = "https://a.example.com/\\u0041"\n'), { x: { url: 'https://a.example.com/A' } });
});

test('with --yes each MCP is added under the caller\'s login with its name and address only, and each result says what is next', async t => {
  const c = computer(t), client = app([{ url: 'https://mcp.linear.app/mcp' }]);
  const offered = await importMcps(client, c.where);
  assert.equal(offered.ok, true); assert.equal(client.added.length, 0, 'nothing is added before the person agrees');
  const done = await importMcps(client, { ...c.where, yes: true });
  assert.deepEqual(client.added, [{ url: 'https://mcp.canva.com/mcp', name: 'canva' }, { url: 'https://mcp.figma.com/mcp', name: 'figma' },
    { url: 'https://inline.example.com/mcp', name: 'inline' }, { url: 'https://mcp.notion.com/mcp', name: 'notion' }]);
  assert.equal(done.ok, false, 'one refusal fails the run');
  assert.match(done.text, /^Added canva\. Open this link and press Connect to sign in as yourself:\nhttps:\/\/company\.example\.com\/apps\/access\/services\/canva\n/);
  assert.match(done.text, /\ninline: That address has no sign-in we can use\.\n/);
  assert.doesNotMatch(done.text, /SECRET/);
});

test('removing a brought-in MCP waits for the caller\'s own Connect, then names or runs Claude\'s and Codex\'s own remove', async t => {
  const c = computer(t), runs = [];
  const runCommand = command => { runs.push(command); return { status: 0, stderr: '' }; };
  const server = own => ({ id: 'canva', name: 'Canva', url: 'https://mcp.canva.com/mcp', own, connect: 'https://company.example.com/apps/access/services/canva' });
  const before = await removeLocal(app([server(null)]), 'canva', { ...c.where, yes: true, runCommand, cwd: c.checkout });
  assert.deepEqual(before, { ok: false, text: 'Press Connect on Canva first, so your chats keep it, then run this again:\nhttps://company.example.com/apps/access/services/canva' });
  const reconnect = await removeLocal(app([server({ state: 'reconnect' })]), 'canva', { ...c.where, yes: true, runCommand, cwd: c.checkout });
  assert.equal(reconnect.ok, false); assert.equal(runs.length, 0, 'nothing runs before the caller\'s own Connect');
  assert.equal((await removeLocal(app([]), 'canva', { ...c.where, runCommand })).ok, false, 'an MCP the app lacks stays');
  assert.equal((await removeLocal(app([server({ state: 'connected' })]), 'files', { ...c.where, runCommand })).ok, false, 'a local program is never touched');
  const connected = app([server({ state: 'connected' })]);
  const shown = await removeLocal(connected, 'canva', { ...c.where, runCommand, cwd: c.checkout });
  assert.equal(shown.text, 'claude mcp remove canva -s user\nTo remove it, run those, or: node scripts/company-api.mjs mcp import --remove-local canva --yes');
  assert.equal(runs.length, 0, 'without --yes it only prints');
  const removed = await removeLocal(connected, 'canva', { ...c.where, yes: true, runCommand, cwd: c.checkout });
  assert.deepEqual(removed, { ok: true, text: 'Removed canva from Claude.' });
  assert.deepEqual(runs, [{ program: 'claude', args: ['mcp', 'remove', 'canva', '-s', 'user'], cwd: c.checkout }]);
  const notion = app([{ ...server({ state: 'connected' }), url: 'https://mcp.notion.com/mcp/' }]);
  assert.equal((await removeLocal(notion, 'notion', { ...c.where, runCommand, cwd: c.checkout })).text.split('\n')[0], 'codex mcp remove notion');
  const linear = app([{ ...server({ state: 'connected' }), url: 'https://mcp.linear.app/mcp' }]);
  assert.equal((await removeLocal(linear, 'linear', { ...c.where, runCommand, cwd: c.home })).text.split('\n')[0], `cd ${c.checkout} && claude mcp remove linear -s local`);
  const figma = app([{ ...server({ state: 'connected' }), url: 'https://mcp.figma.com/mcp' }]);
  assert.deepEqual(await removeLocal(figma, 'figma', { ...c.where, yes: true, runCommand, cwd: c.checkout }),
    { ok: true, text: 'figma is in this project\'s .mcp.json, which the team shares: remove its entry there and save the change as usual.' });
  assert.equal(runs.length, 1, 'a shared .mcp.json entry is a file edit, never a command');
  const failing = await removeLocal(connected, 'canva', { ...c.where, yes: true, cwd: c.checkout, runCommand: () => ({ status: 1, stderr: 'No MCP server found\nmore' }) });
  assert.deepEqual(failing, { ok: false, text: 'Claude could not remove canva: No MCP server found' });
  assert.ok(c.reads.every(path => !/credentials|auth\.json/.test(path)));
});
