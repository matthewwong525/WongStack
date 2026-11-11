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
