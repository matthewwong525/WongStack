import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

function cli(cwd, ...args) {
  const result = spawnSync('openspec', args, { cwd, encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, `openspec ${args.join(' ')}: ${result.stderr || result.stdout}`);
  return result.stdout;
}

function json(cwd, ...args) { return JSON.parse(cli(cwd, ...args, '--json')); }

test('OpenSpec 1.8 CLI can initialize, resolve, validate, and archive without agent skills', () => {
  const root = mkdtempSync(join(tmpdir(), 'wong-cli-'));
  try {
    cli(root, 'init', '--tools', 'none', '--no-animation', '--no-copilot-cloud', root);
    assert.ok(existsSync(join(root, 'openspec')));
    assert.equal(readdirSync(root).some(name => name === '.agents' || name === '.claude'), false);
    cli(root, 'new', 'change', 'cli-contract');
    const status = json(root, 'status', '--change', 'cli-contract');
    assert.equal(status.changeName, 'cli-contract');
    assert.equal(status.planningHome.root, root);
    assert.ok(status.artifacts.some(a => a.id === 'tasks' && a.requires.includes('specs')));
    assert.ok(status.applyRequires.includes('tasks'));
    const path = status.changeRoot;
    const proposal = json(root, 'instructions', 'proposal', '--change', 'cli-contract');
    assert.equal(proposal.resolvedOutputPath, join(path, 'proposal.md'));
    assert.ok(proposal.template.includes('## What Changes'));
    assert.ok(json(root, 'instructions', 'specs', '--change', 'cli-contract').outputPath.includes('*'));
    writeFileSync(join(path, '.openspec.yaml'), 'schema: spec-driven\nskip_specs: true\n');
    writeFileSync(proposal.resolvedOutputPath, '## Why\n\nTest the CLI contract.\n\n## What Changes\n\n- No user behavior changes.\n\n## Capabilities\n\n### New Capabilities\n\nNone.\n\n### Modified Capabilities\n\nNone.\n\n## Impact\n\nCI fixture.\n');
    const design = json(root, 'instructions', 'design', '--change', 'cli-contract');
    writeFileSync(design.resolvedOutputPath, '## Context\n\nDisposable CI fixture.\n\n## Goals / Non-Goals\n\nCheck CLI fields.\n\n## Decisions\n\nNo generated skills.\n\n## Risks / Trade-offs\n\nNone.\n');
    const tasks = json(root, 'instructions', 'tasks', '--change', 'cli-contract');
    writeFileSync(tasks.resolvedOutputPath, '## Work\n\n- [x] CLI fixture complete\n');
    const ready = json(root, 'status', '--change', 'cli-contract');
    assert.ok(ready.artifactPaths.tasks.existingOutputPaths.includes(tasks.resolvedOutputPath));
    const apply = json(root, 'instructions', 'apply', '--change', 'cli-contract');
    assert.equal(apply.changeName, 'cli-contract');
    assert.match(cli(root, 'validate', 'cli-contract', '--strict', '--no-interactive'), /valid/i);
    cli(root, 'archive', 'cli-contract', '--yes', '--skip-specs');
    assert.equal(existsSync(path), false);
    const archived = readdirSync(join(root, 'openspec/changes/archive')).find(name => name.endsWith('cli-contract'));
    assert.ok(archived);
    assert.ok(readFileSync(join(root, 'openspec/changes/archive', archived, 'tasks.md'), 'utf8').includes('[x]'));
    mkdirSync(join(root, 'nested'));
    assert.equal(json(join(root, 'nested'), 'context').root.path, root);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
