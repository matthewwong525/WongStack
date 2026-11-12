// Each module installed alone: its files placed by the manifest's mapped entries in an empty repo, and its own check.
// wiki/maintaining/adding-a-module.md
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { INVENTORY, installPath, installsAsText, installText, mappedDirs } from '../../.agents/skills/wong-sync/scripts/install-path.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const STAND_IN = pathToFileURL(join(repo, 'scripts/tests/fixtures/memory/stand-in-store.mjs')).href;
const load = (folder, path) => import(pathToFileURL(join(folder, path)).href);
const mapped = mappedDirs(JSON.parse(readFileSync(join(repo, INVENTORY), 'utf8')));
const SLOTS = ['look', 'wakeChat', 'inbox', 'keyFiles', 'sendKey'];
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|new URL\(\s*)['"](\.{1,2}(?:\/[^'"]*)?)['"]/g;
// A Markdown link or reference definition; fenced code and code spans are blanked first, as examples are not links.
const DOC_LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)|^ {0,3}\[[^\]]+\]:[ \t]*<?([^\s>]+)>?/gm;

const scratch = mkdtempSync(join(tmpdir(), 'wong-test-module-install-'));
after(() => rmSync(scratch, { recursive: true, force: true }));
const modules = readdirSync(join(repo, '.agents/plugins'), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name);

// A chat's own folders, so no test reads the machine's real memory, chats, or saves.
function sandbox(name) {
  const home = join(scratch, `${name}-home`);
  const env = { ...process.env, HOME: home, XDG_DATA_HOME: join(home, 'data'), WONG_MEMORY_STATE_DIR: join(home, 'state'),
    WONG_MEMORY_CLAUDE_HOME: join(home, 'claude'), WONG_MEMORY_CODEX_HOME: join(home, 'codex'), WONG_MEMORY_NO_HEADLESS: '1',
    WONG_SAVE_STATE_DIR: join(home, 'saves'), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_AUTHOR_NAME: 'Dev', GIT_AUTHOR_EMAIL: 'dev@example.com', GIT_COMMITTER_NAME: 'Dev', GIT_COMMITTER_EMAIL: 'dev@example.com' };
  delete env.WONG_MEMORY_PROFILE;
  delete env.WONG_LOOP_PROFILE;
  delete env.WONG_BROWSER_PROFILE;
  return { home, env };
}

// Each module's own check, loaded from its installed copy; the function it returns registers the check's tests.
const CHECKS = {
  memory: async ({ folder, root }) => {
    const { checkStore } = await import(pathToFileURL(join(folder, 'store/contract.mjs')).href);
    const { standInStore } = await import(STAND_IN);
    return () => {
      checkStore(standInStore, 'memory installed alone');
      test('memory starts a chat in a repo that has nothing else', () => {
        const { env } = sandbox('memory');
        const start = spawnSync(process.execPath, [join(folder, 'scripts/session-start.mjs')], { cwd: root, env, encoding: 'utf8', input: '{"session_id":"alone-1"}' });
        assert.equal(start.status, 0, start.stderr);
        assert.match(start.stdout, /^# Memory digest\n[\s\S]*Code: billing/);
        assert.doesNotMatch(start.stdout, /skipped/);
      });
    };
  },
  access: async ({ folder, root }) => {
    const { checkStore } = await load(folder, 'store/contract.mjs');
    const { standInStore } = await load(folder, 'store/stand-in.mjs');
    return () => {
      checkStore(standInStore, 'access installed alone');
      test('access asks once at chat start in a repo that has nothing else', () => {
        const { env } = sandbox('access');
        const start = spawnSync(process.execPath, [join(folder, 'scripts/session-start.mjs')], { cwd: root, env, encoding: 'utf8', input: '{"session_id":"alone-1","source":"startup"}' });
        assert.equal(start.status, 0, start.stderr);
        assert.match(start.stdout, /^Access is not set up in this repo\. Ask the person "Access isn't set up yet\. Set it up now\?"/);
      });
    };
  },
  // The loop with no profile, so every slot is empty, and a gh that can not run: the local route.
  loop: async ({ root, files }) => () => {
    const { home, env } = sandbox('loop');
    mkdirSync(join(home, 'bin'), { recursive: true });
    writeFileSync(join(home, 'bin/gh'), '#!/bin/sh\nexit 1\n');
    chmodSync(join(home, 'bin/gh'), 0o755);
    env.PATH = `${join(home, 'bin')}:${process.env.PATH}`;
    const run = (script, args) => spawnSync(process.execPath, [join(root, '.claude/skills', script), ...args], { cwd: root, env, encoding: 'utf8' });

    test('loop names no source module path once installed', () => {
      const left = files.filter(file => installsAsText(file) && readFileSync(join(root, file), 'utf8').includes('.claude/plugins/'));
      assert.deepEqual(left, [], 'a path the install rewrite missed: use $(git rev-parse --show-toplevel)/ or node before it');
    });

    test('loop builds a plan page whose link is its own file', () => {
      const change = join(root, 'openspec/changes/sample');
      mkdirSync(change, { recursive: true });
      writeFileSync(join(change, 'proposal.md'), '# Sample\n\n## Why\n\nA reason.\n\n## What Changes\n\n- **One thing** changes.\n');
      const out = run('plan/scripts/build-review.mjs', [change, '--require-current', '--link']);
      assert.equal(out.status, 0, out.stderr);
      assert.match(out.stdout, new RegExp(`\\]\\(${join(change, 'review.html').replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}\\)`));
      assert.doesNotMatch(out.stdout, /https:/);
    });

    test('loop saves a commit on this computer and pushes nothing', () => {
      const git = (...args) => execFileSync('git', args, { cwd: root, env, encoding: 'utf8' }).trim();
      git('add', '-A');
      git('commit', '-q', '-m', 'base');
      git('switch', '-q', '-c', 'work');
      writeFileSync(join(root, 'note.txt'), 'one\n');
      git('add', 'note.txt');
      writeFileSync(join(home, 'message.txt'), 'feat: a note\n');
      writeFileSync(join(home, 'summary.md'), 'A note.\n');
      const out = run('save/scripts/checkpoint.mjs', ['--message-file', join(home, 'message.txt'), '--summary-file', join(home, 'summary.md')]);
      assert.equal(out.status, 0, `${out.stdout}${out.stderr}`);
      assert.match(out.stdout, /^SAVE_GATE_RESULT=LOCAL$/m);
      assert.equal(git('log', '-1', '--format=%s'), 'feat: a note');
      assert.equal(git('remote'), '', 'nothing to push to');
    });
  },
  // Daily with no profile: both its folders, the start-of-chat ask, and its check; a PATH with node and git only,
  // so no `paseo` is found unless a test adds one.
  daily: async ({ folder, root }) => () => {
    const home = join(scratch, 'daily-home'), bin = join(scratch, 'daily-bin');
    execFileSync('git', ['-C', root, 'config', 'user.email', 'dev@example.com']);
    mkdirSync(bin);
    for (const tool of ['node', 'git']) symlinkSync(execFileSync('which', [tool], { encoding: 'utf8' }).trim(), join(bin, tool));
    const script = (file, args, input, extra) => spawnSync(process.execPath, [join(folder, 'scripts', file), ...args],
      { cwd: root, env: { HOME: home, PATH: bin, WONG_DAILY_WORKER: '0', ...extra }, encoding: 'utf8', input });

    test('daily asks once at a new chat\'s start in a repo with no settings, and not on a resume', () => {
      const start = script('session-start.mjs', ['--agent', 'claude'], JSON.stringify({ source: 'startup', session_id: 'a', cwd: root }));
      assert.equal(start.status, 0, start.stderr);
      assert.match(start.stdout, /^Daily isn't set up yet\. Ask the person whether to set it up now/);
      assert.equal(start.stdout.trim().split('\n').length, 1);
      const resumed = script('session-start.mjs', ['--agent', 'claude'], JSON.stringify({ source: 'resume', session_id: 'a', cwd: root }));
      assert.equal(resumed.stdout, '');
    });

    const check = extra => {
      const ran = script('daily.mjs', ['check'], '', extra);
      assert.equal(ran.status, 0, ran.stderr);
      const result = JSON.parse(ran.stdout);
      assert.equal(result.status, 'ok');
      return result.store;
    };
    test('daily\'s check passes with no profile: schedules are off with no Paseo', () => assert.equal(check(), 'off'));
    test('daily\'s check passes with no profile: schedules go to Paseo when Paseo is on the PATH', () => {
      const withPaseo = join(scratch, 'daily-paseo');
      mkdirSync(withPaseo, { recursive: true });
      writeFileSync(join(withPaseo, 'paseo'), '#!/bin/sh\necho "[]"\n');
      chmodSync(join(withPaseo, 'paseo'), 0o755);
      assert.equal(check({ PATH: `${withPaseo}:${bin}` }), 'paseo');
    });
    test('daily\'s check uses the profile\'s schedule store', () => {
      const profile = join(scratch, 'daily-profile.mjs');
      writeFileSync(profile, "export default { schedules: { name: 'app' } };\n");
      assert.equal(check({ WONG_DAILY_PROFILE: profile }), 'app');
    });

    test('daily\'s Stop hook waits at least 300 seconds for the check-in', () => {
      for (const file of ['claude.json', 'codex.json']) {
        const { Stop } = JSON.parse(readFileSync(join(folder, 'hooks', file), 'utf8')).hooks;
        const stop = Stop.flatMap(group => group.hooks).find(hook => hook.command.includes('stop-check.mjs'));
        assert.ok(stop.timeout >= 300, file);
      }
    });
  },
  // The browser's three folders with no profile, so every slot is empty, then with one that fills each.
  browser: async ({ root }) => () => {
    const node = (env, script, ...args) => spawnSync(process.execPath, [join(root, '.agents/skills', script), ...args], { cwd: root, env, encoding: 'utf8' });
    test('browser: the setup guide\'s check passes with no profile, and every slot is empty', () => {
      const { env } = sandbox('browser');
      for (const args of [['browser/scripts/browse.mjs', 'status'], ['hand-over/scripts/details.mjs', 'list'], ['hand-over/scripts/hand-over.mjs', '--help']]) {
        const out = node(env, ...args);
        assert.equal(out.status, 0, `${args.join(' ')}: ${out.stderr}`);
      }
      assert.deepEqual(JSON.parse(slots(root, env)), { look: null, wakeChat: null, inbox: null, keyFiles: [{ file: '.env' }], sendKey: null });
    });

    test('browser: a profile at .agents/browser/profile.mjs fills each slot', () => {
      mkdirSync(join(root, '.agents/browser'), { recursive: true });
      writeFileSync(join(root, '.agents/browser/profile.mjs'), `export default {
  look: () => ({ css: 'stub', themeJs: '' }),
  wakeChat: () => 'notified',
  inbox: { companyFor: async () => null },
  keyFiles: () => [{ file: 'keys.env', names: () => '' }],
  sendKey: async () => null,
};
`);
      const filled = JSON.parse(slots(root, sandbox('browser').env));
      assert.deepEqual(filled, { look: 'function', wakeChat: 'function', inbox: 'object', keyFiles: [{ file: 'keys.env' }], sendKey: 'function' });
      rmSync(join(root, '.agents/browser'), { recursive: true });
    });
  },
};

/** Each browser slot's type as the installed module loads it, and the key files it routes to. */
function slots(root, env) {
  const lib = pathToFileURL(join(root, '.agents/skills/browser/scripts/lib/profile.mjs')).href;
  const keys = pathToFileURL(join(root, '.agents/skills/hand-over/scripts/keys.mjs')).href;
  const probe = `const { slot } = await import('${lib}'); const { keyFiles } = await import('${keys}');
const out = {};
for (const name of ${JSON.stringify(SLOTS)}) { const part = await slot(name); out[name] = part === null ? null : typeof part; }
out.keyFiles = (await keyFiles({ root: process.cwd() })).map(({ file }) => ({ file }));
console.log(JSON.stringify(out));`;
  const out = spawnSync(process.execPath, ['--input-type=module', '-e', probe], { cwd: root, env, encoding: 'utf8' });
  assert.equal(out.status, 0, out.stderr);
  return out.stdout;
}

/** Every relative import or file URL in the module's scripts that resolves outside it; Daily's two folders are one. */
function outsideImports(folder) {
  const files = readdirSync(folder, { recursive: true }).filter(path => /\.m?js$/.test(path));
  return files.flatMap(file => [...readFileSync(join(folder, file), 'utf8').matchAll(SPECIFIER)]
    .map(match => [file, match[1]])
    .filter(([, specifier]) => relative(folder, resolve(folder, dirname(file), specifier)).startsWith('..'))
    .map(([path, specifier]) => `${path} → ${specifier}`));
}

/** Every relative Markdown link in the module's docs that leaves it; web, mail, and in-page links pass. */
function outsideDocLinks(folder) {
  const blank = text => text.replace(/[^\n]/g, ' ');
  const files = readdirSync(folder, { recursive: true }).filter(path => path.endsWith('.md'));
  return files.flatMap(file => [...readFileSync(join(folder, file), 'utf8').replace(/(`{3,}|~{3,})[\s\S]*?\1/g, blank)
    .replace(/`[^`\n]*`/g, blank).matchAll(DOC_LINK)]
    .map(match => match[1] ?? match[2])
    .filter(link => !/^([a-z][a-z0-9+.-]*:|#)/i.test(link))
    .filter(link => relative(folder, resolve(folder, dirname(file), decodeURI(link.split('#')[0]))).startsWith('..'))
    .map(link => `${file} → ${link}`));
}

/** Every relative import or file URL in the installed files that names no file there. */
function brokenImports(root, files) {
  return files.flatMap(file => [...readFileSync(join(root, file), 'utf8').matchAll(SPECIFIER)]
    .filter(match => !existsSync(resolve(root, dirname(file), match[1])))
    .map(match => `${file} → ${match[1]}`));
}

// An empty git repo holding only the module, each file where the manifest maps it, and a profile on the stand-in store.
function installAlone(name) {
  const root = join(scratch, name);
  execFileSync('git', ['init', '-q', '-b', 'main', root]);
  symlinkSync('.agents', join(root, '.claude'));
  const source = join(repo, '.agents/plugins', name);
  const files = readdirSync(source, { recursive: true }).map(path => `.agents/plugins/${name}/${path}`)
    .filter(path => statSync(join(repo, path)).isFile())
    .map(path => {
      const to = installPath(path.replace(/^\.agents/, '.claude'), mapped).replace(/^\.claude/, '.agents');
      mkdirSync(dirname(join(root, to)), { recursive: true });
      const raw = readFileSync(join(repo, path));
      writeFileSync(join(root, to), installsAsText(path) ? installText(path, raw.toString('utf8'), mapped) : raw);
      chmodSync(join(root, to), statSync(join(repo, path)).mode);
      return to;
    });
  mkdirSync(join(root, '.agents/memory'), { recursive: true });
  writeFileSync(join(root, '.agents/memory/profile.mjs'), `import { standInStore } from '${STAND_IN}';
const store = standInStore();
export default {
  connect: () => store.as({ role: 'member', subject: 'dev', email: 'dev@example.com' }),
  topics: () => [{ kind: 'code', tag: 'billing', summary: 'How billing works.' }],
  sessionStart: () => {}, // returns nothing: the chat start still prints the digest
};
`);
  return { root, files };
}

// Loaded before any test is registered, so every test joins the run.
const installs = await Promise.all(modules.map(async name => {
  const { root, files } = installAlone(name);
  const folder = join(root, '.agents/skills', name);
  return { name, root, folder, files, check: await CHECKS[name]?.({ folder, root, files }) };
}));

for (const { name, root, files, check } of installs) {
  test(`${name} has its own check here`, () => assert.ok(check, `add ${name}'s check to CHECKS`));
  check?.();

  test(`${name} imports nothing outside its own folder`, () => {
    assert.deepEqual(outsideImports(join(repo, '.agents/plugins', name)), []);
  });

  test(`${name}'s docs link nothing outside its own folder`, () => {
    assert.deepEqual(outsideDocLinks(join(repo, '.agents/plugins', name)), [], 'link a WongStack-only page by its full https address');
  });

  test(`${name} installed by the mapped entries still finds every file it imports`, () => {
    assert.deepEqual(brokenImports(root, files.filter(file => /\.m?js$/.test(file))), []);
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
