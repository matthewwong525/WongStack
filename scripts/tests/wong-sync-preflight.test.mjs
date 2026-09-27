import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { preflight } from '../../.agents/skills/wong-sync/scripts/preflight.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const canonicalHelper = join(repo, '.agents/skills/wong-sync/scripts/preflight.mjs');
const aliasHelper = join(repo, '.claude/skills/wong-sync/scripts/preflight.mjs');

function run(cwd, command, args, options = {}) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', ...options });
  if (result.status !== 0 && !options.allowFailure) {
    assert.fail(`${command} ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return result;
}

function git(cwd, ...args) {
  return run(cwd, 'git', args).stdout.trim();
}

function write(root, path, content) {
  const absolute = join(root, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
}

function inventory(overrides = {}) {
  return {
    core: { skillDirs: ['alpha'], files: ['plain.txt'], blocks: [] },
    ui: { files: ['wiki/ux-principles.md'] },
    pack: { files: ['pack.txt'] },
    scaffold: { dirs: ['app'], exclude: ['app/wrangler.jsonc'] },
    seededBySetup: { files: [] },
    ...overrides,
  };
}

function fixture(t, { manifest = inventory(), components = { skills: ['alpha'] }, targetFiles = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'wong-sync-preflight-'));
  const source = join(root, 'source');
  const target = join(root, 'target');
  mkdirSync(source);
  mkdirSync(target);
  t.after(() => rmSync(root, { recursive: true, force: true }));

  git(source, 'init', '-b', 'main');
  git(source, 'config', 'user.email', 'fixture@example.test');
  git(source, 'config', 'user.name', 'Fixture');
  write(source, '.agents/skills/wong-sync/references/payload-files.json', `${JSON.stringify(manifest, null, 2)}\n`);
  write(source, '.agents/skills/alpha/SKILL.md', 'alpha base\n');
  write(source, 'plain.txt', 'plain base\n');
  write(source, 'wiki/ux-principles.md', 'ui base\n');
  write(source, 'pack.txt', 'pack base\n');
  write(source, 'app/index.txt', 'app base\n');
  write(source, 'app/wrangler.jsonc', 'excluded base\n');
  write(source, 'VERSION', '1.0.0\n');
  write(source, 'CLAUDE.md', 'source header\n<!-- WONG-STACK:BEGIN -->\nblock base\n<!-- WONG-STACK:END -->\nsource footer\n');
  git(source, 'add', '.');
  git(source, 'commit', '-m', 'base');
  const base = git(source, 'rev-parse', 'HEAD');

  const defaults = {
    '.claude/skills/alpha/SKILL.md': 'alpha base\n',
    'plain.txt': 'plain base\n',
    'wiki/ux-principles.md': 'ui base\n',
    'pack.txt': 'pack base\n',
    'app/index.txt': 'app base\n',
    'CLAUDE.md': 'target header changed\n<!-- WONG-STACK:BEGIN -->\nblock base\n<!-- WONG-STACK:END -->\ntarget footer changed\n',
    ...targetFiles,
  };
  for (const [path, content] of Object.entries(defaults)) write(target, path, content);
  const record = {
    version: '1.0.0',
    commit: base,
    components,
    upstream: { repo: 'https://example.test/WongStack', clone: source },
  };
  write(target, '.claude/.wong-stack.json', `${JSON.stringify(record, null, 2)}\n`);
  git(target, 'init', '-b', 'main');
  git(target, 'config', 'user.email', 'fixture@example.test');
  git(target, 'config', 'user.name', 'Fixture');
  git(target, 'add', '.');
  git(target, 'commit', '-m', 'target');

  const commit = message => {
    git(source, 'add', '-A');
    git(source, 'commit', '-m', message);
    return git(source, 'rev-parse', 'HEAD');
  };
  const updateRecord = patch => {
    Object.assign(record, patch);
    write(target, '.claude/.wong-stack.json', `${JSON.stringify(record, null, 2)}\n`);
  };
  const inspect = options => preflight({ target, source, record: '.claude/.wong-stack.json', ...options });
  return { root, source, target, base, record, commit, updateRecord, inspect };
}

test('a selected no-op is current and leaves the target worktree and index unchanged', t => {
  const f = fixture(t);
  const status = git(f.target, 'status', '--porcelain=v1');
  const index = readFileSync(join(f.target, '.git/index'));
  const report = f.inspect();
  assert.equal(report.status, 'current');
  assert.equal(report.selection.changedUnits, 0);
  assert.deepEqual(report.changes, []);
  assert.equal(git(f.target, 'status', '--porcelain=v1'), status);
  assert.deepEqual(readFileSync(join(f.target, '.git/index')), index);
});

test('one changed file classifies installed, latest, adapted, and missing target states', t => {
  const f = fixture(t);
  write(f.source, '.agents/skills/alpha/SKILL.md', 'alpha latest\n');
  f.commit('change alpha');

  assert.equal(f.inspect().changes.find(change => change.sourcePath.endsWith('alpha/SKILL.md')).localState, 'installed-equivalent');
  write(f.target, '.claude/skills/alpha/SKILL.md', 'alpha latest\n');
  assert.equal(f.inspect().changes.find(change => change.sourcePath.endsWith('alpha/SKILL.md')).localState, 'latest-equivalent');
  write(f.target, '.claude/skills/alpha/SKILL.md', 'local authored content\n');
  assert.equal(f.inspect().changes.find(change => change.sourcePath.endsWith('alpha/SKILL.md')).localState, 'locally-adapted');
  rmSync(join(f.target, '.claude/skills/alpha/SKILL.md'));
  assert.equal(f.inspect().changes.find(change => change.sourcePath.endsWith('alpha/SKILL.md')).localState, 'missing');
});

test('directory expansion detects additions and removals while exclusions stay out', t => {
  const manifest = inventory({ core: { dirs: ['docs'], exclude: ['docs/skip'] } });
  const f = fixture(t, { manifest, targetFiles: { 'docs/old.md': 'old\n', 'docs/skip/private.md': 'private base\n' } });
  write(f.source, 'docs/old.md', 'old\n');
  write(f.source, 'docs/skip/private.md', 'private base\n');
  f.commit('add base directory files');
  f.updateRecord({ commit: git(f.source, 'rev-parse', 'HEAD') });
  git(f.target, 'add', '.claude/.wong-stack.json', 'docs');
  git(f.target, 'commit', '-m', 'record directory base');

  rmSync(join(f.source, 'docs/old.md'));
  write(f.source, 'docs/new.md', 'new\n');
  write(f.source, 'docs/skip/private.md', 'private latest\n');
  f.commit('change directory');
  const report = f.inspect();
  assert.deepEqual(report.changes.map(change => [change.sourcePath, change.operation]), [
    ['docs/new.md', 'added'],
    ['docs/old.md', 'removed'],
  ]);
});

test('every category is selected, and old component flags are ignored', t => {
  const f = fixture(t, { components: { skills: ['alpha'], stackPack: false, appScaffold: false, ui: false } });
  write(f.source, 'pack.txt', 'pack latest\n');
  write(f.source, 'app/index.txt', 'app latest\n');
  f.commit('change pack and scaffold payload');
  const report = f.inspect();
  assert.deepEqual(report.selection.categories, ['core', 'ui', 'pack', 'scaffold']);
  assert.deepEqual(report.changes.map(change => change.sourcePath), ['app/index.txt', 'pack.txt']);
  assert.ok(!report.changes.some(change => change.sourcePath === 'app/wrangler.jsonc'));
});

test('mapped skills resolve to their recorded local target path', t => {
  const f = fixture(t, {
    components: { skills: { alpha: 'custom-alpha' } },
    targetFiles: { '.claude/skills/custom-alpha/SKILL.md': 'alpha base\n' },
  });
  rmSync(join(f.target, '.claude/skills/alpha'), { recursive: true, force: true });
  write(f.source, '.agents/skills/alpha/SKILL.md', 'alpha latest\n');
  f.commit('change mapped skill');
  const change = f.inspect().changes.find(row => row.sourcePath.endsWith('alpha/SKILL.md'));
  assert.equal(change.targetPath, '.claude/skills/custom-alpha/SKILL.md');
  assert.equal(change.localState, 'installed-equivalent');
});

test('the marked root block ignores unrelated target prose', t => {
  const manifest = inventory({
    core: { blocks: [{ file: 'CLAUDE.md', markers: ['WONG-STACK:BEGIN', 'WONG-STACK:END'] }] },
  });
  const f = fixture(t, { manifest });
  write(f.source, 'CLAUDE.md', 'source header\n<!-- WONG-STACK:BEGIN -->\nblock latest\n<!-- WONG-STACK:END -->\nsource footer\n');
  f.commit('change block');
  const report = f.inspect();
  assert.equal(report.changes.length, 1);
  assert.equal(report.changes[0].kind, 'block');
  assert.equal(report.changes[0].localState, 'installed-equivalent');
});

test('a target CLAUDE.md that links to AGENTS.md reads its block through the link', t => {
  const manifest = inventory({
    core: { blocks: [{ file: 'CLAUDE.md', markers: ['WONG-STACK:BEGIN', 'WONG-STACK:END'] }] },
  });
  const f = fixture(t, { manifest });
  const local = readFileSync(join(f.target, 'CLAUDE.md'));
  rmSync(join(f.target, 'CLAUDE.md'));
  writeFileSync(join(f.target, 'AGENTS.md'), local);
  symlinkSync('AGENTS.md', join(f.target, 'CLAUDE.md'));
  write(f.source, 'CLAUDE.md', 'source header\n<!-- WONG-STACK:BEGIN -->\nblock latest\n<!-- WONG-STACK:END -->\nsource footer\n');
  f.commit('change block');
  const block = () => f.inspect().changes.find(change => change.kind === 'block');
  assert.equal(block().localState, 'installed-equivalent');
  write(f.target, 'AGENTS.md', 'target header\n<!-- WONG-STACK:BEGIN -->\nblock edited locally\n<!-- WONG-STACK:END -->\n');
  assert.equal(block().localState, 'locally-adapted');
});

test('manifest evolution reports newly selected and retired logical units', t => {
  const f = fixture(t, { manifest: inventory({ core: { files: ['old.txt'] } }), targetFiles: { 'old.txt': 'old\n' } });
  write(f.source, 'old.txt', 'old\n');
  f.commit('add old selected file');
  f.updateRecord({ commit: git(f.source, 'rev-parse', 'HEAD') });
  git(f.target, 'add', '.');
  git(f.target, 'commit', '-m', 'record manifest base');

  write(f.source, '.agents/skills/wong-sync/references/payload-files.json', `${JSON.stringify(inventory({ core: { files: ['new.txt'] } }), null, 2)}\n`);
  write(f.source, 'new.txt', 'new\n');
  f.commit('evolve manifest');
  const report = f.inspect();
  assert.deepEqual(report.changes.map(change => [change.sourcePath, change.operation]), [
    ['new.txt', 'added'],
    ['old.txt', 'removed'],
  ]);
});

test('unsafe inventories, invalid commits, unreadable targets, and Git failures fail closed', t => {
  const unsafe = fixture(t);
  write(unsafe.source, '.agents/skills/wong-sync/references/payload-files.json', `${JSON.stringify(inventory({ core: { files: ['../escape'] } }), null, 2)}\n`);
  unsafe.commit('unsafe inventory');
  assert.throws(() => unsafe.inspect(), error => error.code === 'unsafe-path');

  const invalid = fixture(t);
  invalid.updateRecord({ commit: 'deadbeef' });
  assert.throws(() => invalid.inspect(), error => error.code === 'git-failed');
  const failedCli = run(repo, process.execPath, [canonicalHelper, '--target', invalid.target, '--source', invalid.source, '--record', '.claude/.wong-stack.json'], { allowFailure: true });
  assert.equal(failedCli.status, 2);
  const failedReport = JSON.parse(failedCli.stdout);
  assert.equal(failedReport.status, 'error');
  assert.deepEqual(failedReport.changes, []);
  assert.equal(failedReport.diagnostics.length, 1);

  const unreadable = fixture(t);
  write(unreadable.source, 'plain.txt', 'plain latest\n');
  unreadable.commit('change plain');
  rmSync(join(unreadable.target, 'plain.txt'));
  mkdirSync(join(unreadable.target, 'plain.txt'));
  assert.throws(() => unreadable.inspect(), error => error.code === 'target-read-failed');

  const notRepo = join(invalid.root, 'not-a-repo');
  mkdirSync(notRepo);
  assert.throws(() => preflight({ target: invalid.target, source: notRepo, record: '.claude/.wong-stack.json' }), error => error.code === 'git-failed');
});

test('both documented helper paths emit the same bounded JSON contract', t => {
  const f = fixture(t);
  write(f.source, 'plain.txt', 'PRIVATE_BODY_SENTINEL\n');
  f.commit('change plain');
  const args = ['--target', f.target, '--source', f.source, '--record', '.claude/.wong-stack.json'];
  const canonical = run(repo, process.execPath, [canonicalHelper, ...args]);
  const alias = run(repo, process.execPath, [aliasHelper, ...args]);
  const canonicalReport = JSON.parse(canonical.stdout);
  const aliasReport = JSON.parse(alias.stdout);
  delete canonicalReport.timings;
  delete aliasReport.timings;
  assert.deepEqual(aliasReport, canonicalReport);
  assert.equal(canonicalReport.status, 'update');
  assert.ok(!canonical.stdout.includes('PRIVATE_BODY_SENTINEL'));
  assert.ok(canonicalReport.changes.every(change => !('content' in change) && !('diff' in change)));
});

test('a synthetic large no-op reports current and times its preflight', t => {
  const f = fixture(t, { manifest: { core: { dirs: ['payload'] } } });
  for (let index = 0; index < 1200; index += 1) {
    const name = `payload/group-${index % 20}/file-${String(index).padStart(4, '0')}.txt`;
    write(f.source, name, `value ${index}\n`);
    write(f.target, name, `value ${index}\n`);
  }
  f.commit('large payload base');
  f.updateRecord({ commit: git(f.source, 'rev-parse', 'HEAD') });
  const report = f.inspect();
  assert.equal(report.status, 'current');
  assert.equal(report.selection.currentUnits, 1200);
  assert.deepEqual(Object.keys(report.timings), ['preflightMs']);
  t.diagnostic(`synthetic 1200-unit preflight: ${report.timings.preflightMs}ms (source refresh and model latency excluded)`);
});

test('a target symlink cannot escape the repository', t => {
  const f = fixture(t);
  write(f.source, 'plain.txt', 'plain latest\n');
  f.commit('change plain');
  const outside = join(f.root, 'outside.txt');
  writeFileSync(outside, 'plain base\n');
  rmSync(join(f.target, 'plain.txt'));
  symlinkSync(outside, join(f.target, 'plain.txt'));
  assert.throws(() => f.inspect(), error => error.code === 'unsafe-path');
});

function linkedPairFixture(t, reversed) {
  const manifest = inventory({
    core: { files: ['AGENTS.md'], blocks: [{ file: 'CLAUDE.md', markers: ['WONG-STACK:BEGIN', 'WONG-STACK:END'] }] },
  });
  const f = fixture(t, { manifest });
  const latest = 'source header\n<!-- WONG-STACK:BEGIN -->\nblock latest\n<!-- WONG-STACK:END -->\nsource footer\n';
  const [real, link] = reversed ? ['CLAUDE.md', 'AGENTS.md'] : ['AGENTS.md', 'CLAUDE.md'];
  rmSync(join(f.source, 'CLAUDE.md'));
  write(f.source, real, latest);
  symlinkSync(real, join(f.source, link));
  f.commit('link the instruction pair');
  write(f.target, 'AGENTS.md', latest);
  return f;
}

test('a symlinked payload file is read through its link, not as link text', t => {
  const report = linkedPairFixture(t, false).inspect();
  assert.equal(report.status, 'update');
  const block = report.changes.find(change => change.kind === 'block');
  assert.equal(block.sourcePath, 'CLAUDE.md');
  assert.equal(block.localState, 'installed-equivalent');
  assert.equal(report.changes.find(change => change.sourcePath === 'AGENTS.md').localState, 'latest-equivalent');
});

test('a reversed linked pair classifies the same as the forward pair', t => {
  const strip = report => report.changes.map(({ unit, operation, localState }) => ({ unit, operation, localState }));
  assert.deepEqual(strip(linkedPairFixture(t, true).inspect()), strip(linkedPairFixture(t, false).inspect()));
});

test('directory and dangling links never become payload units', t => {
  const f = fixture(t, { manifest: inventory({ core: { dirs: ['docs'] } }) });
  write(f.source, 'docs/page.md', 'page\n');
  write(f.source, 'other/inner.md', 'inner\n');
  symlinkSync('../other', join(f.source, 'docs/folder-link'));
  symlinkSync('missing.md', join(f.source, 'docs/dangling-link'));
  f.commit('add links');
  const report = f.inspect();
  assert.deepEqual(report.changes.map(change => change.sourcePath), ['docs/page.md']);
});

test('WongStack as its own source reads its linked CLAUDE.md block', t => {
  const target = mkdtempSync(join(tmpdir(), 'wong-sync-self-'));
  t.after(() => rmSync(target, { recursive: true, force: true }));
  write(target, '.claude/.wong-stack.json', `${JSON.stringify({ commit: git(repo, 'rev-parse', 'HEAD'), components: { skills: ['wong-sync'] } })}\n`);
  const report = preflight({ target, source: repo });
  assert.notEqual(report.status, 'error');
});

test('--max-changes reaches the preflight from the command line', t => {
  const f = fixture(t);
  write(f.source, 'plain.txt', 'plain latest\n');
  write(f.source, '.agents/skills/alpha/SKILL.md', 'alpha latest\n');
  f.commit('change two units');
  const cli = limit => JSON.parse(run(repo, process.execPath, [canonicalHelper, '--target', f.target, '--source', f.source, '--max-changes', limit], { allowFailure: true }).stdout);
  assert.equal(cli('0').diagnostics[0]?.code, 'invalid-argument');
  assert.equal(cli('1').diagnostics[0]?.code, 'change-limit');
  assert.equal(cli('2').status, 'update');
});

test('two skills that map to one local name fail with path-collision', t => {
  const manifest = inventory({ core: { skillDirs: ['alpha', 'beta'], files: [] } });
  const f = fixture(t, { manifest, components: { skills: { alpha: 'beta' } } });
  write(f.source, '.agents/skills/beta/SKILL.md', 'beta base\n');
  f.commit('add beta');
  assert.throws(() => f.inspect(), error => error.code === 'path-collision'
    && error.message.includes('alpha') && error.message.includes('beta'));
});

test('the real scaffold ships the mini-app router and its example, never another app', t => {
  const real = JSON.parse(readFileSync(join(repo, '.agents/skills/wong-sync/references/payload-files.json'), 'utf8'));
  const f = fixture(t, { manifest: inventory({ scaffold: real.scaffold }) });
  const files = {
    'mini-apps/router.mjs': 'router\n',
    'mini-apps/router.d.mts': 'types\n',
    'mini-apps/routes.mjs': 'routes\n',
    'mini-apps/routes.d.mts': 'types\n',
    'mini-apps/apps/hello/index.html': 'hello\n',
    'mini-apps/apps/hello/app.json': '{}\n',
    'mini-apps/apps/tips/index.html': 'a source-only app\n',
    'mini-apps/apps/tips/app.json': '{}\n',
  };
  for (const [path, content] of Object.entries(files)) write(f.source, path, content);
  f.commit('add the mini-app router, its example, and a source-only app');
  const paths = f.inspect().changes.map(change => change.sourcePath).filter(path => path.startsWith('mini-apps/'));
  assert.deepEqual(paths.sort(), [
    'mini-apps/apps/hello/app.json',
    'mini-apps/apps/hello/index.html',
    'mini-apps/router.d.mts',
    'mini-apps/router.mjs',
    'mini-apps/routes.d.mts',
    'mini-apps/routes.mjs',
  ]);
});

test('an installed commit with no inventory compares every current unit as added', t => {
  const f = fixture(t);
  rmSync(join(f.source, '.agents/skills/wong-sync/references/payload-files.json'));
  const bare = f.commit('a commit from before the inventory');
  f.updateRecord({ commit: bare });
  write(f.source, '.agents/skills/wong-sync/references/payload-files.json', `${JSON.stringify(inventory(), null, 2)}\n`);
  write(f.source, '.agents/skills/alpha/SKILL.md', 'alpha latest\n');
  f.commit('add the inventory back and change alpha');
  rmSync(join(f.target, 'pack.txt'));
  const report = f.inspect();
  assert.equal(report.status, 'update');
  assert.equal(report.selection.installedUnits, 0);
  assert.ok(report.changes.every(change => change.operation === 'added'));
  const state = path => report.changes.find(change => change.sourcePath === path).localState;
  assert.equal(state('plain.txt'), 'latest-equivalent');
  assert.equal(state('.claude/skills/alpha/SKILL.md'), 'locally-adapted');
  assert.equal(state('pack.txt'), 'missing');
  assert.ok(report.catchUp.reasons.some(reason => reason.code === 'no-baseline'));
  assert.equal(report.catchUp.needed, true);

  rmSync(join(f.source, '.agents/skills/wong-sync/references/payload-files.json'));
  f.commit('drop the inventory at the current commit');
  assert.throws(() => f.inspect(), error => error.code === 'missing-inventory');
});

// Today's layout: a real .agents, .claude and .codex linking to it, and CLAUDE.md linking to a real AGENTS.md.
function currentLayout(f) {
  renameSync(join(f.target, '.claude'), join(f.target, '.agents'));
  symlinkSync('.agents', join(f.target, '.claude'));
  symlinkSync('.agents', join(f.target, '.codex'));
  renameSync(join(f.target, 'CLAUDE.md'), join(f.target, 'AGENTS.md'));
  symlinkSync('AGENTS.md', join(f.target, 'CLAUDE.md'));
}

const codes = report => report.catchUp.reasons.map(reason => reason.code);

test('the current layout on a current version needs no catch-up', t => {
  const f = fixture(t);
  f.updateRecord({ version: '26.0.0' });
  currentLayout(f);
  write(f.target, '.github/workflows/deploy.yml', 'on: push\n');
  assert.deepEqual(f.inspect().catchUp, { needed: false, reasons: [] });
  f.updateRecord({ version: '18.1.0' });
  assert.deepEqual(f.inspect().catchUp, { needed: true, reasons: [] });
});

test('each catch-up reason fires on its own layout', t => {
  const old = fixture(t);
  assert.deepEqual(old.inspect().catchUp.reasons, [
    { code: 'agent-folder', paths: ['.claude'] },
    { code: 'codex-folder', paths: [] },
    { code: 'rules-file', paths: ['CLAUDE.md'] },
  ]);
  write(old.target, 'AGENTS.md', 'their own agents file\n');
  assert.deepEqual(old.inspect().catchUp.reasons.find(reason => reason.code === 'rules-file').paths, ['CLAUDE.md', 'AGENTS.md']);

  const cases = [
    ['codex-folder', f => { rmSync(join(f.target, '.codex')); mkdirSync(join(f.target, '.codex')); }],
    ['codex-folder', f => rmSync(join(f.target, '.codex'))],
    ['agent-folder', f => {
      rmSync(join(f.target, '.claude'));
      renameSync(join(f.target, '.agents'), join(f.target, '.claude'));
      symlinkSync('.claude', join(f.target, '.agents'));
    }],
    ['rules-file-reversed', f => {
      rmSync(join(f.target, 'CLAUDE.md'));
      renameSync(join(f.target, 'AGENTS.md'), join(f.target, 'CLAUDE.md'));
      symlinkSync('CLAUDE.md', join(f.target, 'AGENTS.md'));
    }],
    ['wiki-elsewhere', f => f.updateRecord({ components: { skills: ['alpha'], docsPath: 'docs/development' } })],
    ['opted-out', f => f.updateRecord({ components: { skills: ['alpha'], stackPack: false, ui: false } })],
    ['generated-openspec', f => mkdirSync(join(f.target, '.agents/skills/openspec-explore'))],
    ['deploy-token', f => { f.updateRecord({ version: '17.2.0' }); write(f.target, '.github/workflows/deploy.yml', 'on: push\n'); }],
  ];
  for (const [code, arrange] of cases) {
    const f = fixture(t);
    f.updateRecord({ version: '26.0.0' });
    currentLayout(f);
    arrange(f);
    const report = f.inspect();
    assert.deepEqual(codes(report), [code], code);
    assert.equal(report.catchUp.needed, true, code);
  }

  const reasons = (() => {
    const f = fixture(t);
    currentLayout(f);
    f.updateRecord({ version: '17.2.0', components: { skills: ['alpha'], stackPack: false, appScaffold: false, docsPath: 'docs' } });
    mkdirSync(join(f.target, '.agents/skills/openspec-explore'));
    write(f.target, '.github/workflows/deploy.yml', 'on: push\n');
    return f.inspect().catchUp.reasons;
  })();
  assert.deepEqual(reasons, [
    { code: 'wiki-elsewhere', paths: ['docs'] },
    { code: 'opted-out', paths: ['components.stackPack', 'components.appScaffold'] },
    { code: 'generated-openspec', paths: ['.claude/skills/openspec-explore'] },
    { code: 'deploy-token', paths: ['.github/workflows/deploy.yml'] },
  ]);

  const token = fixture(t);
  currentLayout(token);
  token.updateRecord({ version: '18.0.0' });
  write(token.target, '.github/workflows/deploy.yml', 'on: push\n');
  assert.deepEqual(codes(token.inspect()), []);
});

const changelog = `# Changelog

## Next (minor) — Upcoming

- Something new.

**Updating.** Run the upcoming step once.

## 1.2.0 — Two

- A change.

**Updating.** After it publishes, run \`memory.mjs migrate\` once.

Until then, nothing else changes.

## 1.1.0 — One

- No hand step.

## 1.0.0 — Base

**Moving an existing install.** Not for this range.

## Before 1.0.0

Older entries are in git history.
`;

test('updating lists each changelog entry above the installed version with its hand steps', t => {
  const f = fixture(t);
  write(f.source, 'CHANGELOG.md', changelog);
  f.commit('add a changelog');
  const report = f.inspect();
  assert.equal(report.updatingComplete, true);
  assert.deepEqual(report.updating, [
    { version: 'Next (minor)', title: 'Upcoming', note: '**Updating.** Run the upcoming step once.' },
    { version: '1.2.0', title: 'Two', note: '**Updating.** After it publishes, run `memory.mjs migrate` once.\n\nUntil then, nothing else changes.' },
    { version: '1.1.0', title: 'One', note: null },
  ]);
  assert.equal(report.schemaVersion, 1);

  write(f.source, 'CHANGELOG.md', changelog.replace(/## Next[\s\S]*?(?=## 1\.2\.0)/, ''));
  f.commit('number the release');
  f.updateRecord({ version: '1.2.0' });
  assert.deepEqual(f.inspect().updating, []);
});

test('a source with no changelog reports updating as incomplete, never an error', t => {
  const report = fixture(t).inspect();
  assert.notEqual(report.status, 'error');
  assert.deepEqual(report.updating, []);
  assert.equal(report.updatingComplete, false);
});
