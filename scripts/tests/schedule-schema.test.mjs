// Installed OpenSpec contract: finite registration validation leaves the goal checklist open.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createGoal, loadRecord, listRecords, checkpoint, writeRoutine } from '../../.agents/skills/schedule/scripts/lib/records.mjs';
import { binding, proposal, routine } from './fixtures/scheduled-work.mjs';
const repo = fileURLToPath(new URL('../..', import.meta.url));

test('real CLI validates custom goal registration, combined list, and terminal archive without capability deltas', async t => {
  const root = mkdtempSync(path.join(tmpdir(), 'wong-schedule-schema-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, 'openspec'), { recursive: true }); writeFileSync(path.join(root, 'openspec/config.yaml'), 'schema: spec-driven\n');
  cpSync(path.join(repo, 'openspec/schemas/scheduled-work'), path.join(root, 'openspec/schemas/scheduled-work'), { recursive: true });
  const cli = args => execFileSync('openspec', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  cli(['schema', 'validate', 'scheduled-work']);
  const existingSpec = path.join(root, 'openspec/specs/existing/spec.md');
  mkdirSync(path.dirname(existingSpec), { recursive: true });
  const baselineSpec = '# Existing capability\n\n## Purpose\nRemain unchanged during business goal archival.\n';
  writeFileSync(existingSpec, baselineSpec);
  const created = await createGoal(root, 'synthetic', { proposal, binding: binding(), tasks: '- [ ] 1. Verify completion.\n- [ ] 2. Stop owned trigger.\n' });
  cli(['validate', 'synthetic', '--strict', '--no-interactive']);
  assert.ok(readFileSync(path.join(root, created.reference, 'tasks.md'), 'utf8').includes('- [ ]'));
  writeRoutine(root, routine()); const listed = await listRecords(root); assert.deepEqual(listed.records.map(row => row.kind), ['routine', 'goal']);
  const index = JSON.parse(cli(['list', '--json'])); assert.deepEqual(index.changes.map(row => row.name), ['synthetic']);
  checkpoint(created, { ...created.binding, lifecycle: { state: 'completed', published: true, publication: 'synthetic:fixture-only', evidence: 'synthetic://done', stopVerified: true } });
  writeFileSync(path.join(root, created.reference, 'tasks.md'), '- [x] 1. Synthetic completion observed.\n- [x] 2. Synthetic owned stop observed.\n');
  const result = JSON.parse(cli(['archive', 'synthetic', '--yes', '--skip-specs', '--json']));
  assert.equal(result.archive.specsUpdated, false); assert.equal(readFileSync(existingSpec, 'utf8'), baselineSpec); assert.deepEqual(readdirSync(path.join(root, 'openspec/specs')), ['existing']);
  const archived = await loadRecord(root, path.relative(root, result.archive.path)); assert.equal(archived.archived, true);
  assert.ok(existsSync(path.join(root, 'schedules/synthetic.json')));
});
