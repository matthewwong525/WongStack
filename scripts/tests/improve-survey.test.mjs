import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync,
  symlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  areaFor, selectRecentRange, selectRotation, survey, utcWeekOrdinal,
} from '../../.agents/skills/improve/scripts/survey.mjs';

const cli = path.resolve('.agents/skills/improve/scripts/survey.mjs');

function git(root, ...args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
}

function write(root, file, text) {
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), text);
}

function fixture(t, entries, message = 'fixture') {
  const root = mkdtempSync(path.join(tmpdir(), 'improve-survey-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'user.email', 'fixture@example.invalid');
  git(root, 'config', 'user.name', 'Fixture');
  for (const [file, text] of Object.entries(entries)) write(root, file, text);
  git(root, 'add', '--all');
  git(root, 'commit', '-q', '-m', message);
  return root;
}

function status(root) { return git(root, 'status', '--porcelain=v1', '-uall'); }

test('surveys a documentation-only repository without requiring an app tree', t => {
  const root = fixture(t, {
    'README.md': '# Guide\n\n[topic](docs/topic.md)\n',
    'docs/topic.md': '# Topic\n',
    'wiki/process.md': '# Process\n',
  });
  const report = survey(root, '.', { now: '2026-09-21T00:00:00Z' });
  assert.equal(report.status, 'complete');
  assert.equal(report.coverage.scanned, 3);
  assert.deepEqual(report.coverage.areas.sample.map(row => row.area), ['(root)', 'docs', 'wiki']);
  assert.ok(report.coverage.rotation.selected);
});

test('discovers stable maintained areas in a mixed-language monorepo', t => {
  const root = fixture(t, {
    'apps/api/main.go': 'package main\n',
    'apps/web/page.tsx': 'export const Page = () => null;\n',
    'crates/parser/src/lib.rs': 'pub fn parse() {}\n',
    'packages/shared/value.py': 'value = 1\n',
    '.agents/skills/save/SKILL.md': '# Save\n',
  });
  const areas = survey(root, '.', { now: '2026-09-21' }).coverage.areas.sample.map(row => row.area);
  assert.deepEqual(areas, [
    '.agents/skills/save', 'apps/api', 'apps/web', 'crates/parser', 'packages/shared',
  ]);
  assert.equal(areaFor('services/mail/index.rb'), 'services/mail');
});

test('maps a safe in-repo .claude alias to tracked .agents files', t => {
  const root = fixture(t, { '.agents/skills/example/SKILL.md': '# Example\n' });
  symlinkSync('.agents', path.join(root, '.claude'));
  git(root, 'add', '.claude');
  git(root, 'commit', '-q', '-m', 'alias');
  const report = survey(root, '.claude/skills/example', { now: '2026-09-21' });
  assert.equal(report.scope, '.agents/skills/example');
  assert.equal(report.coverage.scanned, 1);
  assert.equal(report.coverage.areas.sample[0].area, '.agents/skills/example');
});

test('treats scopes literally and rejects escaped paths and external aliases', t => {
  const area = 'packages/$(touch owned)';
  const root = fixture(t, { [`${area}/source.ts`]: 'export const value = 1;\n' });
  const result = spawnSync(process.execPath, [cli, area], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).coverage.scanned, 1);
  assert.equal(existsSync(path.join(root, 'owned')), false);
  assert.throws(() => survey(root, '..'), /inside/);
  const outside = mkdtempSync(path.join(tmpdir(), 'improve-outside-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  symlinkSync(outside, path.join(root, 'escape'));
  assert.throws(() => survey(root, 'escape'), /resolve inside/);
});

test('reports missing tracked files as partial without source snippets', t => {
  const root = fixture(t, { 'good.ts': 'export const good = true;\n', 'gone.ts': 'private fixture text\n' });
  rmSync(path.join(root, 'gone.ts'));
  const result = spawnSync(process.execPath, [cli], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 2);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'partial');
  assert.deepEqual(report.errors.sample, [{ file: 'gone.ts', operation: 'read', reason: 'ENOENT' }]);
  assert.ok(!result.stdout.includes('private fixture text'));
});

test('skips file symlinks and unsupported or oversized files with explicit counts', t => {
  const root = fixture(t, { 'good.ts': 'export const good = true;\n', 'image.png': 'not text' });
  const outside = mkdtempSync(path.join(tmpdir(), 'improve-outside-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  writeFileSync(path.join(outside, 'private.ts'), 'dangerouslySetInnerHTML');
  symlinkSync(path.join(outside, 'private.ts'), path.join(root, 'link.ts'));
  writeFileSync(path.join(root, 'huge.ts'), 'x'.repeat(1024 * 1024 + 1));
  git(root, 'add', 'link.ts', 'huge.ts');
  git(root, 'commit', '-q', '-m', 'limits');
  const report = survey(root, '.', { now: '2026-09-21' });
  assert.equal(report.coverage.scanned, 1);
  assert.equal(report.coverage.skipped.symlinks, 1);
  assert.equal(report.coverage.skipped.large, 1);
  assert.equal(report.coverage.skipped.excludedOrUnsupported, 1);
  assert.equal(report.candidates.securityLocations['raw-html'].total, 0);
});

test('bounds findings and does not change the worktree, index, or file list', t => {
  const root = fixture(t, {
    'docs/README.md': Array.from({ length: 60 }, (_, i) => `[link](./missing-${i}.md)`).join('\n'),
    'src/page.tsx': 'dangerouslySetInnerHTML\n'.repeat(60),
  });
  const before = status(root);
  const index = git(root, 'ls-files', '--stage');
  const names = readdirSync(root);
  const report = survey(root, '.', { now: '2026-09-21' });
  assert.equal(report.candidates.missingLocalLinks.total, 60);
  assert.equal(report.candidates.missingLocalLinks.sample.length, 20);
  assert.equal(report.candidates.securityLocations['raw-html'].sample.length, 20);
  assert.equal(status(root), before);
  assert.equal(git(root, 'ls-files', '--stage'), index);
  assert.deepEqual(readdirSync(root), names);
});

test('UTC weekly rotation advances and prefers an area outside recent changes', () => {
  const first = new Date('2026-09-21T23:59:59Z');
  const next = new Date(first.getTime() + 7 * 86_400_000);
  assert.equal(utcWeekOrdinal(next), utcWeekOrdinal(first) + 1);
  const a = selectRotation(['wiki', 'src', 'scripts'], ['src'], first);
  const b = selectRotation(['wiki', 'src', 'scripts'], ['src'], next);
  assert.notEqual(a.start, b.start);
  assert.notEqual(a.selected, 'src');
  assert.equal(selectRotation(['src'], ['src'], first).allRecent, true);
  assert.deepEqual(selectRotation([], [], first).selected, null);
});

test('a changed area list and a narrowed scope affect recent and rotation coverage', t => {
  const root = fixture(t, { 'apps/api/main.ts': 'export const v = 1;\n', 'apps/web/main.ts': 'export const v = 1;\n' });
  write(root, 'apps/api/main.ts', 'export const v = 2;\n');
  git(root, 'add', '--all');
  git(root, 'commit', '-q', '-m', 'change api');
  const report = survey(root, 'apps/web', { now: '2026-09-21' });
  assert.equal(report.scope, 'apps/web');
  assert.deepEqual(report.coverage.areas.sample.map(row => row.area), ['apps/web']);
  assert.deepEqual(report.coverage.recent.changedAreas.sample, ['apps/web']);
  assert.equal(report.coverage.rotation.selected, 'apps/web');
});

test('uses the latest usable shipped maintenance revision', t => {
  const root = fixture(t, { 'src/main.ts': 'export const v = 1;\n' });
  const base = git(root, 'rev-parse', 'HEAD');
  write(root, 'openspec/changes/archive/2026-09-14-maintenance/proposal.md',
    `# Maintenance\n\nMaintenance-Origin: /improve\nMaintenance-Revision: ${base}\n`);
  git(root, 'add', '--all');
  git(root, 'commit', '-q', '-m', 'maintenance record');
  const range = selectRecentRange(root, undefined, '2026-09-21');
  assert.equal(range.source, 'maintenance-revision');
  assert.equal(range.base, base);
});

test('reports missing and non-ancestor markers before using the bounded fallback', t => {
  const root = fixture(t, { 'src/main.ts': 'export const v = 1;\n' });
  git(root, 'checkout', '-q', '--orphan', 'other');
  write(root, 'other.ts', 'export const other = true;\n');
  git(root, 'add', '--all');
  git(root, 'commit', '-q', '-m', 'other history');
  const unrelated = git(root, 'rev-parse', 'HEAD');
  git(root, 'checkout', '-q', 'main');
  write(root, 'openspec/changes/archive/2026-09-20-new/proposal.md',
    '# New\n\nMaintenance-Origin: /improve\nMaintenance-Revision: deadbeef\n');
  write(root, 'openspec/changes/archive/2026-09-19-old/proposal.md',
    `# Old\n\nMaintenance-Origin: /improve\nMaintenance-Revision: ${unrelated}\n`);
  git(root, 'add', '--all');
  git(root, 'commit', '-q', '-m', 'records');
  const range = selectRecentRange(root, undefined, '2026-09-21');
  assert.match(range.source, /fallback/);
  assert.deepEqual(range.rejected.map(row => row.reason).sort(), ['missing-commit', 'not-ancestor']);
});

test('does not include secret values or historical records in survey candidates', t => {
  const root = fixture(t, {
    '.env': 'PRIVATE_TOKEN=fixture-only\n',
    'notes/old.md': '[old](missing.md)\n',
    'openspec/changes/archive/old/proposal.md': '[old](missing.md)\n',
    'src/main.ts': 'export const current = true;\n',
  });
  const output = JSON.stringify(survey(root, '.', { now: '2026-09-21' }));
  assert.ok(!output.includes('fixture-only'));
  assert.equal(JSON.parse(output).candidates.missingLocalLinks.total, 0);
  assert.equal(readFileSync(path.join(root, 'notes/old.md'), 'utf8'), '[old](missing.md)\n');
});
