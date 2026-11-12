// Each module installed alone: its folder copied into an empty repo, a minimal profile, a chat start, and its check.
// wiki/maintaining/adding-a-module.md
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const STAND_IN = pathToFileURL(join(repo, 'scripts/tests/fixtures/memory/stand-in-store.mjs')).href;
const load = (folder, path) => import(pathToFileURL(join(folder, path)).href);
// Each module's own check, loaded from its installed copy; the function it returns registers the check's tests.
const CHECKS = {
  memory: async folder => {
    const { checkStore } = await load(folder, 'store/contract.mjs');
    const { standInStore } = await import(STAND_IN);
    return () => checkStore(standInStore, 'memory installed alone');
  },
  access: async folder => {
    const { checkStore } = await load(folder, 'store/contract.mjs');
    const { standInStore } = await load(folder, 'store/stand-in.mjs');
    return () => checkStore(standInStore, 'access installed alone');
  },
};
// What each module's chat start prints in a repo that has nothing else.
const STARTS = {
  memory: { input: '{"session_id":"alone-1"}', expect: out => {
    assert.match(out, /^# Memory digest\n[\s\S]*Code: billing/);
    assert.doesNotMatch(out, /skipped/);
  } },
  access: { input: '{"session_id":"alone-1","source":"startup"}',
    expect: out => assert.match(out, /^Access is not set up in this repo\. Ask the person "Access isn't set up yet\. Set it up now\?"/) },
};
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|new URL\(\s*)['"](\.{1,2}(?:\/[^'"]*)?)['"]/g;

const scratch = mkdtempSync(join(tmpdir(), 'wong-test-module-install-'));
after(() => rmSync(scratch, { recursive: true, force: true }));
const modules = readdirSync(join(repo, '.agents/plugins'), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name);

/** Every relative import or file URL in the folder's scripts that resolves outside the folder. */
function outsideImports(folder) {
  const files = readdirSync(folder, { recursive: true }).filter(path => /\.m?js$/.test(path));
  return files.flatMap(file => [...readFileSync(join(folder, file), 'utf8').matchAll(SPECIFIER)]
    .map(match => [file, match[1]])
    .filter(([, specifier]) => relative(folder, resolve(folder, dirname(file), specifier)).startsWith('..'))
    .map(([path, specifier]) => `${path} → ${specifier}`));
}

// An empty git repo holding only the module folder and a profile on the stand-in store.
function installAlone(name) {
  const root = join(scratch, name);
  execFileSync('git', ['init', '-q', '-b', 'main', root]);
  cpSync(join(repo, '.agents/plugins', name), join(root, '.agents/skills', name), { recursive: true });
  mkdirSync(join(root, '.agents/memory'), { recursive: true });
  writeFileSync(join(root, '.agents/memory/profile.mjs'), `import { standInStore } from '${STAND_IN}';
const store = standInStore();
export default {
  connect: () => store.as({ role: 'member', subject: 'dev', email: 'dev@example.com' }),
  topics: () => [{ kind: 'code', tag: 'billing', summary: 'How billing works.' }],
  sessionStart: () => {}, // returns nothing: the chat start still prints the digest
};
`);
  return root;
}

// Loaded before any test is registered, so every test joins the run.
const installs = await Promise.all(modules.map(async name => {
  const root = installAlone(name);
  const folder = join(root, '.agents/skills', name);
  return { name, root, folder, check: await CHECKS[name]?.(folder) };
}));

for (const { name, root, folder, check } of installs) {
  test(`${name} has its own check here`, () => assert.ok(check, `add ${name}'s check to CHECKS`));
  check?.();

  test(`${name} imports nothing outside its own folder`, () => {
    assert.deepEqual(outsideImports(folder), []);
  });

  test(`${name} starts a chat in a repo that has nothing else`, () => {
    assert.ok(STARTS[name], `add ${name}'s chat start to STARTS`);
    const home = join(scratch, `${name}-home`);
    const env = { ...process.env, HOME: home, XDG_DATA_HOME: join(home, 'data'), WONG_MEMORY_STATE_DIR: join(home, 'state'),
      WONG_MEMORY_CLAUDE_HOME: join(home, 'claude'), WONG_MEMORY_CODEX_HOME: join(home, 'codex'), WONG_MEMORY_NO_HEADLESS: '1' };
    delete env.WONG_MEMORY_PROFILE;
    const start = spawnSync(process.execPath, [join(folder, 'scripts/session-start.mjs')], { cwd: root, env, encoding: 'utf8', input: STARTS[name].input });
    assert.equal(start.status, 0, start.stderr);
    STARTS[name].expect(start.stdout);
  });
}

// Access with the stand-in store: the owner's first look starts permissions, then the gate lets in only listed people.
const access = installs.find(install => install.name === 'access');
if (access) {
  test('access is quiet at chat start once the repo names its slots', () => {
    mkdirSync(join(access.root, '.agents/access'), { recursive: true });
    writeFileSync(join(access.root, '.agents/access/slots.json'), '{ "slots": "access-slots.mjs", "app": "https://app.example.com" }');
    const start = spawnSync(process.execPath, [join(access.folder, 'scripts/session-start.mjs')], { cwd: access.root, encoding: 'utf8', input: '{"source":"startup"}' });
    rmSync(join(access.root, '.agents/access'), { recursive: true });
    assert.equal(start.status, 0, start.stderr);
    assert.equal(start.stdout, '');
  });

  test('access gates a route through its slots alone', async () => {
    const { access: build } = await load(access.folder, 'server/index.mjs');
    const { standInStore } = await load(access.folder, 'store/stand-in.mjs');
    const store = standInStore();
    const origin = 'https://app.example.com';
    const app = build({
      signIn: async request => {
        const email = request.headers.get('x-test-email');
        return email ? { email, subject: `id-${email}` } : null;
      },
      store: () => store,
      owner: () => 'owner@example.com',
      apps: () => [{ id: 'orders', title: 'Orders', description: 'Look up an order.' }],
    });
    const as = (email, path = '/apps/orders', init = {}) => new Request(`${origin}${path}`,
      { ...init, headers: { 'x-test-email': email, Origin: origin, 'content-type': 'application/json' } });

    const status = await app.serve(as('owner@example.com', '/api/access/status'));
    assert.equal(status.status, 200, await status.clone().text());
    const saved = await app.serve(as('owner@example.com', '/api/access/people', { method: 'POST',
      body: JSON.stringify({ email: 'ada@example.com', removed: false, apps: { orders: true } }) }));
    assert.equal(saved.status, 200, await saved.clone().text());

    assert.equal(await app.gate(as('ada@example.com'), { apps: ['orders'] }), null);
    const refused = await app.gate(as('eve@example.com'), { apps: ['orders'] });
    assert.ok(refused instanceof Response);
    assert.equal(refused.status, 403);
    assert.equal(await app.serve(as('ada@example.com', '/apps/orders')), null);
  });

  test('access works with only the sign-in, the store and the owner', async () => {
    const { access: build } = await load(access.folder, 'server/index.mjs');
    const { standInStore } = await load(access.folder, 'store/stand-in.mjs');
    const store = standInStore();
    const origin = 'https://app.example.com';
    const app = build({ signIn: request => { const email = request.headers.get('x-test-email'); return email ? { email, subject: `id-${email}` } : null; },
      store: () => store, owner: () => 'owner@example.com' });
    const as = (email, path = '/orders', init = {}) => new Request(`${origin}${path}`,
      { ...init, headers: { ...(email && { 'x-test-email': email }), Origin: origin, 'content-type': 'application/json' } });

    const status = await (await app.serve(as('owner@example.com', '/api/access/status'))).json();
    assert.equal(status.started, true);
    assert.ok(!('apps' in status) && !('keys' in status), 'the page gets no app ticks and no key levels');
    const saved = await app.serve(as('owner@example.com', '/api/access/people', { method: 'POST',
      body: JSON.stringify({ email: 'ada@example.com', removed: false }) }));
    assert.equal(saved.status, 200, await saved.clone().text());
    assert.ok(!('apps' in await saved.json()));

    // With no apps slot, a listed person opens the whole app.
    assert.equal(await app.gate(as('ada@example.com'), { apps: ['orders'] }), null);
    assert.equal((await app.gate(as('eve@example.com'), { apps: ['orders'] })).status, 403);
    assert.equal((await app.gate(as(null), { apps: ['orders'] })).status, 401);
    const page = await app.serve(as('ada@example.com', '/apps/access/people'));
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<base href="\/apps\/access\/" \/>/);
  });
}
