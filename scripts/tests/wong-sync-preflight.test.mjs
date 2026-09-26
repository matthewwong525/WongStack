import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
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
  const root = mkdtempSync('/tmp/wong-sync-preflight-');
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

test('a synthetic large no-op stays within the preflight budget', t => {
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
  assert.ok(report.timings.preflightMs < 5000, `preflight took ${report.timings.preflightMs}ms`);
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
  const target = mkdtempSync('/tmp/wong-sync-self-');
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

function docsPathFixture(t, files, docsPath = 'docs/development') {
  const manifest = inventory({ core: { skillDirs: ['alpha'], files } });
  const f = fixture(t, { manifest, components: { skills: ['alpha'], docsPath } });
  rmSync(join(f.target, 'wiki'), { recursive: true, force: true });
  write(f.target, 'docs/development/ux-principles.md', 'ui base\n');
  return f;
}

test('docsPath maps wiki pages into one folder and finds the relocated UI page', t => {
  const f = docsPathFixture(t, ['wiki/contributing.md', 'wiki/development/the-change-loop.md']);
  write(f.source, 'wiki/contributing.md', 'contributing base\n');
  write(f.source, 'wiki/development/the-change-loop.md', 'loop base\n');
  f.updateRecord({ commit: f.commit('add wiki pages') });
  write(f.target, 'docs/development/contributing.md', 'contributing base\n');
  write(f.target, 'docs/development/the-change-loop.md', 'loop base\n');

  write(f.source, 'wiki/contributing.md', 'contributing latest\n');
  write(f.source, 'wiki/development/the-change-loop.md', 'loop latest\n');
  write(f.source, 'wiki/ux-principles.md', 'ui latest\n');
  f.commit('change wiki pages');
  const report = f.inspect();
  assert.ok(report.selection.categories.includes('ui'));
  assert.deepEqual(report.changes.map(change => [change.sourcePath, change.targetPath, change.localState]), [
    ['wiki/contributing.md', 'docs/development/contributing.md', 'installed-equivalent'],
    ['wiki/development/the-change-loop.md', 'docs/development/the-change-loop.md', 'installed-equivalent'],
    ['wiki/ux-principles.md', 'docs/development/ux-principles.md', 'installed-equivalent'],
  ]);
});

test('docsPath refuses colliding pages and unsafe folders', t => {
  const collide = docsPathFixture(t, ['wiki/page.md', 'wiki/development/page.md']);
  assert.throws(() => collide.inspect(), error => error.code === 'path-collision'
    && error.message.includes('wiki/page.md') && error.message.includes('wiki/development/page.md'));
  for (const unsafe of ['../outside', '/absolute']) {
    assert.throws(() => docsPathFixture(t, [], unsafe).inspect(), error => error.code === 'unsafe-path');
  }
});

test('the real scaffold ships the mini Worker and its example, never another app', t => {
  const real = JSON.parse(readFileSync(join(repo, '.agents/skills/wong-sync/references/payload-files.json'), 'utf8'));
  const f = fixture(t, { manifest: inventory({ scaffold: real.scaffold }) });
  const files = {
    'mini-apps/worker.ts': 'worker\n',
    'mini-apps/tsconfig.json': '{}\n',
    'mini-apps/.gitignore': '.wrangler/\n',
    'mini-apps/wrangler.jsonc': '{ "name": "source-mini" }\n',
    'mini-apps/apps/.assetsignore': '*.ts\n',
    'mini-apps/apps/hello/index.html': 'hello\n',
    'mini-apps/apps/hello/app.json': '{}\n',
    'mini-apps/apps/tips/index.html': 'a source-only app\n',
    'mini-apps/apps/tips/app.json': '{}\n',
  };
  for (const [path, content] of Object.entries(files)) write(f.source, path, content);
  f.commit('add the mini Worker, its example, and a source-only app');
  const paths = f.inspect().changes.map(change => change.sourcePath).filter(path => path.startsWith('mini-apps/'));
  assert.deepEqual(paths.sort(), [
    'mini-apps/.gitignore',
    'mini-apps/apps/.assetsignore',
    'mini-apps/apps/hello/app.json',
    'mini-apps/apps/hello/index.html',
    'mini-apps/tsconfig.json',
    'mini-apps/worker.ts',
  ]);
});
