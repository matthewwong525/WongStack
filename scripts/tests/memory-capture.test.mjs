import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { buildDigest, consolidationDue, currentSlug, MAX_BYTES, MAX_LINES } from '../../.agents/skills/memory/scripts/lib/digest.mjs';
import { codexDayDir, escapeClaude, registerSession } from '../../.agents/skills/memory/scripts/lib/transcripts.mjs';
import { COMMANDS } from '../../.agents/skills/memory/scripts/memory.mjs';
import { SCRIPT } from '../../.agents/skills/memory/scripts/lib/store.mjs';
import { agentCommand, runbook, takeLock, withInputDir } from '../../.agents/skills/memory/scripts/run.mjs';
import { memory, node, rows, SECRET, setup, setupHome, writeJsonFile } from './fixtures/memory/harness.mjs';

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

const register = (env, entry) => registerSession({ stateDir: env.repo.stateDir }, entry);

test('discovery claims live checkouts and the registry, and skips subagents, background runs, deleted worktrees, and fresh sessions', async () => {
  const env = await setup();
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

test('strip redacts and uploads the raw file, drops injected text, and a save makes later runs read only newer messages', async () => {
  const env = await setup();
  const session = claudeSession(env, 1, [
    ['user', [{ type: 'text', text: `Use ${SECRET} for the call.<system-reminder>ignore me</system-reminder>` }]],
    ['assistant', [{ type: 'text', text: 'Noted.' }, { type: 'tool_use', id: 't', name: 'Bash', input: {} }]],
    ['user', [{ type: 'tool_result', tool_use_id: 't', is_error: true, content: 'Error: ENOENT' }]],
  ]);
  const stripped = await memory(env.repo, env.fake, ['strip', session.id]);
  assert.equal(stripped.code, 0, stripped.stderr);
  assert.match(stripped.stdout, /\[user\] Use \[redacted:\.env\] for the call\./);
  assert.match(stripped.stdout, /\[error\] Error: ENOENT/);
  assert.doesNotMatch(stripped.stdout, /ignore me|super-secret/);
  const object = env.fake.objects.get(`sessions/claude/${session.id.split(':')[1]}.jsonl`).toString('utf8');
  assert.ok(object.includes('[redacted:.env]') && !object.includes(SECRET));
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

test('#private records the session and uploads and prints nothing', async () => {
  const env = await setup();
  const session = claudeSession(env, 1, [['user', 'Secret plans.'], ['assistant', 'OK.'], ['user', 'Keep this one #private please.']]);
  const result = await memory(env.repo, env.fake, ['strip', session.id]);
  assert.match(result.stdout, /private: .* recorded as private/);
  assert.doesNotMatch(result.stdout, /Secret plans/);
  assert.equal(env.fake.objects.size, 0);
  assert.deepEqual(rows(env, 'SELECT status, raw_key FROM sessions'), [{ status: 'private', raw_key: null }]);
});

test('Codex transcripts parse, and an unknown format is reported and stores nothing', async () => {
  const env = await setup();
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

test('the hook adds nothing and starts nothing when there is nothing to do', async () => {
  const env = await setup();
  const result = await hook(env, { WONG_MEMORY_NO_HEADLESS: '1' });
  assert.equal(result.code, 0);
  assert.equal(result.stdout, '');
  assert.match(readFileSync(join(env.repo.stateDir, 'registry.jsonl'), 'utf8'), /"id":"claude:live-1"/);
});

test('the hook prints the digest with branch threads, and starts one detached run for pending work', async () => {
  const env = await setup();
  mkdirSync(join(env.repo.root, 'openspec/changes/add-po-search'), { recursive: true });
  writeFileSync(join(env.repo.root, 'openspec/changes/add-po-search/proposal.md'), '# x\n\n**Branch:** main\n');
  await memory(env.repo, env.fake, ['put-facts', '--file', writeJsonFile(env.repo.home, 'f.json', { source: 'save', slug: 'add-po-search', facts: [
    { action: 'add', type: 'user', body: 'The user runs the release.' },
    { action: 'add', type: 'reference', body: 'Dashboards live in Grafana.' },
    { action: 'add', type: 'project', body: 'Search ships in October.' },
    { action: 'add', type: 'thread', body: 'Should search rank by recency?' },
    { action: 'add', type: 'feedback', body: 'User wants terse replies.' },
  ] })]);
  await memory(env.repo, env.fake, ['put-facts', '--file', writeJsonFile(env.repo.home, 'g.json', { source: 'save', slug: 'other-work', facts: [
    { action: 'add', type: 'thread', body: 'Is the other change blocked?' },
  ] })]);
  claudeSession(env, 1, [['user', 'Old work.']]);
  const bin = join(env.repo.home, 'bin');
  mkdirSync(bin, { recursive: true });
  const marker = join(env.repo.home, 'claude-called');
  writeFileSync(join(bin, 'claude'), `#!/bin/sh\necho "$@" > "${marker}"\necho "RUN=$WONG_MEMORY_RUN" >> "${marker}"\n`);
  chmodSync(join(bin, 'claude'), 0o755);
  const result = await hook(env, { PATH: `${bin}:${process.env.PATH}` });
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /# Memory digest\nFacts are dated context/);
  assert.match(result.stdout, /## Open threads on `add-po-search`\n- \[thread\] Should search rank by recency\?/);
  assert.match(result.stdout, /## Live facts\n- \[thread\] Is the other change blocked\?.*\n- \[feedback\] .*\n- \[project\] .*\n- \[reference\] .*\n- \[user\] /);
  for (let i = 0; i < 100 && !existsSync(marker); i += 1) await new Promise(done => setTimeout(done, 100));
  const called = readFileSync(marker, 'utf8');
  assert.match(called, /-p You are the WongStack memory background run/);
  assert.match(called, /--model haiku --no-session-persistence --permission-mode dontAsk --allowedTools Bash\(node \.claude\/skills\/memory\/scripts\/memory\.mjs:\*\)/);
  assert.match(called, /Never capture session claude:live-1/);
  assert.match(called, /RUN=1/);
  const fallback = await hook(env, { WONG_MEMORY_NO_HEADLESS: '1' });
  assert.match(fallback.stdout, /Start one background subagent/);
});

test('an unreachable store falls back to the cached digest and never fails the session', async () => {
  const env = await setup();
  await memory(env.repo, env.fake, ['put-facts', '--file', writeJsonFile(env.repo.home, 'f.json', { source: 'save', slug: 's', facts: [{ action: 'add', type: 'project', body: 'Cached fact.' }] })]);
  env.fake.setOffline(true);
  const result = await hook(env);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Cached fact\./);
  assert.match(result.stdout, /This digest is cached and 0d old/);
  assert.match(result.stdout, /Memory: skipped the store/);
});

test('the run lock admits one run, and a stale lock is taken over', () => {
  const lock = join(mkdtempSync(join(tmpdir(), 'lock-')), 'run.lock');
  assert.equal(takeLock(lock), true);
  assert.equal(takeLock(lock), false);
  age(lock, 3 * HOUR);
  assert.equal(takeLock(lock), true);
  const vanished = join(mkdtempSync(join(tmpdir(), 'lock-')), 'run.lock');
  symlinkSync(join(tmpdir(), 'no-such-lock-target'), vanished);
  assert.equal(takeLock(vanished), true, 'a lock that is gone when it is checked is free');
});

test('the hook exits inside its 5-second timeout when the store address does not answer', async () => {
  const env = await setup();
  await memory(env.repo, env.fake, ['put-facts', '--file', writeJsonFile(env.repo.home, 'f.json', { source: 'save', slug: 's', facts: [{ action: 'add', type: 'project', body: 'Cached fact.' }] })]);
  const started = Date.now();
  const result = await hook(env, { WONG_MEMORY_API: 'http://10.255.255.1', WONG_MEMORY_NO_HEADLESS: '1' });
  assert.ok(Date.now() - started < 5000, `the hook took ${Date.now() - started} ms`);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Cached fact\./);
  assert.match(result.stdout, /Memory: skipped the store \(memory store unreachable/);
});

test('two writers of the seen-set at once keep both entries and never read a torn file', async () => {
  const file = join(mkdtempSync(join(tmpdir(), 'seen-')), 'seen.json');
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
  assert.deepEqual(lines.slice(2, 5), ['## Open threads on `add-po-search`', '- [thread] Fact number 400 with some words (add-po-search, 10d, a, #401)', '- [thread] Fact number 401 with some words (add-po-search, 10d, a, #402)']);
  assert.equal(lines[5], '## Live facts');
  assert.match(text, /- \[project\] Fact number 0 with some words \(s, 10d, a, #1\)/);
  assert.equal(lines.at(-1), '367 more live facts are not shown. Search them: `node .claude/skills/memory/scripts/memory.mjs search <terms>`.');
  const long = buildDigest({ facts: Array.from({ length: 400 }, (_, i) => fact(i, 'project', 's', 20)), now });
  assert.ok(Buffer.byteLength(long) <= MAX_BYTES && long.split('\n').length < MAX_LINES);
  assert.match(long.split('\n').at(-1), /^\d+ more live facts are not shown\. Search them:/);
  assert.equal(buildDigest({ facts: [] }), '');
});

test('the current change comes from the proposal Branch line, and consolidation needs a day and five sessions', () => {
  const dir = mkdtempSync(join(tmpdir(), 'slug-'));
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

test('the session that started a background run can never be listed or stripped by it', async () => {
  const env = await setup();
  const own = claudeSession(env, 1, [['user', 'The live session.']]);
  const other = claudeSession(env, 2, [['user', 'An older session.']]);
  const exclude = { WONG_MEMORY_EXCLUDE: own.id };
  const listed = JSON.parse((await memory(env.repo, env.fake, ['pending', '--json'], { env: exclude })).stdout).map(session => session.id);
  assert.deepEqual(listed, [other.id]);
  const refused = await memory(env.repo, env.fake, ['strip', own.id], { env: exclude });
  assert.equal(refused.code, 1);
  assert.match(refused.stderr, /no transcript found/);
});

async function homeWithPerson(env) {
  const home = await setupHome(env, { email: 'ana@mail.com' });
  mkdirSync(join(home.root, 'wiki', 'people'), { recursive: true });
  writeFileSync(join(home.root, 'wiki', 'people', 'hana.md'), '# Hana\n\nGit email: hana@mail.com\n');
  writeFileSync(join(home.root, 'wiki', 'people', 'ana.md'), `# Ana\n\nGit emails: ana@corp.com, ana@mail.com\n\nPrefers short replies.\n\n${'More notes. '.repeat(500)}\n`);
  const facts = Array.from({ length: 20 }, (_, i) => ({ action: 'add', type: i % 2 ? 'user' : 'feedback', body: `Personal preference number ${i} that the person stated at home, kept here as a longer line of text.` }));
  await memory(env.repo, env.fake, ['put-facts', '--home', '--file', writeJsonFile(env.repo.home, 'hf.json', { source: 'save', slug: 'personal', facts })]);
  return home;
}

const homePart = stdout => stdout.slice(stdout.indexOf('## From home'));

test("the hook adds the person's page and personal facts from home, within their own caps", async () => {
  const env = await setup();
  await homeWithPerson(env);
  const result = await hook(env, { WONG_MEMORY_NO_HEADLESS: '1' });
  assert.equal(result.code, 0, result.stderr);
  const part = homePart(result.stdout);
  assert.match(part, /^## From home \(/);
  assert.match(part, /### Your page: wiki\/people\/ana\.md\n# Ana/, 'the page that lists the email, not a near match');
  assert.match(part, /Cut at 4 KB/);
  const facts = part.slice(part.indexOf('### Your facts')).split('\n').filter(line => line.startsWith('- ['));
  assert.ok(facts.length > 0 && facts.length <= 15, `${facts.length} fact lines`);
  assert.ok(Buffer.byteLength(facts.join('\n')) <= 3 * 1024);
});

test('an offline home gives one line, still shows the page, and the hook ends inside its timeout', async () => {
  const env = await setup();
  await homeWithPerson(env);
  env.fake.setOffline(true, 'db-home');
  const started = Date.now();
  const result = await hook(env, { WONG_MEMORY_NO_HEADLESS: '1' });
  assert.ok(Date.now() - started < 5000, `the hook took ${Date.now() - started} ms`);
  assert.equal(result.code, 0);
  const part = homePart(result.stdout);
  assert.match(part, /### Your page: wiki\/people\/ana\.md/);
  assert.match(part, /Home's facts were not loaded \(memory store unreachable/);
  assert.doesNotMatch(part, /### Your facts/);
});

test('with no home recorded the hook adds no home part, and in home itself only the page', async () => {
  const env = await setup();
  const none = await hook(env, { WONG_MEMORY_NO_HEADLESS: '1' });
  assert.doesNotMatch(none.stdout, /From home/);
  const home = await homeWithPerson(env);
  const inHome = await node(home, env.fake, 'session-start.mjs', ['--agent', 'claude'], {
    input: JSON.stringify({ session_id: 'home-1', transcript_path: null, cwd: home.root }),
    env: { WONG_MEMORY_NO_HEADLESS: '1', WONG_MEMORY_STATE_DIR: home.stateDir, WONG_MACHINE_FILE: join(env.repo.home, 'machine.json') },
  });
  assert.equal(inHome.code, 0, inHome.stderr);
  const part = homePart(inHome.stdout);
  assert.match(part, /### Your page: wiki\/people\/ana\.md/);
  assert.doesNotMatch(part, /### Your facts/, "home's facts are already in its own digest");
  assert.match(inHome.stdout, /# Memory digest/);
});
