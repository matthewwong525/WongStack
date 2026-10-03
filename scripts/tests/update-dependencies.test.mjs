import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import {
  PIN_FILES, bumpRange, isMajor, latestInMajor, lockInSync, planPackages, readPin, rewritePins, run,
} from '../../.agents/skills/update-dependencies/scripts/update.mjs';

// ---- Pure helpers ----

test('a bump keeps the range prefix and never goes backwards', () => {
  assert.equal(bumpRange('^1.2.3', '1.4.0'), '^1.4.0');
  assert.equal(bumpRange('~7.0.2', '7.1.0'), '~7.1.0');
  assert.equal(bumpRange('12.0.0', '13.0.0'), '13.0.0');
  assert.equal(bumpRange('^2.0.0', '1.9.0'), '^2.0.0');
  assert.equal(bumpRange('>=1.0.0', '2.0.0'), null);
  assert.equal(bumpRange('^1.0.0', '2.0.0-beta.1'), null);
});

test('a new major, or a new minor below 1.0.0, is a major', () => {
  assert.equal(isMajor('^8.3.1', '^9.0.0'), true);
  assert.equal(isMajor('^1.2.0', '^1.3.0'), false);
  assert.equal(isMajor('0.3.0', '0.4.0'), true);
  assert.equal(isMajor('0.3.0', '0.3.1'), false);
  assert.equal(isMajor('latest', '1.0.0'), false);
});

test('@types/node is held to the .nvmrc major', () => {
  assert.equal(latestInMajor(['22.1.0', '22.20.4', '22.3.0', '24.0.0', '22.21.0-rc.1'], 22), '22.20.4');
  assert.equal(latestInMajor(['24.0.0'], 22), null);
  const pkg = { devDependencies: { '@types/node': '^22.1.0', vite: '^8.0.0', local: 'file:../x' } };
  const { changes, skipped } = planPackages(pkg, { '@types/node': '24.0.0', vite: '9.0.0', local: '1.0.0' }, '22.20.4');
  assert.deepEqual(changes, [
    { section: 'devDependencies', name: '@types/node', from: '^22.1.0', to: '^22.20.4', major: false },
    { section: 'devDependencies', name: 'vite', from: '^8.0.0', to: '^9.0.0', major: true },
  ]);
  assert.deepEqual(skipped, [{ name: 'local', range: 'file:../x' }]);
});

test('every OpenSpec pin, and the contributing guide prose, is rewritten', () => {
  const text = 'Use OpenSpec 1.13.2 (`npm install -g @fission-ai/openspec@1.13.2`); again @fission-ai/openspec@1.13.2.';
  assert.equal(rewritePins(text, '1.14.0', true), 'Use OpenSpec 1.14.0 (`npm install -g @fission-ai/openspec@1.14.0`); again @fission-ai/openspec@1.14.0.');
  assert.equal(readPin(rewritePins(text, '1.14.0')), '1.14.0');
  assert.match(rewritePins(text, '1.14.0'), /^Use OpenSpec 1\.13\.2/);
});

test('a lock is in sync only when its root entry names the same ranges', () => {
  const pkg = { dependencies: { a: '^1.0.0' }, devDependencies: { b: '2.0.0' } };
  assert.equal(lockInSync(pkg, { packages: { '': { ...pkg } } }), true);
  assert.equal(lockInSync(pkg, { packages: { '': { dependencies: { a: '^0.9.0' }, devDependencies: { b: '2.0.0' } } } }), false);
  assert.equal(lockInSync(pkg, { packages: { '': { dependencies: { a: '^1.0.0' } } } }), false);
  assert.equal(lockInSync(pkg, null), false);
});

// ---- The stages, against a fixture repo and fake npm, openspec, agent-browser, gh, and node ----

const NODE_INDEX = [{ version: 'v24.1.0' }, { version: 'v22.9.0' }, { version: 'v22.8.0' }];
const APP = { name: 'app', dependencies: { react: '^19.0.0' }, devDependencies: { '@types/node': '^22.1.0' } };
const TOOLS = { name: 'tests', devDependencies: { c8: '12.0.0' } };
const lockFor = pkg => `${JSON.stringify({ lockfileVersion: 3, packages: { '': pkg } }, null, 2)}\n`;

// Registry: every package's latest and versions. Installed: each fake tool's version.
const CURRENT = {
  registry: {
    '@fission-ai/openspec': '1.13.2', 'agent-browser': '0.38.1', react: '19.0.0', c8: '12.0.0',
    '@types/node': { latest: '24.0.0', versions: ['22.1.0', '24.0.0'] },
  },
  installed: { openspec: '1.13.2', 'agent-browser': '0.38.1', gh: '2.0.0', node: '22.9.0', git: '2.50.0' },
  ghLatest: '2.0.0',
};

const FAKE_NPM = `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const state = process.env.FAKE_STATE;
const read = () => JSON.parse(fs.readFileSync(path.join(state, 'state.json'), 'utf8'));
const args = process.argv.slice(2);
fs.appendFileSync(path.join(state, 'calls.log'), 'npm ' + args.join(' ') + '\\n');
const s = read();
if (args[0] === 'view') {
  const entry = s.registry[args[1]];
  if (!entry) { console.error('npm error 404 ' + args[1]); process.exit(1); }
  const latest = typeof entry === 'string' ? entry : entry.latest;
  if (args[2] === 'version') console.log(latest);
  else if (args[2] === 'versions') console.log(JSON.stringify(entry.versions ?? [latest]));
  else if (args[2] === 'repository.url') console.log('git+https://github.com/example/' + args[1].replace(/^@[^/]+\\//, '') + '.git');
  process.exit(0);
}
if (args[0] === 'install' && args[1] === '-g') {
  if (s.failGlobal) { console.error('npm error code EACCES'); console.error('npm error permission denied'); process.exit(243); }
  const at = args[2].lastIndexOf('@');
  const tool = { '@fission-ai/openspec': 'openspec', 'agent-browser': 'agent-browser' }[args[2].slice(0, at)];
  s.installed[tool] = args[2].slice(at + 1);
  fs.writeFileSync(path.join(state, 'state.json'), JSON.stringify(s));
  process.exit(0);
}
if (args[0] === 'install') {
  if (s.failInstall) { console.error('npm error code ETARGET'); console.error('npm error notarget No matching version'); process.exit(1); }
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  fs.writeFileSync('package-lock.json', JSON.stringify({ lockfileVersion: 3, packages: { '': pkg } }, null, 2) + '\\n');
  process.exit(0);
}
process.exit(97);
`;

const fakeVersion = (tool, line) => `#!/bin/sh
if [ "$1" = "api" ]; then ${process.execPath} -e 'console.log("v" + require(process.env.FAKE_STATE + "/state.json").ghLatest)'; exit 0; fi
${process.execPath} -e 'const v = require(process.env.FAKE_STATE + "/state.json").installed["${tool}"]; console.log("${line}".replace("V", v))'
`;

function git(root, ...args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
}

function write(root, file, text) {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), text);
}

function fixture(t, overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-update-dependencies-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const root = join(dir, 'repo');
  const state = join(dir, 'state');
  const bin = join(dir, 'bin');
  for (const d of [root, state, bin]) mkdirSync(d);
  const pin = '@fission-ai/openspec@1.13.2';
  const files = {
    '.nvmrc': '22\n',
    [PIN_FILES[0]]: `      - run: npm install -g ${pin}\n`,
    'server/setup.sh': `npm install -g ${pin} agent-browser\n`,
    'server/preserve.sh': `OPEN_SPEC_PACKAGE=${pin}\n`,
    '.agents/skills/save/references/preconditions.md': `| \`openspec --version\` | missing | \`npm install -g ${pin}\` |\n`,
    '.github/CONTRIBUTING.md': `Use Node.js 22 and OpenSpec 1.13.2 (\`npm install -g ${pin}\`).\n`,
    'app/package.json': `${JSON.stringify(APP, null, 2)}\n`,
    'app/package-lock.json': lockFor(APP),
    'scripts/tests/package.json': `${JSON.stringify(TOOLS, null, 2)}\n`,
    'scripts/tests/package-lock.json': lockFor(TOOLS),
    'scripts/tests/openspec-contract.test.mjs': "import test from 'node:test';\ntest('contract', () => {});\n",
  };
  for (const [file, text] of Object.entries(files)) write(root, file, text);
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'user.email', 'fixture@example.invalid');
  git(root, 'config', 'user.name', 'Fixture');
  git(root, 'add', '--all');
  git(root, 'commit', '-q', '-m', 'fixture');

  writeFileSync(join(bin, 'npm'), FAKE_NPM);
  writeFileSync(join(bin, 'openspec'), fakeVersion('openspec', 'V'));
  writeFileSync(join(bin, 'agent-browser'), fakeVersion('agent-browser', 'agent-browser V'));
  writeFileSync(join(bin, 'gh'), fakeVersion('gh', 'gh version V (2026-01-01)'));
  writeFileSync(join(bin, 'node'), fakeVersion('node', 'vV'));
  for (const tool of ['npm', 'openspec', 'agent-browser', 'gh', 'node']) chmodSync(join(bin, tool), 0o755);

  const setState = patch => writeFileSync(join(state, 'state.json'), JSON.stringify({ ...structuredClone(CURRENT), ...patch }));
  const getState = () => JSON.parse(readFileSync(join(state, 'state.json'), 'utf8'));
  setState(overrides);
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, FAKE_STATE: state };
  const calls = () => existsSync(join(state, 'calls.log')) ? readFileSync(join(state, 'calls.log'), 'utf8') : '';
  const go = async (options = {}) => {
    const lines = [];
    const code = await run({ root, env, fetchJson: async () => NODE_INDEX, log: line => lines.push(line), ...options });
    return { code, out: lines.join('\n') };
  };
  const read = file => readFileSync(join(root, file), 'utf8');
  return { root, go, read, calls, setState, getState, status: () => git(root, 'status', '--porcelain') };
}

const withRegistry = changes => ({ registry: { ...CURRENT.registry, ...changes } });

test('nothing outdated reports status: current and changes no file', async t => {
  const f = fixture(t);
  const { code, out } = await f.go();
  assert.equal(code, 0, out);
  for (const stage of ['survey', 'tools', 'openspec-pins', 'app', 'test-tools', 'contract', 'report']) assert.match(out, new RegExp(`^== ${stage}$`, 'm'));
  assert.match(out, /^status: current$/m);
  assert.doesNotMatch(out, /FAIL|needs you/);
  assert.equal(f.status(), '');
  assert.doesNotMatch(f.calls(), /npm install/);
});

test('a major is bumped, flagged, and reported with its release notes; @types/node stays on 22', async t => {
  const f = fixture(t, withRegistry({ react: '20.1.0', c8: '12.1.0' }));
  const { code, out } = await f.go();
  assert.equal(code, 0, out);
  const app = JSON.parse(f.read('app/package.json'));
  assert.equal(app.dependencies.react, '^20.1.0');
  assert.equal(app.devDependencies['@types/node'], '^22.1.0');
  assert.equal(JSON.parse(f.read('scripts/tests/package.json')).devDependencies.c8, '12.1.0');
  assert.ok(lockInSync(app, JSON.parse(f.read('app/package-lock.json'))));
  assert.match(out, /^app\/react \^19\.0\.0 -> \^20\.1\.0 \[major\]$/m);
  assert.match(out, /^status: needs-agent$/m);
  assert.match(out, /^major: app\/react \^19\.0\.0 -> \^20\.1\.0 https:\/\/github\.com\/example\/react\/releases$/m);
  assert.match(out, /^moved: scripts\/tests\/c8 12\.0\.0 -> 12\.1\.0$/m);
});

test('a held package keeps the range package.json names, and a changed range refreshes the lock', async t => {
  const f = fixture(t, withRegistry({ react: '20.0.0' }));
  const app = JSON.parse(f.read('app/package.json'));
  app.dependencies.react = '^18.0.0';
  write(f.root, 'app/package.json', `${JSON.stringify(app, null, 2)}\n`);
  const { code, out } = await f.go({ hold: ['react'] });
  assert.equal(code, 0, out);
  assert.match(out, /^app\/react held$/m);
  assert.equal(JSON.parse(f.read('app/package.json')).dependencies.react, '^18.0.0');
  assert.match(out, /^app\/package-lock\.json refreshed$/m);
  assert.doesNotMatch(f.calls(), /npm view react /);
});

test('@types/node moves only within the .nvmrc major', async t => {
  const f = fixture(t, withRegistry({ '@types/node': { latest: '24.0.0', versions: ['22.1.0', '22.5.0', '24.0.0'] } }));
  const { code, out } = await f.go();
  assert.equal(code, 0, out);
  assert.equal(JSON.parse(f.read('app/package.json')).devDependencies['@types/node'], '^22.5.0');
  assert.match(out, /^status: updated$/m);
});

test('a new OpenSpec moves all five pins together, installs the CLI, and runs the contract', async t => {
  const f = fixture(t, withRegistry({ '@fission-ai/openspec': '1.14.0' }));
  const { code, out } = await f.go();
  assert.equal(code, 0, out);
  for (const file of PIN_FILES) assert.equal(readPin(f.read(file)), '1.14.0', file);
  assert.match(f.read('.github/CONTRIBUTING.md'), /OpenSpec 1\.14\.0 /);
  assert.equal(f.getState().installed.openspec, '1.14.0');
  assert.match(out, /^openspec 1\.13\.2 -> 1\.14\.0$/m);
  assert.match(out, /^openspec 1\.14\.0 passes scripts\/tests\/openspec-contract\.test\.mjs$/m);
  assert.match(out, /^openspec: 1\.13\.2 -> 1\.14\.0$/m);
  assert.match(out, /^installed: openspec 1\.14\.0$/m);
  assert.match(out, /^status: needs-agent$/m);
});

test('a pin a previous run missed is still moved', async t => {
  const f = fixture(t);
  write(f.root, '.agents/skills/save/references/preconditions.md', '`npm install -g @fission-ai/openspec@1.12.0`\n');
  const { code, out } = await f.go();
  assert.equal(code, 0, out);
  assert.match(out, /^\.agents\/skills\/save\/references\/preconditions\.md 1\.12\.0 -> 1\.13\.2$/m);
  assert.equal(readPin(f.read('.agents/skills/save/references/preconditions.md')), '1.13.2');
});

test('a failing npm install stops with FAIL and exit 1; a rerun after the fix skips finished stages', async t => {
  const f = fixture(t, { ...withRegistry({ '@fission-ai/openspec': '1.14.0', react: '19.2.0' }), failInstall: true });
  const first = await f.go();
  assert.equal(first.code, 1, first.out);
  assert.match(first.out, /^FAIL npm install in app — npm error code ETARGET \/ npm error notarget No matching version$/m);
  assert.doesNotMatch(first.out, /== test-tools|== contract|== report/);
  assert.equal(JSON.parse(f.read('app/package.json')).dependencies.react, '^19.2.0');

  f.setState({ ...f.getState(), failInstall: false });
  writeFileSync(join(dirname(f.root), 'state', 'calls.log'), '');
  const second = await f.go();
  assert.equal(second.code, 0, second.out);
  assert.match(second.out, /^openspec current$/m);
  assert.match(second.out, /^openspec pins current \(1\.14\.0\)$/m);
  assert.match(second.out, /^app\/package-lock\.json refreshed$/m);
  assert.match(second.out, /^scripts\/tests current$/m);
  assert.doesNotMatch(f.calls(), /install -g/);
  assert.match(second.out, /^openspec 1\.14\.0 passes/m, 'the contract still runs for a move since HEAD');
  assert.match(second.out, /^moved: app\/react \^19\.0\.0 -> \^19\.2\.0$/m);
});

test('a global install without rights asks the person and fails', async t => {
  const f = fixture(t, { ...withRegistry({ 'agent-browser': '0.39.0' }), failGlobal: true });
  const { code, out } = await f.go();
  assert.equal(code, 1);
  assert.match(out, /^needs you: npm install -g agent-browser@0\.39\.0 needs admin rights$/m);
  assert.match(out, /^FAIL npm install -g agent-browser@0\.39\.0 — /m);
});

test('gh and node behind are handed to the person, not failed', async t => {
  const f = fixture(t, { ghLatest: '2.1.0' });
  f.setState({ ...f.getState(), installed: { ...f.getState().installed, node: '22.8.0' } });
  const { code, out } = await f.go();
  assert.equal(code, 0, out);
  assert.match(out, /^needs you: gh 2\.0\.0 -> 2\.1\.0: update it with the system package manager$/m);
  assert.match(out, /^needs you: node 22\.8\.0 -> 22\.9\.0: update it with the system package manager$/m);
  assert.match(out, /^status: needs-agent$/m);
});

test('a failed lookup fails the survey and names the command', async t => {
  const f = fixture(t);
  const failing = await f.go({ fetchJson: async () => { throw new Error('offline'); } });
  assert.equal(failing.code, 1);
  assert.match(failing.out, /^FAIL fetch https:\/\/nodejs\.org\/dist\/index\.json — offline$/m);
  const state = f.getState();
  delete state.registry.c8;
  f.setState(state);
  const missing = await f.go();
  assert.match(missing.out, /^FAIL npm view c8 version — npm error 404 c8$/m);
});

test('--dry-run prints what every stage would change and writes nothing', async t => {
  const f = fixture(t, withRegistry({ '@fission-ai/openspec': '1.14.0', react: '20.0.0' }));
  const { code, out } = await f.go({ dryRun: true });
  assert.equal(code, 0, out);
  assert.match(out, /^would run npm install -g @fission-ai\/openspec@1\.14\.0$/m);
  assert.match(out, /^would move \.github\/workflows\/payload\.yml 1\.13\.2 -> 1\.14\.0$/m);
  assert.match(out, /^would move react \^19\.0\.0 -> \^20\.0\.0 \[major\]$/m);
  assert.match(out, /^would run npm install in app$/m);
  assert.match(out, /^would run node --test scripts\/tests\/openspec-contract\.test\.mjs against openspec 1\.14\.0$/m);
  assert.match(out, /^dry run: nothing written$/m);
  assert.equal(f.status(), '');
  assert.doesNotMatch(f.calls(), /npm install/);
});
