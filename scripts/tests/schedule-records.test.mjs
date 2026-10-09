import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { binding, routine, proposal } from './fixtures/scheduled-work.mjs';
import { digest, credentialFree, validateBinding, validateTiming, validateRoutine, loadRecord, listRecords, createGoal, checkpoint, writeRoutine } from '../../.agents/skills/schedule/scripts/lib/records.mjs';
import { startupPrompt } from '../../.agents/skills/schedule/scripts/lib/hosts.mjs';

function workspace(t) { const root = mkdtempSync(path.join(tmpdir(), 'wong-schedule-')); t.after(() => rmSync(root, { recursive: true, force: true })); return root; }
function fakeCli(root, rows = ['synthetic']) {
  const calls = [];
  const cli = async (args, options) => {
    calls.push({ args, options });
    const dir = path.join(root, 'openspec/changes', args[args.indexOf('--change') + 1] ?? 'synthetic');
    const paths = Object.fromEntries(['proposal', 'binding', 'tasks'].map(id => [id, { resolvedOutputPath: path.join(dir, `${id}.${id === 'binding' ? 'json' : 'md'}`), existingOutputPaths: [path.join(dir, `${id}.${id === 'binding' ? 'json' : 'md'}`)] }]));
    if (args[0] === 'new') { const target = path.join(root, 'openspec/changes', args[2]); mkdirSync(target, { recursive: true }); writeFileSync(path.join(target, '.openspec.yaml'), 'schema: scheduled-work\n'); return {}; }
    if (args[0] === 'list') return { changes: rows.map(name => ({ name })) };
    if (args[0] === 'instructions') return { resolvedOutputPath: paths[args[1]].resolvedOutputPath };
    return { schemaName: 'scheduled-work', changeRoot: dir, artifactPaths: paths };
  };
  cli.calls = calls; return cli;
}
function goalFiles(root, b = binding()) {
  const dir = path.join(root, b.record); mkdirSync(dir, { recursive: true });
  for (const [file, value] of Object.entries({ 'proposal.md': proposal, 'tasks.md': '- [ ] Verify synthetic goal.\n', 'binding.json': JSON.stringify(b), '.openspec.yaml': 'schema: scheduled-work\nskip_specs: true\n', 'review.html': '<p>synthetic</p>' })) writeFileSync(path.join(dir, file), value);
  return dir;
}
test('routine format validates and tampered instructions, credentials and unknown versions fail', () => {
  const row = routine(); assert.equal(validateRoutine(row), row);
  const cases = [{ version: 2 }, { kind: 'goal' }, { key: '../escape' }, { instructions: '' }, { instructions: 'changed' }, { authority: null }, { execution: { type: 'script' } }];
  for (const patch of cases) assert.throws(() => validateRoutine({ ...row, ...patch }));
  for (const value of [{ token: 'private' }, { url: 'https://secret@example.test/repo' }, { instructions: 'Bearer secret' }]) assert.throws(() => credentialFree(value), /Credential/);
});
test('binding requires one durable route, approved identity, contextual evidence and terminal stopping', () => {
  assert.equal(validateBinding(binding()).version, 1);
  const cases = [{ version: 2 }, { key: '' }, { repository: '' }, { revision: 'old' }, { execution: null }, { execution: { ...binding().execution, generation: 0 } }, { execution: { ...binding().execution, nativeId: 1 } }, { execution: { ...binding().execution, capabilities: null } }, { progress: null }, { progress: { type: 'local', reference: 'relative' } }, { progress: { type: 'local', reference: '/repo/openspec/changes/current/progress.json' } }, { execution: { ...binding().execution, context: { location: 'cloud' } } }, { lifecycle: { state: 'unknown' } }, { lifecycle: { state: 'scheduled', published: true } }, { lifecycle: { state: 'cancelled', published: false } }];
  for (const patch of cases) assert.throws(() => validateBinding(binding(patch)), JSON.stringify(patch));
  assert.equal(validateBinding(binding({ progress: { type: 'memory', reference: 'facts:synthetic' } })).progress.type, 'memory');
  assert.equal(validateBinding(binding({ lifecycle: { state: 'cancelled', published: false, evidence: 'synthetic://owner-request', stopVerified: true } })).lifecycle.state, 'cancelled');
});
test('timing distinguishes one-time and routine and rejects annual-only or reversed bounds', () => {
  for (const value of [null, { mode: 'forever' }, { mode: 'recurring', timezone: 'Mars', every: '1h', allowedLatenessMs: 0 }, { mode: 'once', timezone: 'UTC', allowedLatenessMs: 0 }, { mode: 'goal', timezone: 'UTC', every: '1h', allowedLatenessMs: -1 }, { mode: 'goal', timezone: 'UTC', every: '1h', allowedLatenessMs: 0, earliest: 'tomorrow' }, { mode: 'goal', timezone: 'UTC', cron: '0 9 * *', allowedLatenessMs: 0 }, { ...binding().timing, earliest: '2027-01-01T00:00:00Z' }, { ...binding().timing, contactHours: {} }]) assert.throws(() => validateTiming(value));
  assert.throws(() => validateTiming(binding().timing, { kind: 'routine' }));
});
test('routine creation writes only lightweight configuration, retains cancelled state and no OpenSpec work', async t => {
  const root = workspace(t), row = routine();
  assert.equal(writeRoutine(root, row), 'schedules/synthetic.json');
  const selected = await loadRecord(root, 'schedules/synthetic.json'); assert.equal(selected.kind, 'routine'); assert.deepEqual(selected.files, ['schedules/synthetic.json']);
  const updated = checkpoint(selected, { ...selected.binding, lifecycle: { state: 'cancelled', published: true, publication: 'commit:1', evidence: 'synthetic://request', stopVerified: true } });
  assert.equal(updated.state, 'cancelled'); assert.equal(existsSync(path.join(root, 'openspec')), false);
  assert.equal((await loadRecord(root, 'schedules/synthetic.json')).state, 'cancelled');
});
test('goal creation uses selected CLI paths and store, preserving goal tasks through publication', async t => {
  const root = workspace(t), cli = fakeCli(root);
  const result = await createGoal(root, 'synthetic', { proposal, binding: binding(), tasks: '- [ ] Verify completion.\n', store: 'chosen', openspec: cli });
  assert.equal(result.kind, 'goal'); assert.ok(result.files.includes('openspec/changes/synthetic/.openspec.yaml'));
  assert.ok(result.record.tasks.includes('- [ ]')); assert.ok(cli.calls.every(call => call.options.store === 'chosen'));
  assert.equal(result.binding.store, 'chosen'); assert.ok(startupPrompt(result.binding).includes('--store chosen'));
  assert.ok(readFileSync(path.join(root, 'openspec/changes/synthetic/.openspec.yaml'), 'utf8').includes('skip_specs: true'));
  checkpoint(result, { ...result.binding, lifecycle: { state: 'waiting', published: true, publication: 'commit:1' } });
  assert.equal((await loadRecord(root, 'synthetic', { openspec: cli })).state, 'waiting');
});
test('combined listing reports routines and open goals with invalid definitions visible as errors', async t => {
  const root = workspace(t), cli = fakeCli(root); goalFiles(root); writeRoutine(root, routine());
  writeFileSync(path.join(root, 'schedules/broken.json'), '{}');
  const result = await listRecords(root, { openspec: cli }); assert.deepEqual(result.records.map(row => row.kind), ['routine', 'goal']); assert.equal(result.errors.length, 1);
  writeFileSync(path.join(root, 'openspec/changes/synthetic/proposal.md'), `${proposal}\nchanged`);
  await assert.rejects(loadRecord(root, 'synthetic', { openspec: cli }), /revision changed/);
  await assert.rejects(loadRecord(root, '../outside', { openspec: async () => ({ schemaName: 'spec-driven' }) }), /ordinary code/);
});
test('published goal metadata and proposal headings are required; code changes never operational records', async t => {
  const root = workspace(t), cli = fakeCli(root); goalFiles(root);
  await assert.rejects(loadRecord(root, 'synthetic', { openspec: async () => ({ schemaName: 'spec-driven' }) }), /ordinary/);
  await assert.rejects(loadRecord(root, 'synthetic', { openspec: async () => ({ schemaName: 'scheduled-work' }) }), /change root/);
  await assert.rejects(loadRecord(root, 'synthetic', { openspec: async () => ({ schemaName: 'scheduled-work', changeRoot: root, artifactPaths: {} }) }), /artifact path/);
  const text = proposal.replace('## Authority', '## Other'); const b = binding({ revision: digest(text) });
  goalFiles(root, b); writeFileSync(path.join(root, b.record, 'proposal.md'), text);
  await assert.rejects(loadRecord(root, 'synthetic', { openspec: cli }), /Authority/);
});
test('terminal archived goals retain original instruction reference and reject unrelated files', async t => {
  const root = workspace(t), b = binding({ lifecycle: { state: 'completed', published: true, publication: 'commit:1', evidence: 'synthetic://done', stopVerified: true } });
  const directory = goalFiles(root, b), archive = path.join(root, 'openspec/changes/archive/2026-10-09-synthetic'); mkdirSync(path.dirname(archive), { recursive: true });
  const { renameSync } = await import('node:fs'); renameSync(directory, archive);
  const selected = await loadRecord(root, 'openspec/changes/archive/2026-10-09-synthetic'); assert.equal(selected.archived, true); assert.equal(selected.binding.record, 'openspec/changes/synthetic');
  writeFileSync(path.join(archive, 'extra.mjs'), 'source'); await assert.rejects(loadRecord(root, 'openspec/changes/archive/2026-10-09-synthetic'), /unrelated/);
});

test('cron validation rejects invalid ranges, steps and duration policies', () => {
  for (const cron of ['0 25 * * *', '0 9 0 * *', '0 9 * 13 *', '0 9 * * 8', '*/0 * * * *', '2-1 * * * *', 'hello 9 * * *']) assert.throws(() => validateTiming({ ...binding().timing, cron }));
  assert.throws(() => validateTiming({ ...binding().timing, cron: undefined, every: 'forever' }), /positive duration/);
  assert.ok(validateTiming({ ...binding().timing, cron: '*/5 9-17 * * 1,2,3,4,5' }));
});
