import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateRetrieval } from '../../.agents/skills/memory/scripts/lib/documents/input.mjs';
import { scanCorpus } from '../../.agents/skills/memory/scripts/lib/documents/corpus.mjs';
import { atomicJson, documentPaths, generation, refreshIndex } from '../../.agents/skills/memory/scripts/lib/documents/state.mjs';
import { executeFile, parseCandidates, prepareIndex, RUNTIME, runQmd, runtimeEntry, runtimeEnvironment, runtimeReady, searchArguments } from '../../.agents/skills/memory/scripts/lib/documents/qmd.mjs';
import { documentsStatus, setupDocuments } from '../../.agents/skills/memory/scripts/lib/documents/setup.mjs';
import { anchoredPassage, locatedPassages, retrieveDocuments, startRefresh } from '../../.agents/skills/memory/scripts/lib/documents/retrieve.mjs';
import { tempDir } from './fixtures/memory/harness.mjs';

function fixture(t, { ready = true } = {}) {
  const root = tempDir(t, 'document-runtime-'); execFileSync('git', ['init', '-q'], { cwd: root });
  const ctx = { root, commonDir: join(root, '.git') }, paths = documentPaths(ctx, { dataDir: join(root, 'state') });
  const put = (path, text = '# Release guidance\nSave waits for approved checks.\n') => {
    mkdirSync(join(root, path, '..'), { recursive: true }); writeFileSync(join(root, path), text);
  };
  put('wiki/guide.md'); put('openspec/specs/gate/spec.md');
  const model = join(paths.models, 'embedding.gguf'); mkdirSync(paths.models, { recursive: true });
  writeFileSync(model, Buffer.concat([Buffer.from('GGUF'), Buffer.alloc(2048)]));
  const marker = { version: RUNTIME.version, cpu: true, models: { embedding: { path: model, bytes: 2052 } } };
  if (ready) {
    mkdirSync(join(runtimeEntry(paths), '..'), { recursive: true }); writeFileSync(runtimeEntry(paths), '// test runtime');
    writeFileSync(join(paths.runtime, 'node_modules/@tobilu/qmd/package.json'), JSON.stringify({ version: RUNTIME.version }));
    atomicJson(join(paths.runtime, 'ready.json'), marker);
  }
  return { ctx, paths, put, marker, corpus: scanCorpus(ctx) };
}
test('strict input rejects scope/filter/field injection before subprocesses', () => {
  for (const [question, values] of [['', {}], ['a'.repeat(4001), {}], ['a\nvec: injected', {}], ['about lex: unsafe', {}], ['bad\u0001input', {}],
    ['question', { scope: 'private' }], ['question', { mode: 'remote' }], ['question', { change: '../escape' }],
    ['question', { limit: 0 }], ['question', { limit: 1.5 }], ['question', { everyone: true }], ['question', { type: 'unknown' }], ['question', { tag: '\tbad' }]]) {
    assert.throws(() => validateRetrieval(question, values, { recall: true }));
  }
  assert.equal(validateRetrieval('$(unsafe); `touch never`', { mode: 'keyword' }).mode, 'keyword');
  assert.throws(() => validateRetrieval('question', { tag: 'memory' }));
});
test('QMD arguments use fixed typed fields and sanitized environment without keys or CI', t => {
  const { paths } = fixture(t);
  const env = runtimeEnvironment(paths, join(paths.state, 'generation'), { cpu: true });
  assert.equal(env.QMD_FORCE_CPU, '1'); assert.equal(env.CI, undefined);
  for (const key of ['CLOUDFLARE_MEMORY_TOKEN', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'NODE_OPTIONS', 'QMD_CONFIG']) assert.equal(env[key], undefined);
  assert.ok(env.QMD_EMBED_MODEL.startsWith(paths.models));
  assert.ok(searchArguments('why publish', 'wiki', 'auto').includes('--no-rerank'));
  assert.equal(searchArguments('why publish', 'wiki', 'deep').includes('--no-rerank'), false);
  assert.match(searchArguments('why publish', 'wiki', 'semantic')[1], /^vec:/);
  assert.equal(searchArguments('why publish', 'wiki', 'keyword')[0], 'search');
  assert.throws(() => searchArguments('question', 'external', 'auto'));
});
test('parses pinned JSON candidates only within the manifest and rejects malformed results', t => {
  const { corpus } = fixture(t), manifest = { entries: corpus.entries };
  for (const file of ['wiki/wiki/guide.md', 'qmd://wiki/wiki/guide.md', 'qmd://wiki/wiki/guide.md?index=wongstack']) {
    assert.equal(parseCandidates(JSON.stringify([{ file, line: 1, score: 0.8 }]), 'wiki', manifest)[0].path, 'wiki/guide.md');
  }
  assert.deepEqual(parseCandidates('[]', 'wiki', manifest), []);
  for (const value of ['bad', '{}', JSON.stringify([{ file: 'archive/wiki/guide.md', line: 1, score: 1 }]),
    JSON.stringify([{ file: 'qmd://wiki/wiki/guide.md?index=external', line: 1, score: 1 }]),
    JSON.stringify([{ file: 'wiki/../../.env', line: 1, score: 1 }]), JSON.stringify([{ file: 'wiki/wiki/guide.md', line: 0, score: 1 }])])
    assert.throws(() => parseCandidates(value, 'wiki', manifest), /malformed|outside|external/);
});
test('readiness distinguishes missing runtime, unsupported host, partial setup and missing model', t => {
  const env = fixture(t, { ready: false }); assert.equal(runtimeReady(env.paths).ready, false);
  assert.equal(runtimeReady(env.paths, { platform: 'win32' }).ready, false);
  assert.equal(runtimeReady(env.paths, { nodeVersion: '18.0.0' }).ready, false);
  const ready = fixture(t); assert.equal(runtimeReady(ready.paths).ready, true);
  assert.equal(runtimeReady(ready.paths, { deep: true }).ready, false);
  writeFileSync(ready.marker.models.embedding.path, 'broken'); assert.equal(runtimeReady(ready.paths).ready, false);
  assert.equal(documentsStatus(env.paths, env.corpus).semanticReady, false);
});
test('direct managed runtime invocation ignores external executable/config and isolates process environment', async t => {
  const { paths, marker } = fixture(t);
  const result = await runQmd(paths, paths.state, ['status'], { marker, execute: async (command, args, options) => {
    assert.equal(command, process.execPath); assert.equal(args[0], runtimeEntry(paths));
    assert.deepEqual(args.slice(1), ['--index', 'wongstack', 'status']);
    assert.equal(options.env.CLOUDFLARE_MEMORY_TOKEN, undefined); assert.equal(options.cwd, paths.runtime);
    return { stdout: 'checked', stderr: '' };
  } }); assert.equal(result.stdout, 'checked');
});
test('native child timeout and shared cancellation terminate pending work', async () => {
  await assert.rejects(executeFile(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { timeout: 30 }), /deadline/);
  const controller = new AbortController(); setTimeout(() => controller.abort(), 30);
  await assert.rejects(executeFile(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { signal: controller.signal }), /deadline/);
});
test('explicit index preparation supplies local model config and performs update then embedding', async t => {
  const { paths, marker } = fixture(t), dir = join(paths.state, 'candidate');
  const calls = [];
  const result = await prepareIndex(paths, dir, { changed: ['wiki/guide.md'] }, undefined, marker,
    { execute: async (_command, args) => { calls.push(args.at(-1)); return { stdout: '', stderr: '' }; } });
  assert.deepEqual(calls, ['update', 'embed']); assert.equal(result.embedded, true);
  const config = JSON.parse(readFileSync(join(dir, 'config/wongstack.yml')));
  assert.equal(config.models.embed, marker.models.embedding.path); assert.equal(config.collections.wiki.context['/'].startsWith('Current'), true);
});
test('ordinary reads use portable fallback without installation or model preparation', async t => {
  const env = fixture(t, { ready: false }); let launched = 0;
  const options = validateRetrieval('approved checks', { mode: 'semantic' });
  const result = await retrieveDocuments(env.ctx, options, env.paths, { corpus: env.corpus, search: async () => { launched++; throw new Error('must not launch'); } });
  assert.equal(launched, 0); assert.equal(result.backend, 'lexical-fallback'); assert.equal(result.requestedModeState, 'unavailable');
  assert.ok(result.documents.length); assert.equal(result.documents[0].freshness, 'verified');
  const empty = await retrieveDocuments(env.ctx, validateRetrieval('zznonexistent', { mode: 'keyword' }), env.paths, { corpus: env.corpus });
  assert.equal(empty.documentSource.state, 'empty'); assert.deepEqual(empty.documents, []);
});
test('located hybrid evidence selects the relevant original summary rather than an unrelated QMD anchor', () => {
  const text = readFileSync(new URL('./fixtures/document-retrieval/corpus/openspec/specs/delivery-gate/spec.md', import.meta.url), 'utf8');
  const entry = { path: 'openspec/specs/delivery-gate/spec.md', role: 'specs', hash: 'a'.repeat(64), text };
  const hit = { hash: entry.hash, anchor: 33, score: 0.9 };
  for (const mode of ['keyword', 'auto', 'deep']) {
    const selected = locatedPassages(entry, hit, { question: 'How does save publish changes and wait for checks?', mode });
    assert.match(selected[0].text, /passing gate/);
    assert.equal(selected[0].heading, 'Purpose');
    assert.equal(selected[0].text, text.split('\n').slice(selected[0].startLine - 1, selected[0].endLine).join('\n'));
  }
  const paraphrase = { question: 'Ephemeral dialogue warrants persistent organizational recollection', mode: 'auto' };
  assert.deepEqual(locatedPassages(entry, hit, paraphrase), [anchoredPassage(entry, hit)]);
  assert.deepEqual(locatedPassages(entry, hit, { question: 'save checks', mode: 'semantic' }), [anchoredPassage(entry, hit)]);
});
test('semantic role pools retain successful sources after malformed role output and report partial coverage', async t => {
  const env = fixture(t);
  await refreshIndex(env.ctx, env.corpus, env.paths, { prepare: async () => ({ embedded: true }) });
  const result = await retrieveDocuments(env.ctx, validateRetrieval('approved checks', { mode: 'semantic' }), env.paths, {
    corpus: env.corpus, search: async (_paths, _dir, args) => ({ stdout: args[args.indexOf('-c') + 1] === 'wiki'
      ? JSON.stringify([{ file: 'wiki/wiki/guide.md', line: 2, score: 0.9 }]) : 'malformed' }), refresh: () => {},
  });
  assert.equal(result.backend, 'qmd'); assert.equal(result.coverage, 'partial'); assert.equal(result.documentSource.state, 'partial');
  assert.ok(result.documents.some(doc => doc.path === 'wiki/guide.md'));
});
test('stale index suppresses old candidates, supplies changed live evidence and queues only prepared refresh', async t => {
  const env = fixture(t); await refreshIndex(env.ctx, env.corpus, env.paths, { prepare: async () => ({ embedded: true }) });
  env.put('wiki/guide.md', '# Updated\nApproved checks changed today.\n');
  let refreshed = 0;
  const result = await retrieveDocuments(env.ctx, validateRetrieval('approved checks'), env.paths, { corpus: scanCorpus(env.ctx),
    search: async (_paths, _dir, args) => ({ stdout: args.includes('wiki') ? JSON.stringify([{ file: 'wiki/wiki/guide.md', line: 1, score: 0.9 }]) : '[]' }),
    refresh: () => { refreshed++; },
  });
  assert.equal(result.coverage, 'partial'); assert.equal(refreshed, 1);
  assert.match(result.documents.find(doc => doc.path === 'wiki/guide.md').text, /changed today/);
});
test('source edited after retrieval is revalidated and replaced by live evidence', async t => {
  const env = fixture(t, { ready: false }); let edited = false;
  const result = await retrieveDocuments(env.ctx, validateRetrieval('approved checks'), env.paths, { corpus: env.corpus, beforeVerify: candidate => {
    if (candidate.path === 'wiki/guide.md' && !edited) { env.put('wiki/guide.md', '# Fresh\nApproved checks now require review.\n'); edited = true; }
  } });
  assert.equal(result.coverage, 'partial'); assert.match(result.documents.find(doc => doc.path === 'wiki/guide.md').text, /now require review/);
});
test('background refresh launch claims prevent concurrent child starts and honor failure backoff', t => {
  const env = fixture(t); let launched = 0;
  const launch = () => { launched++; return { on() {}, unref() {} }; };
  assert.equal(startRefresh(env.ctx, env.paths, { launch }), true);
  assert.equal(startRefresh(env.ctx, env.paths, { launch }), false); assert.equal(launched, 1);
  atomicJson(join(env.paths.state, 'refresh.json'), { state: 'failed', at: Date.now() });
  assert.equal(startRefresh(env.ctx, env.paths, { launch }), false);
});
test('explicit setup marks readiness only after install, GGUF validation, indexing and checked original query', async t => {
  const env = fixture(t, { ready: false }); const calls = [];
  const execute = async (command, args) => {
    calls.push(args);
    if (command === 'npm') {
      mkdirSync(join(runtimeEntry(env.paths), '..'), { recursive: true }); writeFileSync(runtimeEntry(env.paths), '// test');
      writeFileSync(join(env.paths.runtime, 'node_modules/@tobilu/qmd/package.json'), JSON.stringify({ version: RUNTIME.version }));
      return { stdout: '', stderr: '' };
    }
    if (args.includes('--version')) return { stdout: 'qmd 2.8.3\n', stderr: '' };
    if (args.includes('--input-type=module')) return { stdout: JSON.stringify([{ path: env.marker.models.embedding.path }]), stderr: '' };
    if (args.includes('query')) return { stdout: JSON.stringify([{ file: 'wiki/wiki/guide.md', line: 1, score: 1 }]), stderr: '' };
    return { stdout: '', stderr: '' };
  };
  // Corpus sorting puts wiki first; verify its originals in the setup query.
  const result = await setupDocuments(env.ctx, env.paths, { execute, corpus: env.corpus, cpu: true });
  assert.equal(result.semantic, true); assert.equal(runtimeReady(env.paths).ready, true);
  assert.equal(calls.filter(args => args.includes('--input-type=module')).length, 1);
  assert.equal(calls.some(args => args.includes('pull')), false);
  assert.equal(documentsStatus(env.paths, env.corpus).semanticReady, true);
});
test('failed or partial setup never creates a ready marker', async t => {
  const env = fixture(t, { ready: false });
  await assert.rejects(setupDocuments(env.ctx, env.paths, { execute: async () => { throw new Error('native unsupported'); }, corpus: env.corpus }), /native unsupported/);
  assert.equal(existsSync(join(env.paths.runtime, 'ready.json')), false);
  assert.equal(runtimeReady(env.paths).ready, false); assert.equal(generation(env.paths), null);
});
