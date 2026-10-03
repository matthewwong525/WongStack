import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { buildDigest, consolidationDue, currentSlug, formatRun, MAX_BYTES, MAX_LINES } from '../../.agents/skills/memory/scripts/lib/digest.mjs';
import { codexDayDir, escapeClaude } from '../../.agents/skills/memory/scripts/lib/transcripts.mjs';
import { COMMANDS } from '../../.agents/skills/memory/scripts/memory.mjs';
import { SCRIPT } from '../../.agents/skills/memory/scripts/lib/store.mjs';
import { MAX_TRANSCRIPT_BYTES } from '../../.agents/skills/memory/worker/memory-worker.mjs';
import { agentCommand, runbook, withInputDir } from '../../.agents/skills/memory/scripts/run.mjs';
import { memory, node, rows, register as registerPrivate, SECRET, setup, tempDir, writeJsonFile } from './fixtures/memory/harness.mjs';

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
  return { id: `codex:${id}`, file };
}

const register = (env, entry) => registerPrivate(env.repo,entry);

test('discovery claims live checkouts and the registry, and skips subagents, background runs, deleted worktrees, and fresh sessions', async t => {
  const env = await setup(t);
  const live = claudeSession(env, 1, [['user', 'Plan the search.'], ['assistant', 'Done.']]);
  claudeSession(env, 2, [['user', 'sub work']], { sub: true });
  const background = claudeSession(env, 3, [['user', 'background']]);
  register(env, { id: background.id, agent: 'claude', transcript: background.file, background: true });
  claudeSession(env, 4, [['user', 'old worktree']], { cwd: '/gone/worktree', dir: escapeClaude('/gone/worktree') });
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
  const object = [...env.fake.objects.values()][0].toString('utf8');
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
  assert.match(result.stdout, /## Live facts\n- \[feedback\] .*\n- \[user\] .*\n- \[project\] .*\n- \[reference\] /);
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

test('the hook gives up on a store that never answers and uses the cached digest', async t => {
  const env = await setup(t);
  await memory(env.repo, env.fake, ['put-facts', '--file', writeJsonFile(env.repo.home, 'f.json', { source: 'save', slug: 's', facts: [{ action: 'add', type: 'project', body: 'Cached fact.' }] })]);
  env.fake.setOffline('hang');
  const result = await hook(env, { WONG_MEMORY_NO_HEADLESS: '1' });
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Cached fact\./);
  assert.match(result.stdout, /Memory: skipped the store \(machine-unreachable/);
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
  return { repo: { root, home, claudeHome: join(home, 'claude'), codexHome: join(home, 'codex'), stateDir: join(home, 'state') }, fake: { api: 'http://127.0.0.1:9/client/v4' } };
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

test('hook has one absolute deadline across awaits and network retry still starts an eligible background write',async t=>{
 const e=await setup(t);claudeSession(e,1,[['user','Pending business conversation.']]);e.fake.setDelay(2500);const bin=join(e.repo.home,'bin');mkdirSync(bin);const marker=join(e.repo.home,'background-write');
 const script=new URL('../../.agents/skills/memory/scripts/memory.mjs',import.meta.url).pathname;
 const input=writeJsonFile(e.repo.home,'background.json',{source:'backfill',slug:'background',facts:[{action:'add',type:'project',body:'Delayed startup still captures business work.'}]});
 writeFileSync(join(bin,'claude'),`#!/bin/sh\n"${process.execPath}" --import "${new URL('./fixtures/memory/transport.mjs',import.meta.url).pathname}" "${script}" put-facts --file "${input}" > "${marker}"\n`,{mode:0o755});
 const start=Date.now(),result=await hook(e,{PATH:bin+':'+process.env.PATH});assert.equal(result.code,0,result.stderr);assert.ok(Date.now()-start<2300,'hook returned within its overall budget plus process startup');e.fake.setDelay(0);
 for(let i=0;i<100&&!existsSync(marker);i++)await new Promise(done=>setTimeout(done,100));assert.ok(existsSync(marker));for(let i=0;i<100&&rows(e,'SELECT count(*) n FROM facts')[0].n===0;i++)await new Promise(done=>setTimeout(done,100));assert.equal(rows(e,'SELECT count(*) n FROM facts')[0].n,1);
});

test('keep-transcript redacts exact machine secrets and preserves an uncaptured session cursor',async t=>{
 const e=await setup(t),state=JSON.parse(readFileSync(join(e.repo.stateDir,'machine.json'))),session=claudeSession(e,8,[['user',`The saved bearer is ${state.credential.token} and key material is ${state.privateKey.d}.`]]);
 const kept=await memory(e.repo,e.fake,['keep-transcript',session.id]);assert.equal(kept.code,0,kept.stderr);assert.match(kept.stdout,/kept:/);const text=[...e.fake.objects.values()][0].toString();assert.ok(!text.includes(state.credential.token)&&!text.includes(state.privateKey.d));assert.match(text,/redacted/);
 const row=rows(e,'SELECT status,read_through FROM sessions WHERE id=?',session.id)[0];assert.equal(row.status,'skipped');assert.equal(row.read_through,null);assert.equal(JSON.parse((await memory(e.repo,e.fake,['pending','--json'])).stdout).length,1);
});
test('no bucket, oversized raw and offline keep-transcript remain honest while fact capture can continue',async t=>{
 const no=await setup(t,{bucket:false}),noSession=claudeSession(no,8,[['user','Useful notes without an optional raw bucket.']]);const missing=await memory(no.repo,no.fake,['keep-transcript',noSession.id]);assert.equal(missing.code,0);assert.match(missing.stdout,/no R2 bucket/);assert.equal(no.fake.objects.size,0);
 const e=await setup(t),session=claudeSession(e,8,[['user','x'.repeat(MAX_TRANSCRIPT_BYTES+1)]]);const large=await memory(e.repo,e.fake,['keep-transcript',session.id]);assert.equal(large.code,0);assert.match(large.stdout,/over the 50 MB limit/);assert.equal(e.fake.objects.size,0);assert.equal(rows(e,'SELECT status FROM sessions WHERE id=?',session.id)[0].status,'skipped');
 e.fake.setOffline(true);const offline=await memory(e.repo,e.fake,['keep-transcript',session.id]);assert.equal(offline.code,0);assert.match(offline.stdout,/transcript not kept:/);assert.equal(e.fake.objects.size,0);
});
test('lost stage and publish responses recover exact owned raw receipts without duplicate objects',async t=>{
 for(const action of ['stage','publish']){const e=await setup(t),session=claudeSession(e,8,[['user','The original customer conversation is retained privately.']]);e.fake.dropNext(action);const first=await memory(e.repo,e.fake,['keep-transcript',session.id]);assert.equal(first.code,0);assert.match(first.stdout,/transcript not kept:/);
 const second=await memory(e.repo,e.fake,['keep-transcript',session.id]);assert.equal(second.code,0,second.stderr);assert.match(second.stdout,/kept:/);assert.equal(e.fake.objects.size,1);const events=rows(e,"SELECT event,count(*) n FROM memory_runtime_transcripts GROUP BY event ORDER BY event");assert.deepEqual(events.map(x=>[x.event,x.n]),[['published',1],['staged',1]]);}
});
test('normal startup automatically drains an owned queued manual capture once after restart',async t=>{
 const e=await setup(t);e.fake.dropNext('capture');const input=writeJsonFile(e.repo.home,'queued-manual.json',{source:'save',slug:'manual',facts:[{action:'add',type:'project',body:'A queued manual capture needs no later manual write.'}]});const queued=await memory(e.repo,e.fake,['put-facts','--file',input]);assert.match(queued.stdout,/queued: capture/);
 const bin=join(e.repo.home,'bin');mkdirSync(bin);writeFileSync(join(bin,'claude'),'#!/bin/sh\nexit 0\n',{mode:0o755});const started=await hook(e,{PATH:bin+':'+process.env.PATH});assert.equal(started.code,0,started.stderr);
 for(let i=0;i<100&&JSON.parse(readFileSync(join(e.repo.stateDir,'pending-capture.json'))).length;i++)await new Promise(done=>setTimeout(done,100));assert.deepEqual(JSON.parse(readFileSync(join(e.repo.stateDir,'pending-capture.json'))),[]);assert.equal(rows(e,'SELECT count(*) n FROM facts')[0].n,1);
});
test('failed background run records actual private tally and model disagreement without team completion',async t=>{
 const e=await setup(t),tally=join(e.repo.stateDir,'run-tally.json');writeFileSync(tally,JSON.stringify({captured:2,added:3,unrecognized:1}),{mode:0o600});const result=await memory(e.repo,e.fake,['finish-run','--kind','capture','--status','failed','--counts','{"added":99}','--reason','agent stopped'],{env:{WONG_MEMORY_RUN:'1'}});assert.equal(result.code,0,result.stderr);
 const row=JSON.parse(readFileSync(join(e.repo.stateDir,'last-run.json')));assert.equal(row.status,'failed');assert.deepEqual(JSON.parse(row.counts),{captured:2,unrecognized:1,added:3});assert.match(row.reason,/agent stopped.*model reported other counts/);assert.equal(rows(e,'SELECT count(*) n FROM runs')[0].n,0);
});

test('rotated completed stage receives a distinct generation address, while old published raw remains readable',async t=>{
 const e=await setup(t),session=claudeSession(e,8,[['user','The same redacted bytes retain their generation address.']]);e.fake.dropNext('stage');await memory(e.repo,e.fake,['keep-transcript',session.id]);const machine=join(e.repo.stateDir,'machine.json'),state=JSON.parse(readFileSync(machine));state.credential.expiresAt=0;writeFileSync(machine,JSON.stringify(state),{mode:0o600});assert.equal((await memory(e.repo,e.fake,['join'])).code,0);
 const kept=await memory(e.repo,e.fake,['keep-transcript',session.id]);assert.match(kept.stdout,/kept:/);const staged=rows(e,"SELECT object_hash,credential_generation FROM memory_runtime_transcripts WHERE event='staged' ORDER BY credential_generation");assert.equal(staged.length,2);assert.notEqual(staged[0].object_hash,staged[1].object_hash);assert.deepEqual(staged.map(x=>x.credential_generation),[1,2]);assert.ok([...e.fake.objects.keys()].every(x=>x.includes('/g2/')));
 const current=JSON.parse(readFileSync(machine));current.credential.expiresAt=0;writeFileSync(machine,JSON.stringify(current),{mode:0o600});assert.equal((await memory(e.repo,e.fake,['join'])).code,0);const retained=await memory(e.repo,e.fake,['keep-transcript',session.id]);assert.match(retained.stdout,new RegExp(staged[1].object_hash));assert.equal(e.fake.objects.size,1);
 const fact=writeJsonFile(e.repo.home,'raw-source.json',{session:session.id,source:'backfill',slug:'raw',facts:[{action:'add',type:'project',body:'The source conversation is retained.'}]});assert.equal((await memory(e.repo,e.fake,['put-facts','--file',fact])).code,0);const source=await memory(e.repo,e.fake,['source',String(rows(e,'SELECT id FROM facts')[0].id)]);assert.equal(source.code,0,source.stderr);assert.match(source.stdout,/same redacted bytes/);
});
test('a partial raw stage quarantines recovery rather than rotating into a replacement address',async t=>{
 const e=await setup(t),session=claudeSession(e,8,[['user','An incomplete stage must never be adopted.']]);e.fake.dropNext('stage');await memory(e.repo,e.fake,['keep-transcript',session.id]);const stage=rows(e,"SELECT attempt_id FROM memory_runtime_transcripts WHERE event='staged'")[0],ddl=e.fake.db.prepare("SELECT sql FROM sqlite_master WHERE name='memory_runtime_completions_retained'").get().sql;e.fake.db.exec('DROP TRIGGER memory_runtime_completions_retained');e.fake.db.prepare('DELETE FROM memory_runtime_completions WHERE attempt_id=?').run(stage.attempt_id);e.fake.db.exec(ddl);
 const retry=await memory(e.repo,e.fake,['keep-transcript',session.id]);assert.equal(retry.code,0);assert.match(retry.stdout,/transcript not kept:/);assert.equal(rows(e,"SELECT count(*) n FROM memory_runtime_transcripts WHERE event='staged'")[0].n,1);assert.equal(e.fake.objects.size,0);
});

test('startup never reuses another installation namespace cached private digest',async t=>{
 const e=await setup(t);const input=writeJsonFile(e.repo.home,'private-cache.json',{source:'save',slug:'prefs',facts:[{action:'add',type:'feedback',body:'A private preference belongs to exactly this installation.'}]});assert.equal((await memory(e.repo,e.fake,['put-facts','--file',input])).code,0);assert.match(readFileSync(join(e.repo.stateDir,'digest.json'),'utf8'),/private preference/);
 const other={...e.fake.installation,repositoryId:'f'.repeat(32)};writeFileSync(join(e.repo.root,'.claude/.wong-stack.json'),JSON.stringify({components:{memory:{installation:other}}}));e.fake.setOffline(true);const result=await hook(e,{WONG_MEMORY_NO_HEADLESS:'1'});assert.equal(result.code,0);assert.doesNotMatch(result.stdout,/private preference|using cached/i);
});
test('actual concurrent failed transcript commands retain both private tally increments',async t=>{
 const e=await setup(t);writeFileSync(join(e.repo.stateDir,'run-tally.json'),'{}',{mode:0o600});for(const id of ['one','two']){const path=join(e.repo.home,id+'.jsonl');writeFileSync(path,'{"unknown":true}\n');register(e,{id:'claude:'+id,agent:'claude',transcript:path,cwd:e.repo.root});}
 const results=await Promise.all(['one','two'].map(id=>memory(e.repo,e.fake,['strip','claude:'+id],{env:{WONG_MEMORY_RUN:'1'}})));for(const result of results){assert.equal(result.code,3,result.stderr);assert.match(result.stdout,/not recognized/);}assert.equal(JSON.parse(readFileSync(join(e.repo.stateDir,'run-tally.json'))).unrecognized,2);
});
