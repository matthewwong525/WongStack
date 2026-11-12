// Each module installed alone: its folders copied into an empty repo, a minimal profile, and its check.
// wiki/maintaining/adding-a-module.md
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const STAND_IN = pathToFileURL(join(repo, 'scripts/tests/fixtures/memory/stand-in-store.mjs')).href;
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|new URL\(\s*)['"](\.{1,2}(?:\/[^'"]*)?)['"]/g;
const SLOTS = ['look', 'wakeChat', 'inbox', 'keyFiles', 'sendKey'];

const scratch = mkdtempSync(join(tmpdir(), 'wong-test-module-install-'));
after(() => rmSync(scratch, { recursive: true, force: true }));
const modules = readdirSync(join(repo, '.agents/plugins'), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name);

/** A module's install folders by source folder: those its `module.json` names, else the whole module as one. */
function foldersOf(name) {
  const manifest = join(repo, '.agents/plugins', name, name, 'module.json');
  const folders = existsSync(manifest) ? JSON.parse(readFileSync(manifest, 'utf8')).folders : null;
  return folders ? folders.map(folder => [`${name}/${folder}`, folder]) : [[name, name]];
}

/** Every relative import or file URL in the folders' scripts that resolves outside all of them. */
function outsideImports(folders) {
  const inside = path => folders.some(folder => !relative(folder, path).startsWith('..'));
  return folders.flatMap(folder => readdirSync(folder, { recursive: true }).filter(path => /\.m?js$/.test(path))
    .flatMap(file => [...readFileSync(join(folder, file), 'utf8').matchAll(SPECIFIER)]
      .filter(match => !inside(resolve(folder, dirname(file), match[1])))
      .map(match => `${relative(dirname(folder), join(folder, file))} → ${match[1]}`)));
}

const node = (root, env, script, ...args) => spawnSync(process.execPath, [join(root, '.agents/skills', script), ...args], { cwd: root, env, encoding: 'utf8' });
/** A HOME of the install's own, so no check reads this computer's browser, details, or memory. */
function homeEnv(name, extra = {}) {
  const home = join(scratch, `${name}-home`);
  mkdirSync(home, { recursive: true });
  const env = { ...process.env, HOME: home, ...extra };
  for (const key of ['WONG_MEMORY_PROFILE', 'WONG_BROWSER_PROFILE']) delete env[key];
  return env;
}

// Each module's own check: the function it returns registers the check's tests on the installed copy.
const CHECKS = {
  memory: async ({ root, folder }) => {
    const { checkStore } = await import(pathToFileURL(join(folder, 'store/contract.mjs')).href);
    const { standInStore } = await import(STAND_IN);
    mkdirSync(join(root, '.agents/memory'), { recursive: true });
    writeFileSync(join(root, '.agents/memory/profile.mjs'), `import { standInStore } from '${STAND_IN}';
const store = standInStore();
export default {
  connect: () => store.as({ role: 'member', subject: 'dev', email: 'dev@example.com' }),
  topics: () => [{ kind: 'code', tag: 'billing', summary: 'How billing works.' }],
  sessionStart: () => {}, // returns nothing: the chat start still prints the digest
};
`);
    return () => {
      checkStore(standInStore, 'memory installed alone');
      test('memory starts a chat in a repo that has nothing else', () => {
        const home = join(scratch, 'memory-home');
        const env = homeEnv('memory', { XDG_DATA_HOME: join(home, 'data'), WONG_MEMORY_STATE_DIR: join(home, 'state'),
          WONG_MEMORY_CLAUDE_HOME: join(home, 'claude'), WONG_MEMORY_CODEX_HOME: join(home, 'codex'), WONG_MEMORY_NO_HEADLESS: '1' });
        const start = spawnSync(process.execPath, [join(root, '.agents/skills/memory/scripts/session-start.mjs')], { cwd: root, env, encoding: 'utf8', input: '{"session_id":"alone-1"}' });
        assert.equal(start.status, 0, start.stderr);
        assert.match(start.stdout, /^# Memory digest\n[\s\S]*Code: billing/);
        assert.doesNotMatch(start.stdout, /skipped/);
      });
    };
  },
  browser: async ({ root }) => () => {
    test('browser: the setup guide\'s check passes with no profile, and every slot is empty', () => {
      const env = homeEnv('browser');
      for (const args of [['browser/scripts/browse.mjs', 'status'], ['hand-over/scripts/details.mjs', 'list'], ['hand-over/scripts/hand-over.mjs', '--help']]) {
        const out = node(root, env, ...args);
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
      const filled = JSON.parse(slots(root, homeEnv('browser')));
      assert.deepEqual(filled, { look: 'function', wakeChat: 'function', inbox: 'object', keyFiles: [{ file: 'keys.env' }], sendKey: 'function' });
      rmSync(join(root, '.agents/browser'), { recursive: true });
    });
  },
};

/** Each slot's type as the installed module loads it, and the key files it routes to, from a child in the repo. */
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

// An empty git repo holding only the module's folders, each a real folder in the skills folder.
function installAlone(name) {
  const root = join(scratch, name);
  execFileSync('git', ['init', '-q', '-b', 'main', root]);
  const folders = foldersOf(name).map(([from, to]) => {
    cpSync(join(repo, '.agents/plugins', from), join(root, '.agents/skills', to), { recursive: true });
    return join(root, '.agents/skills', to);
  });
  return { root, folders };
}

// Loaded before any test is registered, so every test joins the run.
const installs = await Promise.all(modules.map(async name => {
  const { root, folders } = installAlone(name);
  return { name, folders, check: await CHECKS[name]?.({ root, folder: folders[0] }) };
}));

for (const { name, folders, check } of installs) {
  test(`${name} has its own check here`, () => assert.ok(check, `add ${name}'s check to CHECKS`));
  check?.();

  test(`${name} imports nothing outside its own folders`, () => {
    assert.deepEqual(outsideImports(folders), []);
  });
}
