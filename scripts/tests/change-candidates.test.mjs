import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const helper = join(dirname(fileURLToPath(import.meta.url)), '../../.agents/skills/save/scripts/change-candidates.sh');

function run(cwd, command, ...args) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, `${command} ${args.join(' ')}: ${result.stderr}`);
  return result.stdout.trim();
}

function proposal(root, name) {
  const dir = join(root, 'openspec/changes', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'proposal.md'), `# ${name}\n`);
}

test('candidate list keeps untracked, committed, and remote branch changes distinct from branch names', () => {
  const root = mkdtempSync(join(tmpdir(), 'wong-change-candidates-'));
  try {
    run(root, 'git', 'init', '-b', 'main');
    run(root, 'git', 'config', 'user.email', 'test@example.test');
    run(root, 'git', 'config', 'user.name', 'Test');
    writeFileSync(join(root, 'README.md'), 'base\n');
    run(root, 'git', 'add', 'README.md');
    run(root, 'git', 'commit', '-m', 'base');
    run(root, 'git', 'checkout', '-b', 'editor-work');

    proposal(root, 'review-handoff');
    assert.equal(run(root, 'bash', helper, 'active'), 'review-handoff');

    run(root, 'git', 'add', 'openspec/changes/review-handoff');
    run(root, 'git', 'commit', '-m', 'save change');
    assert.equal(run(root, 'bash', helper, 'active'), 'review-handoff');
    assert.equal(run(root, 'bash', helper, 'active', 'editor-work'), 'review-handoff');

    proposal(root, 'another-change');
    assert.equal(run(root, 'bash', helper, 'active'), 'another-change\nreview-handoff');
    run(root, 'git', 'add', 'openspec/changes/another-change');
    run(root, 'git', 'commit', '-m', 'second change');

    mkdirSync(join(root, 'openspec/changes/archive'), { recursive: true });
    renameSync(join(root, 'openspec/changes/review-handoff'), join(root, 'openspec/changes/archive/2026-09-20-review-handoff'));
    assert.equal(run(root, 'bash', helper, 'active'), 'another-change');
    assert.equal(run(root, 'bash', helper, 'archive'), '2026-09-20-review-handoff');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
