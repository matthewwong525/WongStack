import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFile, execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { buildDigest, consolidationDue, currentSlug, formatRun, MAX_BYTES, MAX_LINES } from '../../.agents/skills/memory/scripts/lib/digest.mjs';
import { codexDayDir, escapeClaude, registerSession } from '../../.agents/skills/memory/scripts/lib/transcripts.mjs';
import { COMMANDS } from '../../.agents/skills/memory/scripts/memory.mjs';
import { SCRIPT } from '../../.agents/skills/memory/scripts/lib/store.mjs';
import { MAX_TRANSCRIPT_BYTES } from '../../.agents/skills/memory/worker/memory-worker.mjs';
import { agentCommand, runbook, takeLock, withInputDir } from '../../.agents/skills/memory/scripts/run.mjs';
import { memory, node, rows, SECRET, setup, tempDir, writeJsonFile } from './fixtures/memory/harness.mjs';

const HOUR = 3600 * 1000;
const age = (file, ms) => { const time = new Date(Date.now() - ms); utimesSync(file, time, time); };
const uuid = n => `0000000${n}-0000-4000-8000-00000000000${n}`.slice(-36);

function claudeSession(env, n, messages, { cwd = env.repo.root, dir = escapeClaude(env.repo.root), sub } = {}) {
  const id = uuid(n);
  const folder = join(env.repo.claudeHome, dir, ...(sub ? [id, 'subagents'] : []));
  mkdirSync(folder, { recursive: true });
  const file = join(folder, sub ? `agent-${n}.jsonl` : `${id}.jsonl`);
  const lines = messages.map(([role, content], index) => JSON.stringify({ type: role, uuid: `u${index}`, sessionId: id, cwd, gitBranch: 'main', timestamp: '2026-09-20T10:00:00Z', isSidechain: Boolean(sub), message: { role, content } }));
  writeFileSync(file, `${lines.join('\n')}\n`);
  age(file, 2 * HOUR);
  registerSession({ stateDir: env.repo.stateDir, machineId: env.repo.machineId }, { id: `claude:${id}`, agent: 'claude', transcript: file, cwd });
  return { id: `claude:${id}`, file };
}

function codexSession(env, n, messages) {
  const id = uuid(n);
  const dir = codexDayDir(env.repo.codexHome, new Date());
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `rollout-2026-09-20T10-00-00-${id}.jsonl`);
  const lines = [JSON.stringify({ type: 'session_meta', payload: { id, cwd: env.repo.root, git: { branch: 'feature' }, timestamp: '2026-09-20T10:00:00Z' } }),
    JSON.stringify({ type: 'response_item', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: '<environment_context>cwd</environment_context>' }] } }),
    ...messages.map(([role, text]) => JSON.stringify({ type: 'response_item', payload: { type: 'message', role, content: [{ type: role === 'user' ? 'input_text' : 'output_text', text }] } }))];
  writeFileSync(file, `${lines.join('\n')}\n`);
  age(file, 3 * HOUR);
  registerSession({ stateDir: env.repo.stateDir, machineId: env.repo.machineId }, { id: `codex:${id}`, agent: 'codex', transcript: file, cwd: env.repo.root });
  return { id: `codex:${id}`, file };
}

const register = (env, entry) => registerSession({ stateDir: env.repo.stateDir, machineId: env.repo.machineId }, entry);

test('capture selects only machine-owned registered transcripts, and skips subagents, background runs, deleted worktrees, and fresh sessions', async t => {
  const env = await setup(t);
  const live = claudeSession(env, 1, [['user', 'Plan the search.'], ['assistant', 'Done.']]);
  claudeSession(env, 2, [['user', 'sub work']], { sub: true });
  const background = claudeSession(env, 3, [['user', 'background']]);
  register(env, { id: background.id, agent: 'claude', transcript: background.file, background: true });
  const historical = claudeSession(env, 4, [['user', 'unregistered history']], { cwd: '/gone/worktree', dir: escapeClaude('/gone/worktree') });
  const registry = join(env.repo.stateDir, 'registry.jsonl');
  writeFileSync(registry, readFileSync(registry, 'utf8').split('\n').filter(line => !line.includes(historical.id)).join('\n'));
  const moved = claudeSession(env, 5, [['user', 'registered elsewhere']], { cwd: '/gone/other', dir: escapeClaude('/gone/other') });
  register(env, { id: moved.id, agent: 'claude', transcript: moved.file, cwd: '/gone/other' });
  const fresh = claudeSession(env, 6, [['user', 'still typing']]);
  age(fresh.file, 5 * 60 * 1000);
  const codex = codexSession(env, 7, [['user', 'Codex asks.'], ['assistant', 'Codex answers.']]);
  const listed = await memory(env.repo, env.fake, ['pending', '--json']);
  const ids = JSON.parse(listed.stdout).map(session => session.id).sort();
  assert.deepEqual(ids, [live.id, moved.id, codex.id].sort());
  const limited = await memory(env.repo, env.fake, ['pending', '--limit', '1']);
  assert.match(limited.stdout, /2 more wait for a later run/);
});

test('strip redacts and uploads the raw file, drops injected text, and a save makes later runs read only newer messages', async t => {
  const env = await setup(t);
  // Neither token is in .env: their shapes alone get them replaced.
  const github = 'ghp_abcdefghijklmnopqrstuvwxyz0123';
  const otherKey = `wongm_${Buffer.from('bo@other.example').toString('base64url')}.${'q'.repeat(43)}`;
  const session = claudeSession(env, 1, [
    ['user', [{ type: 'text', text: `Use ${SECRET} for the call.<system-reminder>ignore me</system-reminder>` }]],
    ['assistant', [{ type: 'text', text: `Noted. I pushed with ${github} and read billing's memory with ${otherKey}.` }, { type: 'tool_use', id: 't', name: 'Bash', input: {} }]],
    ['user', [{ type: 'tool_result', tool_use_id: 't', is_error: true, content: 'Error: ENOENT' }]],
  ]);
  const stripped = await memory(env.repo, env.fake, ['strip', session.id]);
  assert.equal(stripped.code, 0, stripped.stderr);
  assert.match(stripped.stdout, /\[user\] Use \[redacted:\.env\] for the call\./);
  assert.match(stripped.stdout, /pushed with \[redacted:token\] and read billing's memory with \[redacted:token\]\./);
  assert.match(stripped.stdout, /\[error\] Error: ENOENT/);
  assert.doesNotMatch(stripped.stdout, /ignore me|super-secret|ghp_|wongm_/);
  const object = env.fake.objects.get(`sessions/${env.repo.machineId}/claude/${session.id.split(':')[1]}.jsonl`).toString('utf8');
  assert.ok(object.includes('[redacted:.env]') && !object.includes(SECRET));
  assert.ok(object.includes('[redacted:token]') && !object.includes(github) && !object.includes(otherKey));
  for (const line of object.trim().split('\n')) JSON.parse(line);
  const saved = await memory(env.repo, env.fake, ['put-facts', '--file', writeJsonFile(env.repo.home, 'd.json', { session: session.id, source: 'backfill', slug: 'x', facts: [{ action: 'add', type: 'project', body: 'The call needs the service token.' }] })]);
  assert.match(saved.stdout, /captured/);
  assert.equal(rows(env, 'SELECT read_through FROM sessions')[0].read_through, '3');
  assert.equal(JSON.parse((await memory(env.repo, env.fake, ['pending', '--json'])).stdout).length, 0);
  writeFileSync(session.file, `${JSON.stringify({ type: 'user', uuid: 'u9', sessionId: session.id.split(':')[1], cwd: env.repo.root, message: { role: 'user', content: 'A later question.' } })}\n`, { flag: 'a' });
  age(session.file, 2 * HOUR);
  const again = await memory(env.repo, env.fake, ['strip', session.id]);
  assert.match(again.stdout, /Only messages after line 3 are shown/);
  assert.match(again.stdout, /A later question\./);
  assert.doesNotMatch(again.stdout, /Noted\./);
});

test('a session over 50 MB keeps its facts but not its transcript, and source says why', async t => {
  const env = await setup(t);
  const session = claudeSession(env, 1, [['user', 'Load the export.'], ['assistant', [{ type: 'tool_use', id: 't', name: 'Read', input: { data: 'x'.repeat(MAX_TRANSCRIPT_BYTES) } }]]]);
  const stripped = await memory(env.repo, env.fake, ['strip', session.id]);
  assert.equal(stripped.code, 0, stripped.stderr);
  assert.match(stripped.stdout, /The full transcript is 51 MB, over the 50 MB limit, so it is not kept; capture its facts as usual\./);
  assert.match(stripped.stdout, /\[user\] Load the export\./);
  assert.equal(env.fake.objects.size, 0, 'nothing was uploaded');
  const saved = await memory(env.repo, env.fake, ['put-facts', '--file', writeJsonFile(env.repo.home, 'd.json', { session: session.id, source: 'save', slug: 'x', facts: [{ action: 'add', type: 'project', body: 'The export is loaded by hand.' }] })]);
  assert.match(saved.stdout, /added 1.*captured/);
  const [row] = rows(env, 'SELECT raw_key, raw_bytes, status FROM sessions');
  assert.equal(row.raw_key, null);
  assert.ok(row.raw_bytes > MAX_TRANSCRIPT_BYTES, `${row.raw_bytes} bytes recorded`);
  assert.equal(row.status, 'captured');
  const [fact] = rows(env, 'SELECT id FROM facts');
  const source = await memory(env.repo, env.fake, ['source', String(fact.id)]);
  assert.match(source.stdout, /the transcript was 51 MB, over the 50 MB limit, so it was not kept\./);
});

// A session an earlier version recorded as private, before #private was retired.
const recordedPrivate = (env, id) => rows(env, "INSERT INTO sessions (id, agent, status, reason, updated_at) VALUES (?, 'claude', 'private', '#private', '2026-09-01T00:00:00Z')", id);

test('a message saying #private is captured and its transcript uploaded like any other', async t => {
  const env = await setup(t);
  const session = claudeSession(env, 1, [['user', 'Plans for the launch.'], ['assistant', 'OK.'], ['user', 'Keep this one #private please.']]);
  const result = await memory(env.repo, env.fake, ['strip', session.id]);
  assert.equal(result.code, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /^private:/m);
  assert.match(result.stdout, /Plans for the launch/);
  assert.equal(env.fake.objects.size, 1);
  const kept = await memory(env.repo, env.fake, ['keep-transcript', session.id]);
  assert.match(kept.stdout, /kept: /);
});

test('a session recorded as private before stays private: strip uploads and prints nothing, and it is not pending again', async t => {
  const env = await setup(t);
  const session = claudeSession(env, 1, [['user', 'Secret plans.'], ['assistant', 'OK.']]);
  recordedPrivate(env, session.id);
  const result = await memory(env.repo, env.fake, ['strip', session.id]);
  assert.match(result.stdout, /private: .* recorded as private/);
  assert.doesNotMatch(result.stdout, /Secret plans/);
  assert.equal(env.fake.objects.size, 0);
  assert.deepEqual(rows(env, 'SELECT status, raw_key FROM sessions'), [{ status: 'private', raw_key: null }]);
  const pendingNow = JSON.parse((await memory(env.repo, env.fake, ['pending', '--json'])).stdout);
  assert.equal(pendingNow.some(item => item.id === session.id), false);
});

test('keep-transcript uploads the redacted transcript and sets raw_key without touching capture', async t => {
  const env = await setup(t);
  const session = claudeSession(env, 1, [['user', `Use ${SECRET} for the call.`], ['assistant', 'Done.']]);
  register(env, { id: session.id, agent: 'claude', transcript: session.file, cwd: env.repo.root });
  const saved = await memory(env.repo, env.fake, ['put-facts', '--file', writeJsonFile(env.repo.home, 'd.json', { session: 'current', source: 'save', slug: 'x', facts: [{ action: 'add', type: 'project', body: 'The call needs the service token.' }] })]);
  assert.match(saved.stdout, /captured/);
  const before = rows(env, 'SELECT status, read_through FROM sessions')[0];
  const kept = await memory(env.repo, env.fake, ['keep-transcript', 'current']);
  assert.equal(kept.code, 0, kept.stderr);
  const key = `sessions/${env.repo.machineId}/claude/${session.id.split(':')[1]}.jsonl`;
  assert.match(kept.stdout, new RegExp(`kept: .* is in ${key}`));
  const object = env.fake.objects.get(key).toString('utf8');
  assert.ok(object.includes('[redacted:.env]') && !object.includes(SECRET));
  const [row] = rows(env, 'SELECT status, read_through, raw_key, raw_bytes FROM sessions');
  assert.deepEqual({ status: row.status, read_through: row.read_through }, before);
  assert.equal(row.raw_key, key);
  assert.equal(row.raw_bytes, Buffer.byteLength(object));

  const fresh = claudeSession(env, 2, [['user', 'Not captured yet.']]);
  assert.equal((await memory(env.repo, env.fake, ['keep-transcript', fresh.id])).code, 0);
  assert.deepEqual(rows(env, 'SELECT status, read_through FROM sessions WHERE id = ?', fresh.id), [{ status: 'skipped', read_through: null }]);
  assert.equal(JSON.parse((await memory(env.repo, env.fake, ['pending', '--json'])).stdout).some(item => item.id === fresh.id), true, 'the background run still captures it');
});

test('keep-transcript skips a private session, a store with no bucket, and one over 50 MB, with exit 0', async t => {
  const env = await setup(t);
  const secret = claudeSession(env, 1, [['user', 'Secret plans.']]);
  recordedPrivate(env, secret.id);
  const priv = await memory(env.repo, env.fake, ['keep-transcript', secret.id]);
  assert.equal(priv.code, 0, priv.stderr);
  assert.match(priv.stdout, /transcript not kept: .* was recorded as private/);
  const big = claudeSession(env, 2, [['user', 'Load the export.'], ['assistant', [{ type: 'tool_use', id: 't', name: 'Read', input: { data: 'x'.repeat(MAX_TRANSCRIPT_BYTES) } }]]]);
  const large = await memory(env.repo, env.fake, ['keep-transcript', big.id]);
  assert.equal(large.code, 0, large.stderr);
  assert.match(large.stdout, /transcript not kept: The full transcript is 51 MB, over the 50 MB limit/);
  assert.equal(env.fake.objects.size, 0);
  assert.equal(rows(env, 'SELECT raw_key FROM sessions WHERE id = ?', big.id)[0].raw_key, null);
  assert.deepEqual(rows(env, 'SELECT status, raw_key FROM sessions WHERE id = ?', secret.id), [{ status: 'private', raw_key: null }]);

  const bare = await setup(t, { bucket: false });
  const plain = claudeSession(bare, 3, [['user', 'Hello.']]);
  const none = await memory(bare.repo, bare.fake, ['keep-transcript', plain.id]);
  assert.equal(none.code, 0, none.stderr);
  assert.match(none.stdout, /transcript not kept: this store has no R2 bucket/);
  env.fake.setOffline(true);
  const offline = await memory(env.repo, env.fake, ['keep-transcript', claudeSession(env, 4, [['user', 'Hello.']]).id]);
  assert.equal(offline.code, 0, offline.stderr);
  assert.match(offline.stdout, /transcript not kept: memory store unreachable/);
});

test('Codex transcripts parse, and an unknown format is reported and stores nothing', async t => {
  const env = await setup(t);
  const codex = codexSession(env, 2, [['user', 'Codex asks.'], ['assistant', 'Codex answers.']]);
  const stripped = await memory(env.repo, env.fake, ['strip', codex.id]);
  assert.match(stripped.stdout, /branch feature/);
  assert.match(stripped.stdout, /\[user\] Codex asks\.\n\n\[assistant\] Codex answers\./);
  assert.doesNotMatch(stripped.stdout, /environment_context/);
  const weird = join(env.repo.home, 'weird.jsonl');
  writeFileSync(weird, '{"hello":"world"}\n');
  register(env, { id: 'claude:weird', agent: 'claude', transcript: weird });
  const unknown = await memory(env.repo, env.fake, ['strip', 'claude:weird']);
  assert.equal(unknown.code, 3);
  assert.match(unknown.stdout, /not recognized/);
  assert.equal(rows(env, "SELECT count(*) AS n FROM sessions WHERE id = 'claude:weird'")[0].n, 0);
});

const hook = (env, extraEnv = {}, input = { session_id: 'live-1', transcript_path: null, cwd: env.repo.root }) =>
  node(env.repo, env.fake, 'session-start.mjs', ['--agent', 'claude'], { input: JSON.stringify(input), env: extraEnv });

test('the hook adds nothing and starts nothing when there is nothing to do', async t => {
  const env = await setup(t);
  const result = await hook(env, { WONG_MEMORY_NO_HEADLESS: '1' });
  assert.equal(result.code, 0);
  assert.equal(result.stdout, '');
  assert.match(readFileSync(join(env.repo.stateDir, 'registry.jsonl'), 'utf8'), /"id":"claude:live-1"/);
});

test('the hook prints the digest with branch threads, and starts one detached run for pending work', async t => {
  const env = await setup(t);
  mkdirSync(join(env.repo.root, 'openspec/changes/add-po-search'), { recursive: true });
  writeFileSync(join(env.repo.root, 'openspec/changes/add-po-search/proposal.md'), '# x\n\n**Branch:** main\n');
  await memory(env.repo, env.fake, ['put-facts', '--file', writeJsonFile(env.repo.home, 'f.json', { source: 'save', slug: 'add-po-search', facts: [
    { action: 'add', type: 'user', body: 'The user runs the release.' },
    { action: 'add', type: 'reference', body: 'Dashboards live in Grafana.' },
    { action: 'add', type: 'project', body: 'Search ships in October.' },
    { action: 'add', type: 'thread', body: 'Should search rank by recency?', tags: ['plan'] },
    { action: 'add', type: 'feedback', body: 'User wants terse replies.' },
  ] })]);
  await memory(env.repo, env.fake, ['put-facts', '--file', writeJsonFile(env.repo.home, 'g.json', { source: 'save', slug: 'other-work', facts: [
    { action: 'add', type: 'thread', body: 'Is the other change blocked?', tags: ['worker'] },
  ] })]);
  claudeSession(env, 1, [['user', 'Old work.']]);
  const bin = join(env.repo.home, 'bin');
  mkdirSync(bin, { recursive: true });
  const marker = join(env.repo.home, 'claude-called');
  writeFileSync(join(bin, 'claude'), `#!/bin/sh\necho "$@" > "${marker}"\necho "RUN=$WONG_MEMORY_RUN" >> "${marker}"\n`);
  chmodSync(join(bin, 'claude'), 0o755);
  const result = await hook(env, { PATH: `${bin}:${process.env.PATH}`, WONG_MEMORY_MODEL: '' });
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /# Memory digest\nFacts are dated context.* Once you know the task, and before you act on more than a quick question, search memory for its key terms in your own words: /);
  assert.match(result.stdout, /## Open threads on `add-po-search`\n- \[thread\] Should search rank by recency\?.*\nOpen threads on other changes, by step: 1 untagged\. /);
  assert.doesNotMatch(result.stdout, /Is the other change blocked\?/);
  assert.match(result.stdout, /## Live facts\n- \[feedback\] .*\n- \[project\] .*\n- \[reference\] .*\n- \[user\] /);
  for (let i = 0; i < 100 && !existsSync(marker); i += 1) await new Promise(done => setTimeout(done, 100));
  const called = readFileSync(marker, 'utf8');
  assert.match(called, /-p You are the WongStack memory background run/);
  assert.match(called, /--no-session-persistence --permission-mode dontAsk --allowedTools Bash\(node \.claude\/skills\/memory\/scripts\/memory\.mjs:\*\)/);
  assert.doesNotMatch(called, /(^|\s)--model(\s|$)/);
  assert.match(called, /Never capture session claude:live-1/);
  assert.match(called, /RUN=1/);
  const fallback = await hook(env, { WONG_MEMORY_NO_HEADLESS: '1' });
  assert.match(fallback.stdout, /Start one background subagent/);
});

test('the hook prints the last tidy-up line once, and starts the next tidy-up detached', async t => {
  const env = await setup(t);
  const tidy = join(env.repo.root, '.git', 'wong-tidy');
  mkdirSync(tidy, { recursive: true });
  writeFileSync(join(tidy, 'report.json'), JSON.stringify({ closed: ['Old docs'], left: [{ name: 'Weekly plan', reason: 'it has unsaved work' }] }));
  const first = await hook(env, { WONG_MEMORY_NO_HEADLESS: '1' });
  assert.equal(first.code, 0, first.stderr);
  assert.equal(first.stdout, 'Tidy-up: closed 1 workspace ("Old docs"); left "Weekly plan" open: it has unsaved work.\n');
  assert.equal((await hook(env, { WONG_MEMORY_NO_HEADLESS: '1' })).stdout, '', 'the line prints once');
  assert.ok(!existsSync(join(tidy, 'last-sweep')), 'WONG_TIDY=0 starts no tidy-up');
  const temp = tempDir(t, 'hook-tmp-');
  const started = await hook(env, { WONG_MEMORY_NO_HEADLESS: '1', WONG_TIDY: '1', TMPDIR: temp, TIDY_PASEO_BIN: join(temp, 'no-paseo') });
  assert.equal(started.code, 0, started.stderr);
  for (let i = 0; i < 100 && !existsSync(join(tidy, 'last-sweep')); i += 1) await new Promise(done => setTimeout(done, 100));
  assert.ok(existsSync(join(tidy, 'last-sweep')), 'the hook started a tidy-up');
});

test('a broken tidy-up never breaks the hook', async t => {
  const env = await setup(t);
  const temp = tempDir(t, 'hook-tmp-');
  const extra = { WONG_MEMORY_NO_HEADLESS: '1', WONG_TIDY: '1', TMPDIR: temp, TIDY_PASEO_BIN: join(temp, 'no-paseo') };
  mkdirSync(join(env.repo.root, '.git', 'wong-tidy'));
  writeFileSync(join(env.repo.root, '.git', 'wong-tidy', 'report.json'), '{ torn');
  const torn = await hook(env, { ...extra, WONG_TIDY: '0' });
  assert.equal(torn.code, 0, torn.stderr);
  assert.equal(torn.stdout, '');
  rmSync(join(env.repo.root, '.git', 'wong-tidy'), { recursive: true, force: true });
  writeFileSync(join(env.repo.root, '.git', 'wong-tidy'), 'not a folder');
  const broken = await hook(env, extra);
  assert.equal(broken.code, 0, broken.stderr);
  assert.equal(broken.stdout, '');
});

test('an unreachable store falls back to the cached digest and never fails the session', async t => {
  const env = await setup(t);
  await memory(env.repo, env.fake, ['put-facts', '--file', writeJsonFile(env.repo.home, 'f.json', { source: 'save', slug: 's', facts: [{ action: 'add', type: 'project', body: 'Cached fact.' }] })]);
  env.fake.setOffline(true);
  const result = await hook(env);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Cached fact\./);
  assert.match(result.stdout, /This digest is cached and 0d old/);
  assert.match(result.stdout, /Memory: skipped the store/);
});

test('the run lock admits one run, and a stale lock is taken over', t => {
  const lock = join(tempDir(t, 'lock-'), 'run.lock');
  assert.equal(takeLock(lock), true);
  assert.equal(takeLock(lock), false);
  age(lock, 3 * HOUR);
  assert.equal(takeLock(lock), true);
  const vanished = join(tempDir(t, 'lock-'), 'run.lock');
  symlinkSync(join(tmpdir(), 'no-such-lock-target'), vanished);
  assert.equal(takeLock(vanished), true, 'a lock that is gone when it is checked is free');
});

test('the hook gives up on a store that never answers and uses the cached digest', async t => {
  const env = await setup(t);
  await memory(env.repo, env.fake, ['put-facts', '--file', writeJsonFile(env.repo.home, 'f.json', { source: 'save', slug: 's', facts: [{ action: 'add', type: 'project', body: 'Cached fact.' }] })]);
  env.fake.setOffline('hang');
  const result = await hook(env, { WONG_MEMORY_NO_HEADLESS: '1' });
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Cached fact\./);
  assert.match(result.stdout, /Memory: skipped the store \(memory store unreachable \(timeout\)/);
});

test('two writers of the seen-set at once keep both entries and never read a torn file', async t => {
  const file = join(tempDir(t, 'seen-'), 'seen.json');
  writeFileSync(file, '{}');
  const store = pathToFileURL(join(import.meta.dirname, '../../.agents/skills/memory/scripts/lib/store.mjs')).href;
  const writer = key => new Promise(done => execFile(process.execPath, ['--input-type=module', '-e', `
    import { readJson, writeJson } from ${JSON.stringify(store)};
    let torn = 0;
    for (let i = 0; i < 2000; i += 1) {
      const seen = readJson(${JSON.stringify(file)}, null);
      if (!seen) torn += 1;
      writeJson(${JSON.stringify(file)}, { ...seen, ${JSON.stringify(key)}: { size: i } });
    }
    console.log(torn);`], (error, stdout, stderr) => done(error ? stderr : Number(stdout))));
  assert.deepEqual(await Promise.all([writer('claude:a'), writer('claude:b')]), [0, 0]);
  assert.deepEqual(Object.keys(JSON.parse(readFileSync(file, 'utf8'))).sort(), ['claude:a', 'claude:b']);
});

test('the background runbook runs only the granted script and writes files only in its input folder', () => {
  const dir = '/tmp/wong-memory-test';
  const prompt = runbook('claude:live', dir);
  const [, args] = agentCommand('claude', prompt, '/state', dir);
  const at = args.indexOf('--allowedTools');
  assert.deepEqual(args.slice(at + 1, at + 3), [`Bash(${SCRIPT}:*)`, `Edit(/${dir}/**)`]);
  assert.equal(args[args.indexOf('--add-dir') + 1], dir);
  assert.doesNotMatch(prompt, /<</, 'the runbook never passes JSON through a heredoc');
  const prefix = `${args[at + 1].match(/^Bash\((.*):\*\)$/)[1]} `;
  const spans = [...prompt.matchAll(/`([^`\n]+)`/g)].map(match => match[1]);
  const codeLines = prompt.split('\n').filter(line => line.startsWith('node '));
  const commands = [...spans, ...codeLines].filter(text => text.startsWith('node ') || Object.hasOwn(COMMANDS, text.split(' ')[0]))
    .map(text => text.startsWith('node ') ? text : `${prefix}${text}`);
  for (const name of ['spool', 'pending', 'strip', 'gate', 'put-facts', 'due', 'live', 'finish-run']) {
    assert.ok(commands.some(command => command.startsWith(`${prefix}${name}`)), `the runbook names ${name}`);
  }
  for (const command of commands) {
    assert.ok(command.startsWith(prefix), `${command} is outside the grant`);
    assert.doesNotMatch(command, /(^|\s)>|[;|&]/, `${command} redirects to a file or chains another command`);
    const file = command.match(/--file (\S+)/)?.[1];
    if (file) assert.ok(file === '<input>' || file.startsWith(`${dir}/`), `${command} reads input from outside the folder`);
  }
  const fileWrites = prompt.split(/(?<=[.!?])\s+/).filter(sentence => /\b(write|create|save|edit)\b[^.]*\bfiles?\b/i.test(sentence) && !/^never\b/i.test(sentence.trim()));
  assert.ok(fileWrites.length > 0, 'the runbook says where to write its input');
  for (const sentence of fileWrites) assert.match(sentence, /input folder|\/tmp\/wong-memory-test/, `${sentence} writes outside the input folder`);
  const [, codex] = agentCommand('codex', prompt, '/state', dir);
  assert.ok(codex.includes(`sandbox_workspace_write.writable_roots=["/state","${dir}"]`));
});

test('background agent commands use the CLI default unless a memory model is explicitly set', () => {
  const prompt = 'Capture pending sessions';
  const argsFor = (agent, env) => agentCommand(agent, prompt, '/state', '/input', env)[1];
  for (const env of [{}, { WONG_MEMORY_MODEL: '', WONG_MEMORY_CODEX_MODEL: '' },
    { WONG_MEMORY_MODEL: '  ', WONG_MEMORY_CODEX_MODEL: '  ' }]) {
    assert.equal(argsFor('claude', env).includes('--model'), false);
    assert.equal(argsFor('codex', env).includes('-m'), false);
  }
  const env = { WONG_MEMORY_MODEL: 'claude-choice', WONG_MEMORY_CODEX_MODEL: 'codex-choice' };
  const claude = argsFor('claude', env);
  assert.deepEqual(claude.slice(claude.indexOf('--model'), claude.indexOf('--model') + 2), ['--model', 'claude-choice']);
  const codex = argsFor('codex', env);
  assert.deepEqual(codex.slice(codex.indexOf('-m'), codex.indexOf('-m') + 2), ['-m', 'codex-choice']);
  assert.equal(argsFor('claude', { WONG_MEMORY_CODEX_MODEL: 'codex-choice' }).includes('--model'), false);
  assert.equal(argsFor('codex', { WONG_MEMORY_MODEL: 'claude-choice' }).includes('-m'), false);
});

test('the input folder is outside the repo and is removed when the run fails', () => {
  let seen;
  assert.throws(() => withInputDir(dir => { seen = dir; writeFileSync(join(dir, 'put-1.json'), '{}'); throw new Error('run failed'); }), /run failed/);
  assert.ok(seen.startsWith(realpathSync(tmpdir())) && !seen.includes('.git'));
  assert.equal(existsSync(seen), false);
});

test('the digest stays within its limits and states what it left out', () => {
  const fact = (i, type, slug, words) => ({ id: i + 1, slug, type, body: `Fact number ${i} ${'with some words '.repeat(words)}`.trim(), author: 'a@b', created_at: '2026-09-01T00:00:00Z' });
  const facts = Array.from({ length: 400 }, (_, i) => fact(i, 'project', 's', 1));
  const threads = [fact(400, 'thread', 'add-po-search', 1), fact(401, 'thread', 'add-po-search', 1)];
  const now = Date.parse('2026-09-11T00:00:00Z');
  const text = buildDigest({ facts: [...threads, ...facts], live: 402, threads, slug: 'add-po-search', now });
  const lines = text.split('\n');
  assert.equal(lines.length, MAX_LINES);
  assert.deepEqual(lines.slice(2, 5), ['## Open threads on `add-po-search`', '- [thread] Fact number 400 with some words (add-po-search, 10d, a@b, #401)', '- [thread] Fact number 401 with some words (add-po-search, 10d, a@b, #402)']);
  assert.equal(lines[5], '## Live facts');
  assert.match(text, /- \[project\] Fact number 0 with some words \(s, 10d, a@b, #1\)/);
  assert.equal(lines.at(-1), '367 more live facts are not shown. Search them: `node .claude/skills/memory/scripts/memory.mjs search <terms>`.');
  const long = buildDigest({ facts: Array.from({ length: 400 }, (_, i) => fact(i, 'project', 's', 20)), now });
  assert.ok(Buffer.byteLength(long) <= MAX_BYTES && long.split('\n').length < MAX_LINES);
  assert.match(long.split('\n').at(-1), /^\d+ more live facts are not shown\. Search them:/);
  assert.equal(buildDigest({ facts: [] }), '');
});

test('the current change comes from the proposal Branch line, and consolidation needs a day and five sessions', t => {
  const dir = tempDir(t, 'slug-');
  mkdirSync(join(dir, 'openspec/changes/one'), { recursive: true });
  writeFileSync(join(dir, 'openspec/changes/one/proposal.md'), '**Branch:** feat/one\n');
  assert.equal(currentSlug(dir, 'feat/one'), 'one');
  assert.equal(currentSlug(dir, 'other'), null);
  const now = Date.parse('2026-09-25T00:00:00Z');
  assert.equal(consolidationDue({ last_consolidation: '2026-09-23T00:00:00Z', captured_since: 6 }, now), true);
  assert.equal(consolidationDue({ last_consolidation: '2026-09-23T00:00:00Z', captured_since: 2 }, now), false);
  assert.equal(consolidationDue({ last_consolidation: '2026-09-24T12:00:00Z', captured_since: 9 }, now), false);
  assert.equal(consolidationDue({ first_fact: '2026-09-01T00:00:00Z', captured_since: 5 }, now), true);
});

test('the session that started a background run can never be listed or stripped by it', async t => {
  const env = await setup(t);
  const own = claudeSession(env, 1, [['user', 'The live session.']]);
  const other = claudeSession(env, 2, [['user', 'An older session.']]);
  const exclude = { WONG_MEMORY_EXCLUDE: own.id };
  const listed = JSON.parse((await memory(env.repo, env.fake, ['pending', '--json'], { env: exclude })).stdout).map(session => session.id);
  assert.deepEqual(listed, [other.id]);
  const refused = await memory(env.repo, env.fake, ['strip', own.id], { env: exclude });
  assert.equal(refused.code, 1);
  assert.match(refused.stderr, /no transcript found/);
});

test('the hook loads only this repo\'s memory: no part comes from another repo', async t => {
  const env = await setup(t);
  await memory(env.repo, env.fake, ['put-facts', '--file', writeJsonFile(env.repo.home, 'f.json', { source: 'save', slug: 's', facts: [{ action: 'add', type: 'user', body: 'Prefers short replies.' }] })]);
  const result = await hook(env, { WONG_MEMORY_NO_HEADLESS: '1' });
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /# Memory digest[\s\S]*Prefers short replies/);
  assert.doesNotMatch(result.stdout, /From home|--home/);
});

// A fake headless agent: a shell script whose lines call the memory script as "$M", the way the model would.
function fakeAgent(env, lines) {
  const bin = join(env.repo.home, 'bin');
  mkdirSync(bin, { recursive: true });
  const script = join(import.meta.dirname, '../../.agents/skills/memory/scripts/memory.mjs');
  writeFileSync(join(bin, 'claude'), `#!/bin/sh\nM="${process.execPath} ${script}"\n${lines.join('\n')}\n`);
  chmodSync(join(bin, 'claude'), 0o755);
  return bin;
}

test('a run keeps its tally only while it runs, and records what was stored, not what the model says', async t => {
  const env = await setup(t);
  const tally = join(env.repo.stateDir, 'run-tally.json');
  const marker = join(env.repo.home, 'tally-seen');
  const bin = fakeAgent(env, [
    `test -f "${tally}" && echo yes > "${marker}"`,
    `$M finish-run --kind capture --status ok --counts '{"captured":4}'`,
  ]);
  const result = await node(env.repo, env.fake, 'run.mjs', ['--agent', 'claude'], { env: { PATH: `${bin}:${process.env.PATH}` } });
  assert.equal(result.code, 0, result.stderr);
  assert.equal(readFileSync(marker, 'utf8'), 'yes\n', 'the tally exists while the agent runs');
  assert.equal(existsSync(tally), false, 'the tally is gone after the run');
  assert.deepEqual(rows(env, 'SELECT status, counts, reason FROM runs'), [{ status: 'ok', counts: '{}', reason: 'model reported other counts: captured' }]);
  const digest = await memory(env.repo, env.fake, ['digest']);
  assert.match(digest.stdout, /Last background capture run \(.*\): nothing to do \(the run's own report differed\)/);
});

test('a background run runs upkeep once at its end, outside the tally', async t => {
  const env = await setup(t);
  const old = new Date(Date.now() - 31 * 86400000).toISOString();
  env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at) VALUES ('q', 'thread', 'Was this ever checked?', 'save', ?)").run(old);
  const bin = fakeAgent(env, [`$M finish-run --kind capture --status ok`]);
  const result = await node(env.repo, env.fake, 'run.mjs', ['--agent', 'claude'], { env: { PATH: `${bin}:${process.env.PATH}` } });
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(rows(env, "SELECT body FROM facts WHERE body LIKE 'Closed unchecked%'").map(row => row.body), [`Closed unchecked after 30 days (thread #1, ${old.slice(0, 10)}): Was this ever checked?`]);
  assert.deepEqual(rows(env, 'SELECT kind, counts FROM runs'), [{ kind: 'capture', counts: '{}' }]);
});

test('inside a run, put-facts and strip add what they stored to the tally, and finish-run records it', async t => {
  const env = await setup(t);
  const tally = join(env.repo.stateDir, 'run-tally.json');
  mkdirSync(env.repo.stateDir, { recursive: true });
  writeFileSync(tally, '{}\n');
  const inRun = { env: { WONG_MEMORY_RUN: '1' } };
  const kept = claudeSession(env, 1, [['user', 'Plan the search.'], ['assistant', 'Done.']]);
  const empty = claudeSession(env, 2, [['user', 'Hello.']]);
  const weird = join(env.repo.home, 'weird.jsonl');
  writeFileSync(weird, '{"hello":"world"}\n');
  register(env, { id: 'claude:weird', agent: 'claude', transcript: weird });
  for (const id of [kept.id, empty.id, 'claude:weird']) await memory(env.repo, env.fake, ['strip', id], inRun);
  await memory(env.repo, env.fake, ['put-facts', '--file', writeJsonFile(env.repo.home, 'a.json', { session: kept.id, source: 'backfill', slug: 's', facts: [
    { action: 'add', type: 'project', body: 'Search ranks by recency.' }, { action: 'drop', type: 'project', body: 'Already known.' }] })], inRun);
  await memory(env.repo, env.fake, ['put-facts', '--file', writeJsonFile(env.repo.home, 'b.json', { session: empty.id, source: 'backfill', slug: 's', facts: [], reason: 'nothing new' })], inRun);
  const failed = await memory(env.repo, env.fake, ['put-facts', '--file', writeJsonFile(env.repo.home, 'c.json', { session: empty.id, source: 'backfill', slug: 's', facts: [{ action: 'add', type: 'nope', body: 'x' }] })], inRun);
  assert.equal(failed.code, 1, 'a refused write adds nothing');
  assert.deepEqual(JSON.parse(readFileSync(tally, 'utf8')), { unrecognized: 1, captured: 1, added: 1, dropped: 1, skipped: 1 });
  const merged = await memory(env.repo, env.fake, ['put-facts', '--file', writeJsonFile(env.repo.home, 'm.json', { source: 'consolidation', slug: 's', facts: [
    { action: 'supersede', supersedes: [1], type: 'project', body: 'Search ranks by recency, newest first.' }] })], inRun);
  assert.equal(merged.code, 0, merged.stderr);
  await memory(env.repo, env.fake, ['finish-run', '--kind', 'consolidation', '--status', 'ok', '--counts', '{"merged":1,"superseded":1}'], inRun);
  await memory(env.repo, env.fake, ['finish-run', '--kind', 'capture', '--status', 'ok', '--counts', JSON.stringify({ captured: 1, skipped: 1, unrecognized: 1, added: 1, superseded: 0, dropped: 1 })], inRun);
  assert.deepEqual(rows(env, 'SELECT kind, counts, reason FROM runs ORDER BY id').map(run => ({ ...run, counts: JSON.parse(run.counts) })), [
    { kind: 'consolidation', counts: { merged: 1, superseded: 1 }, reason: null },
    { kind: 'capture', counts: { captured: 1, skipped: 1, unrecognized: 1, added: 1, dropped: 1 }, reason: null },
  ]);
});

test('a hand run writes no tally, and finish-run with no tally records --counts as given', async t => {
  const env = await setup(t);
  const tally = join(env.repo.stateDir, 'run-tally.json');
  const facts = name => ['put-facts', '--file', writeJsonFile(env.repo.home, name, { source: 'save', slug: 's', facts: [{ action: 'add', type: 'project', body: `Fact ${name}.` }] })];
  await memory(env.repo, env.fake, facts('a.json'), { env: { WONG_MEMORY_RUN: '1' } });
  assert.equal(existsSync(tally), false, 'no tally file, no tally');
  writeFileSync(tally, '{}\n');
  await memory(env.repo, env.fake, facts('b.json'));
  assert.equal(readFileSync(tally, 'utf8'), '{}\n', 'outside a run, the tally is untouched');
  rmSync(tally);
  await memory(env.repo, env.fake, ['finish-run', '--kind', 'capture', '--status', 'ok', '--counts', '{"captured":4}'], { env: { WONG_MEMORY_RUN: '1' } });
  assert.deepEqual(rows(env, 'SELECT counts, reason FROM runs'), [{ counts: '{"captured":4}', reason: null }]);
});

test("the digest's run line says when the run's own report differed", () => {
  const run = { kind: 'capture', host: 'box', finished_at: '2026-09-27T10:00:00Z', status: 'ok', counts: '{"captured":2}' };
  assert.equal(formatRun(run), 'Last background capture run (2026-09-27 10:00 UTC on box): captured 2');
  assert.equal(formatRun({ ...run, reason: 'model reported other counts: skipped' }), "Last background capture run (2026-09-27 10:00 UTC on box): captured 2 (the run's own report differed)");
  assert.equal(formatRun({ ...run, status: 'failed', reason: 'claude exited with code 1; model reported other counts: skipped' }), 'Last background capture run failed (2026-09-27 10:00 UTC on box): claude exited with code 1; model reported other counts: skipped');
});

// A repo with a .env and no memory store, and a store address that never answers: recent-chats must not call it.
function storelessRepo(t) {
  const root = tempDir(t, 'recent-repo-');
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root });
  writeFileSync(join(root, '.env'), `SERVICE_TOKEN=${SECRET}\n`);
  const home = tempDir(t, 'recent-home-');
  const machineId = randomUUID();
  const dataHome = join(home, 'data');
  mkdirSync(join(dataHome, 'wongstack'), { recursive: true });
  writeFileSync(join(dataHome, 'wongstack', 'machine-id'), `${machineId}\n`, { mode: 0o600 });
  const stateBase = join(home, 'state');
  return { repo: { root, home, machineId, dataHome, stateBase, claudeHome: join(home, 'claude'), codexHome: join(home, 'codex'), stateDir: join(stateBase, machineId) }, fake: { api: 'http://127.0.0.1:9/client/v4' } };
}

test('recent-chats shows only what the person typed, from every folder, redacted, newest first, with no store', async t => {
  const env = storelessRepo(t);
  const github = 'ghp_abcdefghijklmnopqrstuvwxyz0123';
  const other = claudeSession(env, 1, [['user', `Book the venue for the Lisbon offsite with ${github}.`], ['assistant', 'Agent reply text.']], { cwd: '/work/events', dir: escapeClaude('/work/events') });
  age(other.file, 5 * HOUR);
  claudeSession(env, 2, [['user', `My password is ${SECRET}.<pasted_content>someone else's notes</pasted_content>`]]);
  const old = claudeSession(env, 3, [['user', 'From last quarter.']]);
  age(old.file, 40 * 24 * HOUR);
  claudeSession(env, 4, [['user', 'Subagent brief.']], { sub: true });
  claudeSession(env, 7, [['user', '<task-notification>helper finished</task-notification>']]);
  const background = claudeSession(env, 8, [['user', 'Background run brief.']]);
  register(env, { id: background.id, agent: 'claude', transcript: background.file, background: true });
  codexSession(env, 5, [['user', 'Draft the bakery newsletter.'], ['assistant', 'Codex reply text.']]);
  const result = await memory(env.repo, env.fake, ['recent-chats']);
  assert.equal(result.code, 0, result.stderr);
  const out = result.stdout;
  assert.match(out, /- Book the venue for the Lisbon offsite with \[redacted:token\]\./);
  assert.match(out, /- My password is \[redacted:\.env\]\./);
  assert.match(out, /- Draft the bakery newsletter\./);
  assert.match(out, /## \d{4}-\d{2}-\d{2} · events \(claude\)/);
  assert.doesNotMatch(out, /reply text|From last quarter|Subagent brief|helper finished|Background run brief|someone else's notes|environment_context|ghp_|super-secret|\/work\/events/);
  assert.ok(out.indexOf('My password') < out.indexOf('Draft the bakery') && out.indexOf('Draft the bakery') < out.indexOf('Lisbon'), 'newest first');
  assert.doesNotMatch(out, /left out/);

  const capped = await memory(env.repo, env.fake, ['recent-chats', '--limit', '120']);
  assert.match(capped.stdout, /more chats left out at the 120-character cap/);
  assert.doesNotMatch(capped.stdout, /Lisbon/);
  const long = claudeSession(env, 6, [['user', 'x'.repeat(2000)]]);
  age(long.file, 0);
  assert.match((await memory(env.repo, env.fake, ['recent-chats'])).stdout, new RegExp(`- ${'x'.repeat(500)}…\\n`));
});

test('recent-chats with no recent chats says so and succeeds', async t => {
  const env = storelessRepo(t);
  const result = await memory(env.repo, env.fake, ['recent-chats', '--days', '7']);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'No Claude Code or Codex chats from the last 7 days on this computer.');
});

test('a new machine never adopts legacy cache, spool, registry or unregistered transcripts', async t => {
  const env = await setup(t);
  const legacy = env.repo.stateBase;
  writeFileSync(join(legacy, 'digest.md'), 'legacy private preference');
  mkdirSync(join(legacy, 'spool'), { recursive: true }); writeJsonFile(join(legacy, 'spool'), 'old.json', { facts: [{ body: 'legacy candidate' }] });
  const history = claudeSession(env, 8, [['user', 'historic private conversation']]);
  writeFileSync(join(env.repo.stateDir, 'registry.jsonl'), '');
  writeFileSync(join(legacy, 'registry.jsonl'), JSON.stringify({ id: history.id, transcript: history.file }) + '\n');
  assert.deepEqual(JSON.parse((await memory(env.repo, env.fake, ['pending', '--json'])).stdout), []);
  assert.equal((await memory(env.repo, env.fake, ['spool'])).stdout.trim(), 'The spool is empty.');
  const stripped = await memory(env.repo, env.fake, ['strip', history.id]); assert.equal(stripped.code, 1); assert.doesNotMatch(stripped.stdout, /historic private conversation/);
  env.fake.setOffline(true); const hookResult = await hook(env, { WONG_MEMORY_NO_HEADLESS: '1' });
  assert.doesNotMatch(hookResult.stdout, /legacy private preference/);
  assert.ok(existsSync(join(legacy, 'spool', 'old.json')));
});

test('new registered transcript capture writes its owned ledger before upload and leaves historical rows untouched', async t => {
  const env = await setup(t); const current = claudeSession(env, 9, [['user', 'New conversation']]);
  const kept = await memory(env.repo, env.fake, ['keep-transcript', current.id]); assert.match(kept.stdout, /kept:/);
  const row = rows(env, 'SELECT owner_machine_id, raw_key FROM sessions WHERE id = ?', current.id)[0];
  assert.equal(row.owner_machine_id, env.repo.machineId); assert.ok(env.fake.objects.has(row.raw_key));
  const historical = claudeSession(env, 7, [['user', 'Historical unowned private conversation']]);
  env.fake.db.prepare("INSERT INTO sessions (id, agent, author, status, updated_at) VALUES (?, 'claude', 'dev@example.com', 'captured', 'now')").run(historical.id);
  const count = env.fake.objects.size;
  const refused = await memory(env.repo, env.fake, ['strip', historical.id]); assert.equal(refused.code, 1);
  assert.doesNotMatch(refused.stdout, /Historical unowned private conversation/); assert.equal(env.fake.objects.size, count);
  assert.equal(rows(env, 'SELECT owner_machine_id FROM sessions WHERE id = ?', historical.id)[0].owner_machine_id, null);
});
