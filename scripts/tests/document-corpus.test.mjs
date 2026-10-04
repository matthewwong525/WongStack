import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { scanCorpus, scopedEntries, sourceRole, safeSource, verifyPassage } from '../../.agents/skills/memory/scripts/lib/documents/corpus.mjs';
import { lexicalSearch, interleaveSources } from '../../.agents/skills/memory/scripts/lib/documents/lexical.mjs';
import { acquireRefresh, atomicJson, diffCorpus, documentPaths, generation, pruneGenerations, refreshIndex } from '../../.agents/skills/memory/scripts/lib/documents/state.mjs';
import { tempDir } from './fixtures/memory/harness.mjs';

function fixture(t) {
  const root = tempDir(t, 'documents-'), commonDir = join(root, '.git');
  execFileSync('git', ['init', '-q'], { cwd: root });
  const put = (path, text = '# Guide\nReliable retrieval evidence.\n') => {
    mkdirSync(join(root, path, '..'), { recursive: true }); writeFileSync(join(root, path), text); return path;
  };
  return { ctx: { root, commonDir }, put, paths: documentPaths({ root, commonDir }, { dataDir: join(root, 'private-state') }) };
}
test('disjoint path roles, source scopes, unsaved docs and exclusions', t => {
  const { ctx, put } = fixture(t);
  ['wiki/guide.md', 'openspec/specs/memory/spec.md', 'openspec/changes/new/proposal.md',
    'openspec/changes/archive/2026-10-01-old/design.md', 'openspec/changes/new/specs/x/spec.md',
    'wiki/people/private.md', 'wiki/evidence.md', 'wiki/logs/run.md', 'openspec/changes/new/evidence.md',
    'openspec/changes/new/review.html', '.env', 'code.md'].forEach(path => put(path));
  put('wiki/ignored.md'); writeFileSync(join(ctx.root, '.gitignore'), 'wiki/ignored.md\n');
  const corpus = scanCorpus(ctx);
  assert.equal(Object.keys(corpus.entries).length, 5);
  assert.deepEqual(new Set(scopedEntries(corpus).map(entry => entry.role)), new Set(['wiki', 'specs']));
  assert.equal(scopedEntries(corpus, { scope: 'history' }).length, 3);
  assert.equal(scopedEntries(corpus, { scope: 'active' }).length, 4);
  assert.equal(scopedEntries(corpus, { scope: 'all' }).length, 5);
  assert.equal(scopedEntries(corpus, { scope: 'all', change: 'old' }).length, 3);
  assert.equal(sourceRole('openspec/changes/archive/2026-10-01-old/design.md'), 'archive');
});
test('rejects symlink files/directories and escaping or malformed paths', t => {
  const { ctx, put } = fixture(t);
  put('wiki/guide.md');
  const outside = tempDir(t, 'documents-outside-'); writeFileSync(join(outside, 'private.md'), 'private');
  symlinkSync(join(outside, 'private.md'), join(ctx.root, 'wiki', 'linked.md'));
  symlinkSync(outside, join(ctx.root, 'wiki', 'linked-dir'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal(safeSource(ctx.root, 'wiki/linked.md'), null);
  assert.equal(safeSource(ctx.root, 'wiki/linked-dir/private.md'), null);
  for (const path of ['wiki/../private.md', '/wiki/guide.md', 'wiki\\guide.md', 'wiki//guide.md', 'wiki/./guide.md']) assert.equal(safeSource(ctx.root, path), null);
  assert.deepEqual(Object.keys(scanCorpus(ctx).entries), ['wiki/guide.md']);
});
test('scan bounds report omitted eligible sources and continue after racing reads', t => {
  const { ctx, put } = fixture(t);
  put('wiki/a.md', 'a'.repeat(100)); put('wiki/b.md', 'small');
  const bounded = scanCorpus(ctx, { maxFileBytes: 20 });
  assert.equal(bounded.omitted, 1); assert.deepEqual(Object.keys(bounded.entries), ['wiki/b.md']);
  assert.equal(scanCorpus(ctx, { deadline: 0 }).omitted, 2);
  assert.equal(scanCorpus(ctx, { maxBytes: 0 }).omitted, 2);
  put('openspec/changes/archive/2026-10-01-old/proposal.md', 'history'.repeat(100));
  const currentFirst = scanCorpus(ctx, { maxBytes: 105 });
  assert.ok(currentFirst.entries['wiki/a.md']); assert.equal(currentFirst.entries['openspec/changes/archive/2026-10-01-old/proposal.md'], undefined);
});
test('lexical evidence uses words and IDF, preserves roles and traceable ranges', t => {
  const { ctx, put } = fixture(t);
  put('wiki/gate.md', '# Publish a change\n\n## The gate\nSave waits for checks before publishing changes.\n');
  put('wiki/browser.md', '# Browser guide\n\nSaved browser logins use a password manager.\n');
  put('wiki/noise.md', '# Check\nComplicated unchecked checklists must not match an exact check token.\n');
  const corpus = scanCorpus(ctx), hits = lexicalSearch(corpus, 'How does save publish changes and wait for checks?');
  assert.equal(hits[0].path, 'wiki/gate.md');
  const verified = verifyPassage(ctx, hits[0]); assert.equal(verified.freshness, 'verified');
  assert.match(verified.reference, /^wiki\/gate.md:\d+$/);
  assert.deepEqual(lexicalSearch(corpus, 'quuxnonexistent'), []);
  assert.deepEqual(interleaveSources([{ ...hits[0], path: 'openspec/changes/archive/2026-10-01-old/proposal.md', role: 'archive' }, ...hits], 2).map(hit => hit.role), ['wiki', 'archive']);
});
test('source hash, range and text validation withholds edited, moved and vanished candidates', t => {
  const { ctx, put } = fixture(t); put('wiki/guide.md');
  const hit = lexicalSearch(scanCorpus(ctx), 'retrieval')[0];
  assert.equal(verifyPassage(ctx, { ...hit, startLine: 0 }), null);
  assert.equal(verifyPassage(ctx, { ...hit, endLine: 999 }), null);
  assert.equal(verifyPassage(ctx, { ...hit, text: 'invented' }), null);
  assert.equal(verifyPassage(ctx, hit, { beforeRead: () => put('wiki/guide.md', 'updated') }), null);
  renameSync(join(ctx.root, 'wiki/guide.md'), join(ctx.root, 'wiki/moved.md'));
  assert.equal(verifyPassage(ctx, hit), null);
});
test('worktrees share runtime but isolate index state by real root', t => {
  const { ctx } = fixture(t), other = tempDir(t, 'linked-documents-'), dataDir = tempDir(t, 'shared-documents-');
  const one = documentPaths(ctx, { dataDir }), two = documentPaths({ ...ctx, root: other }, { dataDir });
  assert.notEqual(one.state, two.state); assert.equal(one.runtime, two.runtime);
});
test('atomic incremental generations remove moved/deleted paths and preserve valid state on failure', async t => {
  const { ctx, paths, put } = fixture(t); put('wiki/guide.md'); put('wiki/remove.md');
  const deltas = [], prepare = async (_dir, delta) => { deltas.push(delta); return { embedded: false }; };
  const first = await refreshIndex(ctx, scanCorpus(ctx), paths, { prepare });
  assert.equal(first.changed, 2); assert.equal(generation(paths).manifest.complete, true);
  const unchanged = await refreshIndex(ctx, scanCorpus(ctx), paths, { prepare });
  assert.equal(unchanged.changed, 0); assert.equal(deltas.length, 1);
  put('wiki/guide.md', '# Changed\nFresh knowledge.');
  renameSync(join(ctx.root, 'wiki/remove.md'), join(ctx.root, 'wiki/moved.md'));
  const second = await refreshIndex(ctx, scanCorpus(ctx), paths, { prepare });
  assert.equal(second.changed, 2); assert.equal(second.removed, 1);
  assert.equal(generation(paths).manifest.entries['wiki/remove.md'], undefined);
  put('wiki/guide.md', 'broken refresh candidate');
  await assert.rejects(refreshIndex(ctx, scanCorpus(ctx), paths, { prepare: async () => { throw new Error('interrupted'); } }), /interrupted/);
  assert.equal(generation(paths).manifest.generation, second.generation);
  assert.equal(diffCorpus(scanCorpus(ctx), generation(paths).manifest).changed.length, 1);
  assert.equal(JSON.parse(readFileSync(join(paths.state, 'refresh.json'))).state, 'failed');
});
test('refresh locks serialize and recover expired ownership without torn publication', async t => {
  const { ctx, paths, put } = fixture(t); put('wiki/guide.md');
  const lock = acquireRefresh(paths); assert.ok(lock);
  assert.equal(acquireRefresh(paths), null);
  assert.equal((await refreshIndex(ctx, scanCorpus(ctx), paths)).state, 'partial');
  const replacement = acquireRefresh(paths, { now: Date.now() + 400000 }); assert.ok(replacement);
  assert.equal(lock.owns(), false); lock.release(); assert.equal(replacement.owns(), true); replacement.release();
  const signal = AbortSignal.abort();
  await assert.rejects(refreshIndex(ctx, scanCorpus(ctx), paths, { signal }), /deadline/);
  assert.equal(generation(paths), null);
  atomicJson(join(paths.state, 'current.json'), { generation: '../escape' }); assert.equal(generation(paths), null);
});
test('obsolete generations honor current/previous and reader grace', t => {
  const { paths } = fixture(t), dir = join(paths.state, 'generations');
  for (const name of ['old', 'current', 'previous', 'young']) mkdirSync(join(dir, name), { recursive: true });
  utimesSync(join(dir, 'old'), new Date(0), new Date(0));
  pruneGenerations(paths, { keep: ['current', 'previous'] });
  assert.equal(generation(paths), null);
  assert.equal(existsSync(join(dir, 'old')), false);
  for (const name of ['current', 'previous', 'young']) assert.equal(existsSync(join(dir, name)), true);
});
