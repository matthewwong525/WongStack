import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { EXTRACT_LIMITS, bytes, issueTask, scopeOf, taskIdentity, withTask } from '../../.agents/skills/memory/scripts/lib/extract-ledger.mjs';
import { admitCandidates, extractMemory, validateSelection } from '../../.agents/skills/memory/scripts/lib/extract.mjs';
import { bufferedProcess, EXTRACT_SYSTEM, isolatedClaudeArgs, prepareExtractHost } from '../../.agents/skills/memory/scripts/lib/extract-host.mjs';
import { renderExtractPacket } from '../../.agents/skills/memory/scripts/lib/extract-packet.mjs';
import { memory, setup, tempDir } from './fixtures/memory/harness.mjs';
const fact = (id, body = `Original evidence ${id}.`) => ({ id, body, slug: 'topic', type: 'project', author: 'dev@example.com', created_at: '2026-10-01T00:00:00Z', session_id: null, superseded_by: null, state: 'conversation' });
function context(t) { const root = tempDir(t, 'extract-'); return { root, commonDir: root, stateDir: root, author: 'dev@example.com' }; }
const reply = (select = [1], queries = [], gaps = []) => JSON.stringify({ version: 1, select, queries, gaps });
function storeFor(facts, before = () => {}) { const calls = []; return { calls, config: { team: false }, async query(sql, params) { calls.push({ sql, params }); before(sql, calls.length); return facts.filter(row => !row.superseded_by && (!/f.id IN/.test(sql) || params.includes(row.id))).slice(0, 20); } }; }
function hostFor(responses, run = () => {}) { let index = 0; return { supported: true, inputBytes: text => bytes(EXTRACT_SYSTEM) + bytes(text), async call(prompt, signal) { run(prompt, signal, index); const response = responses[index++]; if (response instanceof Error) throw response; return { text: response, model: 'recorded-fixture', usage: null }; }, close() {} }; }
const invoke = (ctx, task, dependencies, options = {}) => extractMemory(ctx, { task, identity: 'identity', question: 'topic', ...options }, dependencies);

test('task ledgers serialize concurrent reservations, bind scope and expire without reset', async t => {
  const ctx = context(t), handle = issueTask(ctx, 'identity');
  const reservations = await Promise.all(Array.from({ length: 5 }, () => withTask(ctx, handle, 'identity', Date.now() + 1000, async ({ reserve }) => { await new Promise(resolve => setTimeout(resolve, 5)); return reserve('searches', 1); })));
  assert.equal(reservations.filter(Boolean).length, 3);
  await assert.rejects(withTask(ctx, handle, 'other', Date.now() + 1000, () => {}), /mismatch/);
  await assert.rejects(withTask(ctx, 'missing', 'identity', Date.now() + 1000, () => {}), /invalid/);
  await assert.rejects(withTask(ctx, '00000000-0000-0000-0000-000000000000', 'identity', Date.now() + 1000, () => {}), /missing/);
  await assert.rejects(withTask(ctx, issueTask(ctx, 'identity', Date.now() - EXTRACT_LIMITS.ttl - 1), 'identity', Date.now() + 1000, () => {}), /expired/);
  await assert.rejects(withTask(ctx, handle, 'identity', Date.now() - 1, () => {}), /deadline/);
  assert.notEqual(taskIdentity(ctx, { slug: 'a' }, 'caller'), taskIdentity(ctx, { slug: 'b' }, 'caller'));
  assert.throws(() => scopeOf({ all: true }), /ordinary search/); assert.throws(() => scopeOf({ state: 'active' }), /ordinary search/);
});

test('whole original bodies and metadata fit one shared UTF-8 packet limit', () => {
  const records = Array.from({ length: 20 }, (_, index) => fact(index + 1, '界'.repeat(150)));
  const packet = renderExtractPacket(records);
  assert.ok(bytes(packet.text) <= 3072); assert.ok(packet.ids.length < 20); assert.match(packet.text, /partial/);
  for (const id of packet.ids) assert.ok(packet.text.includes(records[id - 1].body));
  assert.equal(renderExtractPacket(records, { maxBytes: 10 }).text, '');
  const candidates = admitCandidates(records); assert.ok(bytes(JSON.stringify(candidates.facts)) <= 4096); assert.equal(candidates.truncated, true);
});

test('strict model protocol rejects invented IDs, escalation, shell syntax and arbitrary output', () => {
  const pool = new Map([[1, fact(1)]]);
  assert.deepEqual(validateSelection(reply([1], ['plain words']), pool).select, [1]);
  for (const bad of ['not JSON', reply([9]), reply([1, 1]), reply([1], ['$(cat .env)']), reply([1], [], ['arbitrary']), JSON.stringify({ version: 1, select: [1], queries: [], gaps: [], everyone: true }), 'x'.repeat(4097)]) assert.throws(() => validateSelection(bad, pool));
});

test('broker executes bounded alternative queries under fixed scope and verifies in one batch', async t => {
  const ctx = context(t), task = issueTask(ctx, 'identity'), store = storeFor([fact(1), fact(2)]);
  const result = await invoke(ctx, task, { store, host: hostFor([reply([1], ['alternative wording', 'another wording']), reply([2, 1])]) }, { scope: { slug: 'topic', author: 'dev@example.com' }, usageReport: true });
  assert.deepEqual(result.ids, [2, 1]); assert.equal(result.report.modelCalls, 2); assert.equal(store.calls.length, 4);
  assert.ok(store.calls.every(call => /LIMIT 20/.test(call.sql) && call.params.includes('topic') && call.params.includes('%dev@example.com%')));
  assert.match(store.calls.at(-1).sql, /f.id IN \(\?, \?\)/);
  assert.equal(result.report.tokenUsage, 'unknown'); assert.equal(result.report.evidence, 'recorded protocol');
  const reportFile = join(ctx.stateDir, 'extract-reports', readdirSync(join(ctx.stateDir, 'extract-reports'))[0]);
  assert.doesNotMatch(readFileSync(reportFile, 'utf8'), /Original evidence|CLOUDFLARE|session_id/);
  const repeated = await invoke(ctx, task, { store, host: hostFor([]) });
  assert.deepEqual(repeated.ids, []); assert.match(repeated.text, /search_limit/);
  const ledger = readFileSync(join(ctx.stateDir, 'extract-tasks', `${task}.json`), 'utf8'); assert.doesNotMatch(ledger, /Original evidence/);
});

test('invalid or unavailable model falls back without another call; already loaded evidence is omitted', async t => {
  for (const response of [reply([999]), new Error('model unavailable'), 'x'.repeat(4097)]) {
    const ctx = context(t), task = issueTask(ctx, 'identity');
    const result = await invoke(ctx, task, { store: storeFor([fact(1), fact(2)]), host: hostFor([response]) }, { loaded: [2] });
    assert.equal(result.status, 'fallback'); assert.deepEqual(result.ids, [1]); assert.equal(result.report.modelCalls, 1); assert.match(result.text, /already_supplied/);
  }
});

test('unsupported hosts use verified fallback and failed final verification returns no stale evidence', async t => {
  for (const kind of ['auth', 'network']) {
    const ctx = context(t), task = issueTask(ctx, 'identity');
    const store = storeFor([fact(1)], (_sql, number) => { if (number === 2) throw Object.assign(new Error('refused'), { kind }); });
    const result = await invoke(ctx, task, { store, host: { supported: false, reason: 'unsupported_host' } });
    assert.deepEqual(result.ids, []); assert.equal(result.status, kind === 'auth' ? 'denied' : 'unavailable'); assert.doesNotMatch(result.text, /Original evidence/);
  }
  const ctx = context(t); const result = await invoke(ctx, issueTask(ctx, 'identity'), { store: storeFor([fact(1)]), host: { supported: false, reason: 'unsupported_host' } });
  assert.equal(result.status, 'fallback'); assert.match(result.text, /unsupported_host/);
});

test('new supersession and revoked visibility never return cached candidates', async t => {
  for (const change of ['superseded', 'revoked']) {
    const ctx = context(t), records = [fact(1), fact(2)];
    const store = storeFor(records, (_sql, number) => { if (number === 2) { if (change === 'superseded') records[0].superseded_by = 2; else records.splice(0, 1); } });
    const result = await invoke(ctx, issueTask(ctx, 'identity'), { store, host: hostFor([reply([1, 2])]) });
    assert.deepEqual(result.ids, [2]); assert.equal(result.status, 'partial'); assert.match(result.text, /changed_evidence/); assert.doesNotMatch(result.text, /Original evidence 1/);
  }
});

test('oversized multibyte input and spent output allowances stop work without budget reset', async t => {
  const ctx = context(t), task = issueTask(ctx, 'identity');
  const result = await invoke(ctx, task, { store: storeFor([fact(1)]), host: hostFor([]) }, { question: '界'.repeat(5000) });
  assert.equal(result.report.modelCalls, 0); assert.match(result.text, /input_limit/);
  await withTask(ctx, task, 'identity', Date.now() + 1000, ({ ledger, reserve }) => reserve('output', 3072 - ledger.output));
  const exhausted = await invoke(ctx, task, { store: storeFor([fact(1)]), host: { supported: false, reason: 'unsupported_host' } });
  assert.equal(exhausted.text, ''); assert.equal(exhausted.code, 3);
});

test('Claude adapter preserves auth and disables tools, MCP, hooks, skills, persistence and retries', async () => {
  let calls = 0, launch;
  const host = await prepareExtractHost({ agent: 'claude', model: 'caller-model', env: { ANTHROPIC_API_KEY: 'host-auth', CLOUDFLARE_MEMORY_TOKEN: 'store-secret', GH_TOKEN: 'github-secret', CLAUDE_CODE_MAX_RETRIES: '9' }, run: async (_command, args, options) => {
    calls += 1;
    if (args.includes('--help')) return isolatedClaudeArgs().join(' ');
    launch = { args, options }; return JSON.stringify({ result: reply(), usage: { input_tokens: 3, output_tokens: 2 }, modelUsage: { 'actual-model': {} } });
  } });
  assert.equal(host.supported, true);
  const result = await host.call('only bounded input'); host.close();
  assert.equal(calls, 2); assert.equal(result.model, 'actual-model'); assert.equal(launch.options.env.ANTHROPIC_API_KEY, 'host-auth');
  assert.equal(launch.options.env.CLOUDFLARE_MEMORY_TOKEN, undefined); assert.equal(launch.options.env.GH_TOKEN, undefined);
  assert.equal(launch.options.env.CLAUDE_CODE_MAX_RETRIES, '0'); assert.equal(launch.options.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS, '2048');
  assert.ok(launch.args.includes('--safe-mode')); assert.equal(launch.args[launch.args.indexOf('--tools') + 1], '');
  assert.ok(launch.args.includes('--strict-mcp-config')); assert.ok(launch.args.includes('--no-session-persistence'));
  assert.notEqual(launch.options.cwd, process.cwd());
  assert.equal((await prepareExtractHost({ agent: 'codex' })).supported, false);
  assert.equal((await prepareExtractHost({ agent: 'claude', env: { CLAUDE_CODE_MANAGED_SETTINGS_DIR: '/policy' } })).supported, false);
  assert.equal((await prepareExtractHost({ agent: 'claude', run: async () => 'unsupported flags' })).supported, false);
});

test('child output is bounded and cancellation kills the isolated process', async () => {
  await assert.rejects(bufferedProcess(process.execPath, ['-e', 'process.stdout.write("x".repeat(100))'], { cap: 10 }), /oversized/);
  await assert.rejects(bufferedProcess(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { signal: AbortSignal.timeout(50) }), /deadline/);
  await assert.rejects(bufferedProcess('wong-nonexistent-model-binary', []), /unavailable/);
  assert.equal(await bufferedProcess(process.execPath, ['-e', 'process.stdout.write("ok")']), 'ok');
});

test('experimental CLI binds handles to filters, retains ordinary state search, and reads no transcripts', async t => {
  const env = await setup(t);
  env.fake.db.prepare('INSERT INTO facts (slug,type,body,source,created_at,author) VALUES (?,?,?,?,?,?)').run('topic', 'project', 'Original topic evidence.', 'migration', '2026-10-01', 'dev@example.com');
  const issued = await memory(env.repo, env.fake, ['extract-task', '--slug', 'topic']); assert.equal(issued.code, 0, issued.stderr);
  const result = await memory(env.repo, env.fake, ['extract', 'topic', '--task', issued.stdout.trim(), '--slug', 'topic', '--agent', 'codex']);
  assert.equal(result.code, 0, result.stderr); assert.match(result.stdout, /fallback/); assert.match(result.stdout, /Original topic evidence/);
  assert.ok(env.fake.calls.every(call => !call.includes('/r2/')));
  const mismatch = await memory(env.repo, env.fake, ['extract', 'topic', '--task', issued.stdout.trim(), '--slug', 'other', '--agent', 'codex']);
  assert.notEqual(mismatch.code, 0); assert.equal(mismatch.stdout, '');
  const unsupported = await memory(env.repo, env.fake, ['extract', 'topic', '--task', issued.stdout.trim(), '--state', 'active']); assert.notEqual(unsupported.code, 0); assert.match(unsupported.stderr, /ordinary search/);
  assert.equal((await memory(env.repo, env.fake, ['search', 'topic', '--state', 'conversation'])).code, 0);
});

test('a hung store stops under the shared twenty-second request deadline without cached facts', { timeout: 30000 }, async t => {
  const env = await setup(t);
  const task = await memory(env.repo, env.fake, ['extract-task']);
  env.fake.setOffline('hang');
  const started = Date.now();
  const result = await memory(env.repo, env.fake, ['extract', 'topic', '--task', task.stdout.trim(), '--agent', 'codex']);
  assert.equal(result.code, 1); assert.match(result.stdout, /unavailable/); assert.doesNotMatch(result.stdout, /Fact #|No matching/);
  const elapsed = Date.now() - started;
  assert.ok(elapsed >= 19000 && elapsed < 26000, `deadline enforcement elapsed ${elapsed}ms`);
});

test('bounded candidate reads retain tag aliases and report row/byte truncation', async t => {
  const env = await setup(t);
  env.fake.db.prepare("INSERT INTO tags (name, definition, created_at) VALUES ('memory', 'Memory evidence.', 'now')").run();
  env.fake.db.prepare("INSERT INTO tags (name, definition, alias_of, created_at) VALUES ('memory-worker', 'Alias.', 'memory', 'now')").run();
  const insert = env.fake.db.prepare('INSERT INTO facts (slug,type,body,source,created_at,author) VALUES (?,?,?,?,?,?) RETURNING id');
  for (let index = 0; index < 25; index += 1) {
    const row = insert.get('topic', 'project', `Topic evidence ${index} ${'界'.repeat(150)}`, 'migration', '2026-10-01', 'dev@example.com');
    env.fake.db.prepare('INSERT INTO fact_tags (fact_id, tag) VALUES (?,?)').run(row.id, 'memory-worker');
  }
  insert.get('other', 'project', 'Topic unrelated without requested tag.', 'migration', '2026-10-02', 'dev@example.com');
  const issued = await memory(env.repo, env.fake, ['extract-task', '--tag', 'memory']);
  const result = await memory(env.repo, env.fake, ['extract', 'topic', '--task', issued.stdout.trim(), '--tag', 'memory', '--agent', 'codex']);
  assert.equal(result.code, 0, result.stderr); assert.match(result.stdout, /candidate_limit/); assert.match(result.stdout, /Topic evidence/);
  assert.doesNotMatch(result.stdout, /unrelated without/); assert.ok(bytes(result.stdout) <= 3072);
});
