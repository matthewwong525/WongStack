import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, renameSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { scanCorpus, scopedEntries, sourceRole, safeSource, verifyPassage } from '../../.agents/skills/memory/scripts/lib/documents/corpus.mjs';
import { lexicalSearch, interleaveSources, passages } from '../../.agents/skills/memory/scripts/lib/documents/lexical.mjs';
import { validateRetrieval } from '../../.agents/skills/memory/scripts/lib/documents/input.mjs';
import { retrieveDocuments } from '../../.agents/skills/memory/scripts/lib/documents/retrieve.mjs';
import { tempDir } from './fixtures/memory/harness.mjs';

function fixture(t) {
  const root = tempDir(t, 'documents-'), commonDir = join(root, '.git');
  execFileSync('git', ['init', '-q'], { cwd: root });
  const put = (path, text = '# Guide\nReliable retrieval evidence.\n') => {
    mkdirSync(join(root, path, '..'), { recursive: true }); writeFileSync(join(root, path), text); return path;
  };
  return { ctx: { root, commonDir }, put };
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
test('the knowledge copy is a second root, read through its link, with people pages and conflict copies left out', t => {
  const { ctx, put } = fixture(t);
  put('wiki/guide.md');
  const copy = tempDir(t, 'documents-knowledge-');
  execFileSync('git', ['init', '-q'], { cwd: copy });
  for (const page of ['ops/shipping.md', 'people/ana.md', 'ops/shipping.mine.md', 'notes.txt']) {
    mkdirSync(join(copy, page, '..'), { recursive: true }); writeFileSync(join(copy, page), '# Shipping\nParcels leave on Fridays.\n');
  }
  symlinkSync(copy, join(ctx.root, 'knowledge'), process.platform === 'win32' ? 'junction' : 'dir');
  const corpus = scanCorpus(ctx);
  assert.deepEqual(Object.keys(corpus.entries), ['wiki/guide.md', 'knowledge/ops/shipping.md']);
  assert.equal(corpus.entries['knowledge/ops/shipping.md'].role, 'knowledge');
  assert.ok(scopedEntries(corpus, { change: 'any' }).some(entry => entry.role === 'knowledge'), 'knowledge is current guidance');
  assert.equal(lexicalSearch(corpus, 'When do parcels leave?')[0].path, 'knowledge/ops/shipping.md');
  assert.equal(safeSource(ctx.root, 'knowledge/people/ana.md'), null);
  symlinkSync(join(copy, 'ops', 'shipping.md'), join(copy, 'ops', 'linked.md'));
  assert.equal(safeSource(ctx.root, 'knowledge/ops/linked.md'), null, 'a link inside the copy is not followed');
  const plain = tempDir(t, 'documents-plain-');
  mkdirSync(join(plain, 'knowledge')); writeFileSync(join(plain, 'knowledge', 'x.md'), '# X\n');
  assert.equal(safeSource(plain, 'knowledge/x.md'), null, 'a folder that is no copy is not read');
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
test('strict input rejects scope, filter and field injection, and refuses the removed modes by name', () => {
  for (const [question, values] of [['', {}], ['a'.repeat(4001), {}], ['a\nvec: injected', {}], ['about lex: unsafe', {}], ['bad\u0001input', {}],
    ['question', { scope: 'private' }], ['question', { mode: 'remote' }], ['question', { change: '../escape' }],
    ['question', { limit: 0 }], ['question', { limit: 1.5 }], ['question', { everyone: true }], ['question', { type: 'unknown' }], ['question', { tag: '\tbad' }]]) {
    assert.throws(() => validateRetrieval(question, values, { recall: true }), error => error.code === 2);
  }
  for (const mode of ['keyword', 'auto']) assert.equal(validateRetrieval('$(unsafe); `touch never`', { mode }).mode, undefined, 'a kept mode changes nothing');
  for (const mode of ['semantic', 'deep'])
    assert.throws(() => validateRetrieval('question', { mode }), error => error.code === 2 && /Meaning-based search was removed/.test(error.message));
  assert.throws(() => validateRetrieval('question', { tag: 'memory' }));
});
test('exact original phrases late in a long section survive window selection and prefix truncation', () => {
  const question = 'Private memory belongs to the installation';
  const text = ['# Memory', ...Array.from({ length: 70 }, () => 'Private memory has general installation guidance.'),
    question, 'Following original explanation.'].join('\n');
  const entry = { path: 'wiki/memory.md', role: 'wiki', hash: 'a'.repeat(64), text };
  const selected = passages(entry, question)[0];
  assert.equal(selected.startLine, 72); assert.equal(selected.endLine, 73);
  assert.equal(selected.text, `${question}\nFollowing original explanation.`);
  assert.equal(selected.truncated, true);
});
test('a lookup returns verified originals by words, and a question with no match reports empty', async t => {
  const { ctx, put } = fixture(t);
  put('wiki/guide.md', '# Release guidance\nSave waits for approved checks.\n');
  const found = await retrieveDocuments(ctx, validateRetrieval('approved checks'));
  assert.deepEqual(Object.keys(found), ['documents', 'documentSource']);
  assert.deepEqual(found.documentSource, { state: 'ok' });
  assert.equal(found.documents[0].path, 'wiki/guide.md'); assert.equal(found.documents[0].freshness, 'verified');
  const none = await retrieveDocuments(ctx, validateRetrieval('zznonexistent'));
  assert.deepEqual(none, { documents: [], documentSource: { state: 'empty' } });
});
test('current scope leaves an archived proposal out, and history scope returns it labeled archive', async t => {
  const { ctx, put } = fixture(t);
  put('wiki/guide.md', '# Release guidance\nSave waits for approved checks.\n');
  const archived = put('openspec/changes/archive/2026-09-25-old-store/proposal.md', '# Old store\nThe ledger moved because approved checks were slow.\n');
  const current = await retrieveDocuments(ctx, validateRetrieval('Why did the ledger move?'));
  assert.equal(current.documents.some(doc => doc.role === 'archive'), false);
  assert.deepEqual(current.documentSource, { state: 'empty' });
  const history = await retrieveDocuments(ctx, validateRetrieval('Why did the ledger move?', { scope: 'history' }));
  assert.deepEqual(history.documents.map(doc => [doc.path, doc.role]), [[archived, 'archive']]);
  assert.match(history.documents[0].text, /ledger moved/);
});
test('a source edited after ranking is withheld, its new text returned, and coverage reported partial with a reason', async t => {
  const { ctx, put } = fixture(t); let edited = false;
  put('wiki/guide.md', '# Release guidance\nSave waits for approved checks.\n');
  const result = await retrieveDocuments(ctx, validateRetrieval('approved checks'), { beforeVerify: candidate => {
    if (candidate.path === 'wiki/guide.md' && !edited) { put('wiki/guide.md', '# Fresh\nApproved checks now require review.\n'); edited = true; }
  } });
  assert.equal(result.documentSource.state, 'partial'); assert.match(result.documentSource.reason, /changed during lookup/);
  assert.deepEqual(result.documents.map(doc => doc.path), ['wiki/guide.md']);
  assert.match(result.documents[0].text, /now require review/); assert.doesNotMatch(result.documents[0].text, /Save waits/);
});
test('a scan that runs out of time returns what it read, marked partial with a reason', async t => {
  const { ctx, put } = fixture(t);
  put('wiki/a.md', '# A\nApproved checks gate a release.\n'); put('wiki/b.md', '# B\nApproved checks again.\n');
  const corpus = scanCorpus(ctx, { maxBytes: 40 });
  const result = await retrieveDocuments(ctx, validateRetrieval('approved checks'), { corpus });
  assert.deepEqual(result.documents.map(doc => doc.path), ['wiki/a.md']);
  assert.equal(result.documentSource.state, 'partial'); assert.match(result.documentSource.reason, /scan incomplete/);
});
