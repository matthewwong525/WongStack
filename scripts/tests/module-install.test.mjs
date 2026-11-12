// Each module installed alone: its folder copied into an empty repo, a minimal profile, a chat start, and its check.
// wiki/maintaining/adding-a-module.md
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const STAND_IN = pathToFileURL(join(repo, 'scripts/tests/fixtures/memory/stand-in-store.mjs')).href;
// Each module's own check, loaded from its installed copy; the function it returns registers the check's tests.
const CHECKS = {
  memory: async folder => {
    const { checkStore } = await import(pathToFileURL(join(folder, 'store/contract.mjs')).href);
    const { standInStore } = await import(STAND_IN);
    return () => checkStore(standInStore, 'memory installed alone');
  },
};
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|new URL\(\s*)['"](\.{1,2}(?:\/[^'"]*)?)['"]/g;

const scratch = mkdtempSync(join(tmpdir(), 'wong-test-module-install-'));
after(() => rmSync(scratch, { recursive: true, force: true }));
const plugins = readdirSync(join(repo, '.agents/plugins'), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name);
/** A module of several folders, such as Daily's, lists them in its `module.json`; null for a one-folder module. */
const foldersOf = name => readdirSync(join(repo, '.agents/plugins', name)).map(each => join(repo, '.agents/plugins', name, each, 'module.json'))
  .filter(existsSync).map(file => JSON.parse(readFileSync(file, 'utf8')).folders)[0] ?? null;
const modules = plugins.filter(name => !foldersOf(name));

/** Every relative import or file URL in the folder's scripts that resolves outside the folder and its `siblings`. */
function outsideImports(folder, siblings = [folder]) {
  const files = readdirSync(folder, { recursive: true }).filter(path => /\.m?js$/.test(path));
  return files.flatMap(file => [...readFileSync(join(folder, file), 'utf8').matchAll(SPECIFIER)]
    .map(match => [file, match[1]])
    .filter(([, specifier]) => siblings.every(each => relative(each, resolve(folder, dirname(file), specifier)).startsWith('..')))
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
    const home = join(scratch, `${name}-home`);
    const env = { ...process.env, HOME: home, XDG_DATA_HOME: join(home, 'data'), WONG_MEMORY_STATE_DIR: join(home, 'state'),
      WONG_MEMORY_CLAUDE_HOME: join(home, 'claude'), WONG_MEMORY_CODEX_HOME: join(home, 'codex'), WONG_MEMORY_NO_HEADLESS: '1' };
    delete env.WONG_MEMORY_PROFILE;
    const start = spawnSync(process.execPath, [join(folder, 'scripts/session-start.mjs')], { cwd: root, env, encoding: 'utf8', input: '{"session_id":"alone-1"}' });
    assert.equal(start.status, 0, start.stderr);
    assert.match(start.stdout, /^# Memory digest\n[\s\S]*Code: billing/);
    assert.doesNotMatch(start.stdout, /skipped/);
  });
}

// Daily alone: both its folders in an empty repo with no profile, the start-of-chat ask, and its check.
for (const name of plugins.filter(foldersOf)) {
  const root = join(scratch, name), home = join(scratch, `${name}-home`), bin = join(scratch, `${name}-bin`);
  execFileSync('git', ['init', '-q', '-b', 'main', root]);
  execFileSync('git', ['-C', root, 'config', 'user.email', 'dev@example.com']);
  const folders = foldersOf(name).map(each => {
    cpSync(join(repo, '.agents/plugins', name, each), join(root, '.agents/skills', each), { recursive: true });
    return join(root, '.agents/skills', each);
  });
  // A PATH with node and git only, so no `paseo` is found unless a test adds one.
  mkdirSync(bin);
  for (const tool of ['node', 'git']) symlinkSync(execFileSync('which', [tool], { encoding: 'utf8' }).trim(), join(bin, tool));
  const env = extra => ({ HOME: home, PATH: bin, WONG_DAILY_WORKER: '0', ...extra });
  const script = (file, args, input, extra) => spawnSync(process.execPath, [join(folders[0], 'scripts', file), ...args],
    { cwd: root, env: env(extra), encoding: 'utf8', input });

  test(`${name} imports nothing outside its own folders`, () => {
    assert.deepEqual(folders.flatMap(folder => outsideImports(folder, folders)), []);
  });

  test(`${name} asks once at a new chat's start in a repo with no settings, and not on a resume`, () => {
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
  test(`${name}'s check passes with no profile: schedules are off with no Paseo`, () => assert.equal(check(), 'off'));
  test(`${name}'s check passes with no profile: schedules go to Paseo when Paseo is on the PATH`, () => {
    const withPaseo = join(scratch, `${name}-paseo`);
    mkdirSync(withPaseo, { recursive: true });
    writeFileSync(join(withPaseo, 'paseo'), '#!/bin/sh\necho "[]"\n');
    chmodSync(join(withPaseo, 'paseo'), 0o755);
    assert.equal(check({ PATH: `${withPaseo}:${bin}` }), 'paseo');
  });
  test(`${name}'s check uses the profile's schedule store`, () => {
    const profile = join(scratch, `${name}-profile.mjs`);
    writeFileSync(profile, "export default { schedules: { name: 'app' } };\n");
    assert.equal(check({ WONG_DAILY_PROFILE: profile }), 'app');
  });

  test(`${name}'s Stop hook waits at least 300 seconds for the check-in`, () => {
    for (const file of ['claude.json', 'codex.json']) {
      const { Stop } = JSON.parse(readFileSync(join(folders[0], 'hooks', file), 'utf8')).hooks;
      const stop = Stop.flatMap(group => group.hooks).find(hook => hook.command.includes('stop-check.mjs'));
      assert.ok(stop.timeout >= 300, file);
    }
  });
}
