import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, '.agents/skills/wong-sync/scripts/retire-generated-openspec.mjs');
const generated = join(repo, 'scripts/tests/fixtures/openspec-apply-change');

function fixture(fn, { marker = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'wong-migrate-'));
  const skills = join(root, '.agents/skills');
  mkdirSync(skills, { recursive: true });
  mkdirSync(join(root, '.claude'), { recursive: true });
  writeFileSync(join(root, '.claude/.wong-stack.json'), JSON.stringify({ upstream: { repo: 'matthewwong525/WongStack' }, installedVersion: '15.1.0' }));
  if (marker) writeFileSync(join(skills, '.openspec-target'), 'agents\n');
  cpSync(generated, join(skills, 'openspec-apply-change'), { recursive: true });
  const run = (...args) => spawnSync(process.execPath, [script, root, ...args], { encoding: 'utf8' });
  try { return fn({ root, skills, run }); } finally { rmSync(root, { recursive: true, force: true }); }
}

test('known generated layer retires once without changing active records or archives', () => fixture(({ root, skills, run }) => {
  mkdirSync(join(root, 'openspec/changes/active'), { recursive: true });
  mkdirSync(join(root, 'openspec/changes/archive/old'), { recursive: true });
  writeFileSync(join(root, 'openspec/changes/active/tasks.md'), '- [ ] Work\n');
  writeFileSync(join(root, 'openspec/changes/archive/old/proposal.md'), 'old\n');
  const dry = run();
  assert.equal(dry.status, 0);
  assert.match(dry.stdout, /would retire: openspec-apply-change/);
  assert.ok(existsSync(join(skills, 'openspec-apply-change')));
  assert.equal(run('--apply').status, 0);
  assert.equal(existsSync(join(skills, 'openspec-apply-change')), false);
  assert.equal(existsSync(join(skills, '.openspec-target')), false);
  assert.equal(run('--apply').status, 0);
  assert.equal(readFileSync(join(root, 'openspec/changes/active/tasks.md'), 'utf8'), '- [ ] Work\n');
  assert.equal(readFileSync(join(root, 'openspec/changes/archive/old/proposal.md'), 'utf8'), 'old\n');
}));

test('customized and independently installed skills are preserved', () => fixture(({ skills, run }) => {
  const file = join(skills, 'openspec-apply-change/SKILL.md');
  writeFileSync(file, readFileSync(file, 'utf8') + '\nCustom\n');
  mkdirSync(join(skills, 'openspec-custom'));
  writeFileSync(join(skills, 'openspec-custom/SKILL.md'), 'Independent\n');
  assert.equal(run('--apply').status, 2);
  assert.ok(existsSync(file));
  assert.ok(existsSync(join(skills, 'openspec-custom/SKILL.md')));
  assert.ok(existsSync(join(skills, '.openspec-target')));
}));

test('same content without marker is not owned', () => fixture(({ skills, run }) => {
  assert.equal(run('--apply').status, 2);
  assert.ok(existsSync(join(skills, 'openspec-apply-change/SKILL.md')));
}, { marker: false }));

test('symlinked skill paths are scanned once', () => fixture(({ root, skills, run }) => {
  symlinkSync('../.agents/skills', join(root, '.claude/skills'), 'dir');
  const output = run('--apply');
  assert.equal(output.status, 0);
  assert.equal((output.stdout.match(/retired: openspec-apply-change/g) || []).length, 1);
  assert.equal(existsSync(join(skills, 'openspec-apply-change')), false);
}));
