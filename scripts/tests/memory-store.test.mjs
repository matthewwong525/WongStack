import { hashKey, newKey } from '../../.agents/skills/memory/worker/memory-worker.mjs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { ftsQuery, nearTag, normalizeTag } from '../../.agents/skills/memory/scripts/memory.mjs';
import { findCredential, redact, secretValues } from '../../.agents/skills/memory/scripts/lib/scan.mjs';
import { parseEnv } from '../../.agents/skills/memory/scripts/lib/store.mjs';
import { writeEnvKey } from '../../.agents/skills/memory/scripts/lib/members.mjs';
import { MAX_BYTES, MAX_LINES, PERSON_MAX_BYTES } from '../../.agents/skills/memory/scripts/lib/digest.mjs';
import { BRIEF_MAX_BYTES, renderBrief } from '../../.agents/skills/memory/scripts/lib/brief.mjs';
import { memory, rows, SECRET, setup, tempDir, writeJsonFile } from './fixtures/memory/harness.mjs';

const put = (env, input) => memory(env.repo, env.fake, ['put-facts', '--file', writeJsonFile(env.repo.home, `in-${Date.now()}-${Math.random()}.json`, input)]);

test('a recorded migration never runs again', async t => {
  const env = await setup(t);
  const before = rows(env, 'SELECT count(*) AS n FROM sqlite_master')[0].n;
  const calls = env.fake.calls.length;
  const again = await memory(env.repo, env.fake, ['migrate']);
  assert.equal(again.code, 0);
  assert.match(again.stdout, /up to date/);
  assert.equal(env.fake.calls.length - calls, 2, 'a second run only reads what is recorded');
  assert.equal(rows(env, 'SELECT count(*) AS n FROM sqlite_master')[0].n, before);
  const files = readdirSync(new URL('../../.agents/skills/memory/migrations/', import.meta.url)).filter(name => name.endsWith('.sql'));
  assert.equal(rows(env, 'SELECT count(*) AS n FROM schema_migrations')[0].n, files.length);
  assert.deepEqual(rows(env, "SELECT name, dflt_value FROM pragma_table_info('facts') WHERE name = 'shared'"), [{ name: 'shared', dflt_value: '1' }]);
  assert.deepEqual(rows(env, "SELECT name, dflt_value FROM pragma_table_info('memory_keys') WHERE name = 'reader'"), [{ name: 'reader', dflt_value: '0' }]);
  const stored = await put(env, { source: 'save', slug: 'routes', facts: [{ action: 'add', type: 'project', body: 'Probe every route on the preview.' }] });
  assert.equal(stored.code, 0, stored.stderr);
  assert.match((await memory(env.repo, env.fake, ['search', 'previews'])).stdout, /Probe every route on the preview\./, 'a fact written after schema 6 matches another word form');
});

test('a fact is never edited or deleted; a later fact supersedes it', async t => {
  const env = await setup(t);
  const first = await put(env, { source: 'save', slug: 'digest', facts: [{ action: 'add', type: 'project', body: 'The digest cap is 100 lines.' }] });
  assert.equal(first.code, 0, first.stderr);
  const [old] = rows(env, 'SELECT id FROM facts');
  const second = await put(env, { source: 'save', slug: 'digest', facts: [{ action: 'supersede', supersedes: [old.id], type: 'project', body: 'The digest cap is 150 lines.' }] });
  assert.match(second.stdout, /added 0, superseded 1/);
  const facts = rows(env, 'SELECT id, body, superseded_by FROM facts ORDER BY id');
  assert.equal(facts[0].body, 'The digest cap is 100 lines.');
  assert.equal(facts[0].superseded_by, facts[1].id);
  assert.throws(() => env.fake.db.exec("UPDATE facts SET body = 'x'"), /never edited/);
  assert.throws(() => env.fake.db.exec('DELETE FROM facts'), /never deleted/);
  const live = await memory(env.repo, env.fake, ['show', 'digest']);
  assert.match(live.stdout, /150 lines/);
  assert.doesNotMatch(live.stdout, /100 lines/);
  const all = await memory(env.repo, env.fake, ['show', 'digest', '--all']);
  assert.match(all.stdout, /100 lines.*superseded by/);
});

test('a supersede of a missing or already-superseded fact counts as an add and stores the fact', async t => {
  const env = await setup(t);
  await put(env, { source: 'save', slug: 'cap', facts: [{ action: 'add', type: 'project', body: 'The cap is 100 lines.' }] });
  const [old] = rows(env, 'SELECT id FROM facts');
  await put(env, { source: 'save', slug: 'cap', facts: [{ action: 'supersede', supersedes: [old.id], type: 'project', body: 'The cap is 150 lines.' }] });
  for (const [id, body] of [[old.id, 'The cap is 200 lines.'], [9999, 'The cap is 250 lines.']]) {
    const result = await put(env, { source: 'save', slug: 'cap', facts: [{ action: 'supersede', supersedes: [id], type: 'project', body }] });
    assert.match(result.stdout, /added 1, superseded 0/, `supersede of #${id}`);
    assert.equal(rows(env, 'SELECT count(*) AS n FROM facts WHERE body = ?', body)[0].n, 1);
  }
  assert.equal(rows(env, 'SELECT superseded_by FROM facts WHERE id = ?', old.id)[0].superseded_by, old.id + 1, 'the first supersede stands');
});

test('a resolved thread closes when a fact supersedes it, and show lists open threads first', async t => {
  const env = await setup(t);
  await put(env, { source: 'save', slug: 'po', facts: [
    { action: 'add', type: 'project', body: 'Search uses FTS5.' },
    { action: 'add', type: 'thread', body: 'Should search rank by recency too?', tags: ['plan'] },
  ] });
  const shown = await memory(env.repo, env.fake, ['show', 'po']);
  assert.match(shown.stdout, /## Open threads\n- \[thread\] Should search rank/);
  const thread = rows(env, "SELECT id FROM facts WHERE type = 'thread'")[0].id;
  await put(env, { source: 'save', slug: 'po', facts: [{ action: 'supersede', supersedes: [thread], type: 'project', body: 'Search ranks by bm25 only; recency was rejected as noise.' }] });
  const after = await memory(env.repo, env.fake, ['show', 'po']);
  assert.doesNotMatch(after.stdout, /Open threads/);
  assert.match(after.stdout, /conversation\): 2 live facts/);
});

test('the gate shows live facts on the slug and close keyword matches elsewhere', async t => {
  const env = await setup(t);
  await put(env, { source: 'save', slug: 'alpha', facts: [{ action: 'add', type: 'feedback', body: 'User prefers one bundled pull request for refactors.' }] });
  await put(env, { source: 'save', slug: 'beta', facts: [{ action: 'add', type: 'project', body: 'The beta rollout uses feature flags.' }] });
  const candidates = writeJsonFile(env.repo.home, 'cand.json', { slug: 'beta', facts: [{ type: 'feedback', body: 'For a refactor the user wants a single bundled pull request.' }] });
  const gated = await memory(env.repo, env.fake, ['gate', '--file', candidates]);
  assert.equal(gated.code, 0, gated.stderr);
  assert.match(gated.stdout, /Live facts on beta:\n  - \[project\] The beta rollout/);
  assert.match(gated.stdout, /Closest matches on other slugs:\n  - \[feedback\] User prefers one bundled pull request/);
});

test('the gate lists an open thread on another slug that the fact may answer, and a supersede closes it', async t => {
  const env = await setup(t);
  await put(env, { source: 'save', slug: 'setup-flow', facts: [{ action: 'add', type: 'thread', body: 'Next time, try a real setup from one token.', tags: ['setup'] }] });
  const thread = rows(env, "SELECT id FROM facts WHERE type = 'thread'")[0].id;
  await put(env, { source: 'save', slug: 'noise', facts: Array.from({ length: 5 }, (_, i) => ({ action: 'add', type: 'project', body: `A real setup run from one token worked end to end on host ${i}.` })) });
  const gate = async () => {
    const result = await memory(env.repo, env.fake, ['gate', '--file', writeJsonFile(env.repo.home, `gate-${Math.random()}.json`, { slug: 'release', facts: [{ type: 'project', body: 'A real setup run from one token worked end to end.' }] })]);
    assert.equal(result.code, 0, result.stderr);
    return result.stdout;
  };
  const before = await gate();
  assert.match(before, /Closest matches on other slugs:\n(  - \[project\] A real setup run .*\n){5}  Open threads this may answer:\n  - \[thread\] Next time, try a real setup from one token\. \(setup-flow,/);
  assert.match(before, /A fact that answers an open thread supersedes it/);
  const closed = await put(env, { source: 'save', slug: 'release', facts: [{ action: 'supersede', supersedes: [thread], type: 'project', body: 'A real setup run from one token worked end to end.' }] });
  assert.match(closed.stdout, /superseded 1/);
  assert.notEqual(rows(env, 'SELECT superseded_by FROM facts WHERE id = ?', thread)[0].superseded_by, null);
  assert.doesNotMatch(await gate(), /Open threads this may answer|Next time, try/);
});

test("the gate never lists a teammate's thread that only its author sees", async t => {
  const env = await setup(t);
  mkdirSync(env.repo.stateDir, { recursive: true });
  writeFileSync(join(env.repo.stateDir, 'team.json'), JSON.stringify({ team: true }));
  const insert = env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author, shared) VALUES ('setup-flow', 'thread', ?, 'save', '2026-09-01T00:00:00Z', 'ana@example.com', ?)");
  insert.run('Ana asks: does a real setup from one token work?', 0);
  insert.run('Ana also asks: does a real setup from one token finish quickly?', 1);
  const result = await memory(env.repo, env.fake, ['gate', '--file', writeJsonFile(env.repo.home, 'team-gate.json', { slug: 'release', facts: [{ type: 'project', body: 'A real setup from one token worked.' }] })]);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Ana also asks/, 'a shared thread shows');
  assert.doesNotMatch(result.stdout, /Ana asks: does/);
});

test('length, type, and credential checks reject a fact without echoing a secret', async t => {
  const env = await setup(t);
  const long = await put(env, { source: 'save', slug: 's', facts: [{ action: 'add', type: 'project', body: 'x'.repeat(401) }] });
  assert.equal(long.code, 1);
  assert.match(long.stderr, /401 characters; the limit is 400/);
  const leaked = await put(env, { source: 'save', slug: 's', facts: [{ action: 'add', type: 'project', body: `The token is ${SECRET}` }] });
  assert.equal(leaked.code, 1);
  assert.match(leaked.stderr, /matches a value from \.env \(value not shown\)/);
  assert.doesNotMatch(leaked.stderr + leaked.stdout, new RegExp(SECRET));
  const pattern = await put(env, { source: 'save', slug: 's', facts: [{ action: 'add', type: 'project', body: 'Use ghp_abcdefghijklmnopqrstuvwxyz0123 for pushes.' }] });
  assert.match(pattern.stderr, /GitHub token/);
  assert.equal(rows(env, 'SELECT count(*) AS n FROM facts')[0].n, 0);
});

test('tags need a definition, near duplicates warn, and aliases match their target', async t => {
  const env = await setup(t);
  const missing = await put(env, { source: 'save', slug: 't', facts: [{ action: 'add', type: 'project', body: 'A fact.', tags: ['search'] }] });
  assert.match(missing.stderr, /tag search does not exist/);
  await put(env, { source: 'save', slug: 't', newTags: [{ name: 'save', definition: 'The checkpoint verb.' }], facts: [{ action: 'add', type: 'project', body: 'Save stages by path.', tags: ['save'] }] });
  const near = await put(env, { source: 'save', slug: 't', newTags: [{ name: 'saves', definition: 'Checkpoints.' }], facts: [{ action: 'add', type: 'project', body: 'Another.', tags: ['saves'] }] });
  assert.match(near.stderr, /tag saves is close to existing tag save/);
  await put(env, { source: 'save', slug: 't', newTags: [{ name: 'checkpoint', definition: 'Alias of save.', aliasOf: 'save' }], facts: [{ action: 'add', type: 'project', body: 'Checkpoint pushes the branch.', tags: ['checkpoint'] }] });
  const found = await memory(env.repo, env.fake, ['search', '--tag', 'save']);
  assert.match(found.stdout, /Checkpoint pushes the branch/);
  assert.match(found.stdout, /Save stages by path/);
  const listed = await memory(env.repo, env.fake, ['tags']);
  assert.match(listed.stdout, /- checkpoint \(1\) alias of save: Alias of save\./);
});

test('search filters by text, type, slug, date, author, and change state', async t => {
  const env = await setup(t);
  await put(env, { source: 'save', slug: 'one', facts: [{ action: 'add', type: 'user', body: 'The user is a staff engineer who likes terse replies.' }] });
  await put(env, { source: 'save', slug: 'two', facts: [{ action: 'add', type: 'project', body: 'Replies in reviews stay terse.' }] });
  const text = await memory(env.repo, env.fake, ['search', 'terse', 'replies']);
  assert.equal(text.stdout.trim().split('\n').length, 2);
  const typed = await memory(env.repo, env.fake, ['search', 'terse', '--type', 'user']);
  assert.match(typed.stdout, /staff engineer/);
  assert.doesNotMatch(typed.stdout, /reviews/);
  assert.match((await memory(env.repo, env.fake, ['search', '--slug', 'two'])).stdout, /reviews/);
  assert.match((await memory(env.repo, env.fake, ['search', '--since', '2999-01-01'])).stdout, /No matching facts/);
  assert.match((await memory(env.repo, env.fake, ['search', '--author', 'dev@'])).stdout, /\(one, conversation, 0d, dev@example\.com, #1\)/);
  assert.match((await memory(env.repo, env.fake, ['search', '--state', 'active'])).stdout, /No matching facts/);
});

test('structured search shares text IDs, filters and stable tied ranks and dates', async t => {
  const env = await setup(t);
  mkdirSync(join(env.repo.root, 'openspec', 'changes', 'active-topic'), { recursive: true });
  mkdirSync(join(env.repo.root, 'openspec', 'changes', 'archive', '2026-09-01-shipped-topic'), { recursive: true });
  await sessionFacts(env, 'claude:evidence', 'evidence-branch', [
    { action: 'add', slug: 'active-topic', type: 'project', body: 'Evidence keeps original words.' },
    { action: 'add', slug: 'shipped-topic', type: 'feedback', body: 'Evidence keeps original words.' },
    { action: 'add', slug: 'chat-topic', type: 'project', body: 'Evidence keeps original words.' },
  ]);
  await put(env, { source: 'save', slug: 'old-topic', facts: [{ action: 'add', type: 'project', body: 'Old evidence was replaced.' }] });
  const old = rows(env, "SELECT id FROM facts WHERE slug = 'old-topic'")[0].id;
  await put(env, { source: 'save', slug: 'old-topic', facts: [{ action: 'supersede', supersedes: [old], type: 'project', body: 'Current evidence is supported.' }] });
  tagFact(env, 1, 'save');
  env.fake.db.prepare("INSERT INTO tags (name, definition, alias_of, created_at) VALUES ('checkpoint', 'Alias.', 'save', 'now')").run();
  const cases = [[], ['evidence'], ['--type', 'project'], ['--slug', 'active-topic'], ['--tag', 'checkpoint'], ['--since', '2999-01-01'], ['--until', '2000-01-01'], ['--author', 'dev@'], ['--branch', 'evidence-branch'], ['--change', 'active-topic'], ['--branch', 'absent', '--change', 'active-topic'], ['--state', 'active', '--limit', '1'], ['--state', 'shipped'], ['--state', 'conversation'], ['--all'], ['--everyone'], ['--limit', '2']];
  for (const filters of cases) {
    const text = await memory(env.repo, env.fake, ['search', ...filters]);
    const json = await memory(env.repo, env.fake, ['search', ...filters, '--json']);
    assert.equal(text.code, 0, text.stderr);
    assert.equal(json.code, 0, json.stderr);
    const data = JSON.parse(json.stdout);
    assert.equal(data.version, 1);
    assert.deepEqual(data.facts.map(fact => fact.id), [...text.stdout.matchAll(/, #(\d+)\)/g)].map(([, id]) => Number(id)), filters.join(' '));
    assert.equal(data.filters.limit, Number(filters[filters.indexOf('--limit') + 1]) || 30);
    assert.doesNotMatch(json.stdout, /raw_key|raw_bytes|SERVICE_TOKEN|super-secret-value|test-memory-token/);
  }
  const tied = async () => JSON.parse((await memory(env.repo, env.fake, ['search', 'Evidence keeps original words', '--slug', 'active-topic', '--json'])).stdout);
  // Seed exact equal date/rank records without changing existing immutable facts.
  const insert = env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author) VALUES ('ties', 'project', 'Identical evidence wording.', 'save', '2026-10-01T00:00:00Z', 'dev@example.com') RETURNING id");
  const ids = Array.from({ length: 4 }, () => insert.get().id).reverse();
  for (const terms of [[], ['identical']]) {
    const result = await memory(env.repo, env.fake, ['search', ...terms, '--slug', 'ties', '--json']);
    assert.deepEqual(JSON.parse(result.stdout).facts.map(fact => fact.id), ids);
  }
  const first = await tied();
  assert.deepEqual((await tied()).facts, first.facts);
  assert.equal(first.facts[0].session_id, 'claude:evidence');
  assert.equal(first.facts[0].body, 'Evidence keeps original words.');
});

test('brief requires scope and uses current facts, evidence and search filters without writes or transcript fetches', async t => {
  const env = await setup(t);
  await sessionFacts(env, 'claude:brief', 'brief-branch', [
    { action: 'add', slug: 'brief-topic', type: 'project', body: 'The earlier evidence rule.' },
  ]);
  const old = rows(env, 'SELECT id FROM facts')[0].id;
  await put(env, { source: 'save', slug: 'brief-topic', facts: [
    { action: 'supersede', supersedes: [old], type: 'project', body: 'The current evidence rule.' },
    { action: 'add', type: 'feedback', body: 'Keep the original words.\nKeep both lines.' },
    { action: 'add', type: 'thread', body: 'Does the evidence rule cover dates?', tags: ['plan'] },
    { action: 'add', type: 'user', body: 'The owner reads evidence.' },
    { action: 'add', type: 'reference', body: 'Evidence guide: example.test.' },
  ] });
  const before = rows(env, 'SELECT * FROM facts');
  const sessionsBefore = rows(env, 'SELECT * FROM sessions');
  const calls = env.fake.calls.length;
  const result = await memory(env.repo, env.fake, ['brief', '--slug', 'brief-topic']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Generated: \d{4}-\d{2}-\d{2}T/);
  assert.match(result.stdout, /Keep the original words\.\nKeep both lines\./);
  assert.doesNotMatch(result.stdout, /earlier evidence rule/);
  const headings = [...result.stdout.matchAll(/^## (.+)$/gm)].map(([, heading]) => heading);
  assert.deepEqual(headings, ['Open threads', 'Feedback', 'Project decisions', 'User facts', 'References']);
  assert.match(result.stdout, /session: \(not recorded\)/);
  assert.equal(result.stdout.match(/Source: source <fact-id>/g).length, 1);
  assert.ok(Buffer.byteLength(result.stdout) <= BRIEF_MAX_BYTES);
  assert.deepEqual(rows(env, 'SELECT * FROM facts'), before);
  assert.deepEqual(rows(env, 'SELECT * FROM sessions'), sessionsBefore);
  assert.ok(env.fake.calls.slice(calls).every(call => call.includes('/d1/database/')), 'brief fetches no objects');
  const session = await memory(env.repo, env.fake, ['brief', '--branch', 'brief-branch']);
  assert.match(session.stdout, /No matching live facts/);
  // A superseded session fact is excluded; an unrelated live fact still provides a source pointer.
  await sessionFacts(env, 'claude:brief-live', 'brief-branch', [{ action: 'add', slug: 'brief-topic', type: 'project', body: 'Session evidence stays traceable.' }]);
  const sourced = await memory(env.repo, env.fake, ['brief', 'traceable', '--branch', 'brief-branch', '--change', 'brief-topic', '--since', '2020-01-01', '--until', '2999-01-01', '--author', 'dev', '--type', 'project', '--state', 'conversation', '--limit', '1']);
  assert.equal(sourced.code, 0, sourced.stderr);
  assert.match(sourced.stdout, /Session evidence stays traceable/);
  const sourcedId = rows(env, "SELECT id FROM facts WHERE session_id = 'claude:brief-live'")[0].id;
  assert.match(sourced.stdout, new RegExp(`Fact #${sourcedId} · .+ · author: dev@example.com · session: claude:brief-live`));
  assert.match(sourced.stdout, /Source: source <fact-id>/);
  assert.match(sourced.stdout, /1 selected, 0 selected entries omitted/);
  t.diagnostic(`BEGIN SYNTHETIC MEMORY BRIEF\n${sourced.stdout}END SYNTHETIC MEMORY BRIEF`);
  t.diagnostic(`SYNTHETIC SINGLE-FACT CONTEXT ${JSON.stringify({ priorBriefBytes: 581, briefBytes: Buffer.byteLength(sourced.stdout), bodyBytes: Buffer.byteLength('Session evidence stays traceable.') })}`);
  const tagged = await memory(env.repo, env.fake, ['brief', '--tag', 'plan']);
  assert.match(tagged.stdout, /Does the evidence rule cover dates/);
  for (const args of [[], ['!!!'], ['a', 'b'], ['--everyone'], ['--limit', '1'], ['evidence', '--all']]) {
    const refused = await memory(env.repo, env.fake, ['brief', ...args]);
    assert.equal(refused.code, 1);
    assert.match(refused.stderr, /name a topic or filter|only live facts/);
  }
  const empty = await memory(env.repo, env.fake, ['brief', '--slug', 'absent']);
  assert.equal(empty.code, 0);
  assert.match(empty.stdout, /No matching live facts/);
  env.fake.setOffline(true);
  const unavailable = await memory(env.repo, env.fake, ['brief', '--slug', 'absent']);
  assert.equal(unavailable.code, 1);
  assert.match(unavailable.stderr, /unreachable/);
  assert.doesNotMatch(unavailable.stdout, /No matching|Memory brief/);
});

test('brief selects eight by default and up to twenty explicitly without extra store requests', async t => {
  const env = await setup(t);
  env.fake.db.prepare("INSERT INTO sessions (id, agent, author, status, updated_at) VALUES ('claude:context', 'claude', 'dev@example.com', 'captured', '2026-10-01T00:00:00Z')").run();
  const insert = env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author, session_id) VALUES ('context', 'project', ?, 'save', '2026-10-01T00:00:00Z', 'dev@example.com', 'claude:context')");
  for (let index = 1; index <= 25; index += 1) insert.run(`Context fact ${index} keeps its original words.`);
  const read = async args => {
    const start = env.fake.calls.length;
    const result = await memory(env.repo, env.fake, [...args, '--slug', 'context']);
    assert.equal(result.code, 0, result.stderr);
    const calls = env.fake.calls.slice(start);
    assert.ok(calls.every(call => call.includes('/d1/database/')), 'no transcript or per-source fetch');
    return { output: result.stdout, bytes: Buffer.byteLength(result.stdout), requests: calls.length };
  };
  const search = await read(['search', '--limit', '8']);
  const json = await read(['search', '--limit', '8', '--json']);
  const brief = await read(['brief']);
  const twenty = await read(['brief', '--limit', '20']);
  const one = await read(['brief', '--limit', '1']);
  const ids = output => [...output.matchAll(/^Fact #(\d+)/gm)].map(([, id]) => Number(id));
  assert.deepEqual(ids(brief.output), JSON.parse(json.output).facts.map(fact => fact.id));
  assert.equal(ids(brief.output).length, 8);
  assert.equal(ids(twenty.output).length, 20);
  assert.equal(ids(one.output).length, 1);
  assert.match(brief.output, /Limit 8 live facts; 8 selected, 0 selected entries omitted/);
  assert.match(twenty.output, /Limit 20 live facts; 20 selected, 0 selected entries omitted/);
  assert.match(brief.output, /Scope: {"slug":"context"}\n/);
  assert.doesNotMatch(brief.output, /"all"|"everyone"|"personal"|"terms"|follow up:/);
  assert.equal(brief.output.match(/Source: source <fact-id>/g).length, 1);
  assert.equal(brief.output.match(/author: dev@example.com · session: claude:context/g).length, 8);
  for (const result of [json, brief, twenty, one]) assert.equal(result.requests, search.requests, 'request count stays constant across formats and fact limits');
  assert.equal(search.requests, 1, 'ordinary single-user reads use one D1 query');
  assert.ok(brief.bytes < twenty.bytes);
  assert.ok(twenty.bytes <= BRIEF_MAX_BYTES);
  t.diagnostic(`SYNTHETIC MEMORY CONTEXT ${JSON.stringify(Object.fromEntries(Object.entries({ search8: search, json8: json, brief8: brief, brief20: twenty, brief1: one }).map(([name, { bytes, requests }]) => [name, { bytes, requests }])))}`);
  mkdirSync(env.repo.stateDir, { recursive: true });
  writeFileSync(join(env.repo.stateDir, 'team.json'), JSON.stringify({ team: true }));
  const teamSearch = await read(['search', '--limit', '8']);
  const teamBrief = await read(['brief']);
  const teamTwenty = await read(['brief', '--limit', '20']);
  assert.equal(teamSearch.requests, 2, 'team scope adds the reader-schema probe');
  assert.equal(teamBrief.requests, teamSearch.requests);
  assert.equal(teamTwenty.requests, teamSearch.requests, 'team reads add no per-fact queries');
  assert.match(teamBrief.output, /"personal":true/);
  assert.deepEqual(ids(teamBrief.output), ids(brief.output));
  t.diagnostic(`SYNTHETIC TEAM REQUESTS ${JSON.stringify({ search8: teamSearch.requests, brief8: teamBrief.requests, brief20: teamTwenty.requests })}`);
});

test('brief spends the byte budget on relevance before grouping facts', () => {
  const facts = Array.from({ length: 6 }, (_, index) => ({
    id: index + 1, type: index ? 'thread' : 'reference', body: `Fact ${index + 1}: ${'漢'.repeat(390)}`,
    created_at: '2026-10-01T00:00:00Z', author: 'dev@example.com', session_id: 'claude:ranked',
  }));
  const brief = renderBrief({ facts, filters: { terms: 'ranked', limit: 8, all: false, everyone: false, personal: true } }, '2026-10-03T00:00:00Z');
  const ids = [...brief.matchAll(/^Fact #(\d+)/gm)].map(([, id]) => Number(id));
  assert.ok(facts.every(fact => fact.body.length <= 400));
  assert.deepEqual(ids, [2, 3, 4, 1], 'the highest-ranked reference survives even though references display last');
  for (const fact of facts.slice(0, 4)) assert.ok(brief.includes(fact.body), 'admitted bodies remain whole');
  for (const fact of facts.slice(4)) assert.ok(!brief.includes(fact.body));
  assert.match(brief, /6 selected, 2 selected entries omitted/);
  assert.match(brief, /"personal":true/, 'active personal scope remains explicit');
  assert.ok(Buffer.byteLength(brief) <= BRIEF_MAX_BYTES);
});

test('brief caps whole UTF-8 entries, tells only selected omissions, and bounds large scope displays', async t => {
  const env = await setup(t);
  const insert = env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author) VALUES ('unicode', 'project', ?, 'save', '2026-10-01T00:00:00Z', 'dev@example.com') RETURNING id");
  const bodies = Array.from({ length: 25 }, (_, index) => `Entry ${index}: ${'🐬漢'.repeat(120)}`);
  for (const body of bodies) insert.run(body);
  const result = await memory(env.repo, env.fake, ['brief', '--slug', 'unicode', '--limit', '100']);
  assert.equal(result.code, 0, result.stderr);
  assert.ok(Buffer.byteLength(result.stdout) <= BRIEF_MAX_BYTES);
  const displayed = [...result.stdout.matchAll(/^Fact #(\d+)/gm)].map(([, id]) => Number(id));
  assert.ok(displayed.length > 0 && displayed.length < 20);
  for (const id of displayed) assert.ok(result.stdout.includes(bodies[id - 1]), 'each shown body is whole');
  assert.match(result.stdout, new RegExp(`20 selected, ${20 - displayed.length} selected entries omitted`));
  assert.match(result.stdout, /Other matching facts may exist/);
  assert.doesNotMatch(result.stdout, /25 selected|complete/);
  const hugeScope = renderBrief({ facts: [], filters: { terms: '🐬'.repeat(4000), limit: 20 } }, '2026-10-03T00:00:00Z');
  assert.ok(Buffer.byteLength(hugeScope) <= BRIEF_MAX_BYTES);
  assert.match(hugeScope, /scope display shortened/);
  const unnamed = renderBrief({ facts: [{ id: 1, type: 'reference', body: 'An original pointer.', created_at: '2026-10-01', author: null, session_id: null }], filters: { slug: 'source', limit: 20 } });
  assert.match(unnamed, /author: \(not recorded\)/);
  const grouped = renderBrief({ facts: [
    { id: 3, type: 'project', body: 'First ranked project.', created_at: '2026-10-01' },
    { id: 2, type: 'thread', body: 'Open question.', created_at: '2026-10-01' },
    { id: 1, type: 'project', body: 'Second ranked project.', created_at: '2026-09-01' },
  ], filters: { slug: 'grouped', limit: 20 } });
  assert.ok(grouped.indexOf('Fact #2') < grouped.indexOf('Fact #3'));
  assert.ok(grouped.indexOf('Fact #3') < grouped.indexOf('Fact #1'), 'grouping retains selected order within a kind');
});

test('two authors who share the part before the @ never read as one person, and the digest keeps its limits', async t => {
  const env = await setup(t);
  const insert = env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author) VALUES ('ops', 'project', ?, 'save', '2026-09-01T00:00:00Z', ?)");
  for (let i = 0; i < 60; i += 1) insert.run(`Release note ${i} ${'about the deploy window '.repeat(6)}`.trim(), i % 2 ? 'operations@example.org' : 'operations@example.com');
  const digest = (await memory(env.repo, env.fake, ['digest'])).stdout.trimEnd();
  assert.match(digest, /, operations@example\.com, #\d+\)/);
  assert.match(digest, /, operations@example\.org, #\d+\)/);
  assert.ok(digest.split('\n').length <= MAX_LINES, `${digest.split('\n').length} lines`);
  assert.ok(Buffer.byteLength(digest) <= MAX_BYTES, `${Buffer.byteLength(digest)} bytes`);
  const found = (await memory(env.repo, env.fake, ['search', 'release', '--limit', '60'])).stdout;
  const authors = new Set(found.match(/operations@[\w.]+(?=, #)/g));
  assert.deepEqual([...authors].sort(), ['operations@example.com', 'operations@example.org']);
});

const daysAgo = days => new Date(Date.now() - days * 86400000).toISOString().replace(/\.\d{3}Z$/, 'Z');
const insertFact = env => {
  const insert = env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author, owner_machine_id) VALUES (?, ?, ?, 'save', ?, 'dev@example.com', ?)");
  return (slug, type, body, days) => insert.run(slug, type, body, daysAgo(days), env.repo.machineId);
};
const digestOf = async env => {
  const result = await memory(env.repo, env.fake, ['digest']);
  assert.equal(result.code, 0, result.stderr);
  const text = result.stdout.trimEnd();
  assert.ok(text.split('\n').length <= MAX_LINES, `${text.split('\n').length} lines`);
  assert.ok(Buffer.byteLength(text) <= MAX_BYTES, `${Buffer.byteLength(text)} bytes`);
  return text;
};

// Tags a fact, defining the tag first when the store has none by that name.
const tagFact = (env, id, tag) => {
  env.fake.db.prepare('INSERT OR IGNORE INTO tags (name, definition, created_at) VALUES (?, ?, ?)').run(tag, `Work on ${tag}.`, daysAgo(0));
  env.fake.db.prepare('INSERT INTO fact_tags (fact_id, tag) VALUES (?, ?)').run(id, tag);
};
const STEP_SEARCH = 'When a step starts, load its own: `node .claude/skills/memory/scripts/memory.mjs search --type thread --tag <step>`.';

test("other changes' open threads are never listed; one line counts them by step", async t => {
  const env = await setup(t);
  const insert = insertFact(env);
  for (let i = 0; i < 80; i += 1) {
    const { lastInsertRowid: id } = insert(`change-${i % 10}`, 'thread', `Open question ${i}.`, i * 0.3);
    if (i < 10) tagFact(env, id, 'plan');
    else if (i < 15) tagFact(env, id, 'save');
  }
  for (let i = 0; i < 100; i += 1) insert('ops', i % 5 ? 'project' : 'feedback', `Settled fact ${i}.`, 1);
  const lines = (await digestOf(env)).split('\n');
  assert.equal(lines.filter(line => line.startsWith('- [thread]')).length, 0, 'no other change\'s thread is listed');
  assert.deepEqual(lines.filter(line => line.startsWith('Open threads on other changes, by step:')), [`Open threads on other changes, by step: plan 10, save 5; 65 untagged. ${STEP_SEARCH}`]);
  assert.ok(lines.some(line => line.startsWith('- [feedback] Settled fact')), 'feedback facts show');
  assert.ok(lines.some(line => line.startsWith('- [project] Settled fact')), 'project facts show');
  const shown = lines.filter(line => line.startsWith('- [')).length;
  assert.equal(lines.at(-1), `${180 - shown} more live facts are not shown. Search them: \`node .claude/skills/memory/scripts/memory.mjs search <terms>\`.`);
  const all = await memory(env.repo, env.fake, ['search', '--type', 'thread', '--limit', '100']);
  assert.match(all.stdout, /Open question 79\./, 'a thread left out stays live and searchable');
});

test('threads tagged with a step count under it, and a tag search loads only that step\'s threads', async t => {
  const env = await setup(t);
  const insert = insertFact(env);
  for (let i = 0; i < 3; i += 1) tagFact(env, insert('change-a', 'thread', `Plan question ${i}.`, i).lastInsertRowid, 'plan');
  for (let i = 0; i < 2; i += 1) tagFact(env, insert('change-b', 'thread', `Save question ${i}.`, i).lastInsertRowid, 'save');
  tagFact(env, insert('change-c', 'thread', 'Deploy question.', 1).lastInsertRowid, 'deploy');
  for (let i = 0; i < 4; i += 1) insert('change-c', 'thread', `Loose question ${i}.`, i);
  insert('ops', 'feedback', 'Keep replies short.', 1);
  const lines = (await digestOf(env)).split('\n');
  assert.ok(lines.includes(`Open threads on other changes, by step: plan 3, save 2; 5 untagged. ${STEP_SEARCH}`), 'a non-step tag counts as untagged');
  const found = (await memory(env.repo, env.fake, ['search', '--type', 'thread', '--tag', 'plan', '--limit', '100'])).stdout.trim().split('\n');
  assert.deepEqual(found.map(line => line.match(/^- \[thread\] (Plan question \d)\. \(change-a, (\w+, )?\d+d, /)?.[1]), ['Plan question 0', 'Plan question 1', 'Plan question 2']);
});

test('the digest shows your people page within 1.5 KB, a line naming the rest, then feedback', async t => {
  const env = await setup(t);
  mkdirSync(join(env.repo.root, 'wiki', 'people'), { recursive: true });
  const prefs = Array.from({ length: 48 }, (_, i) => `- Preference ${i}: short notes, plain words, one idea at a time, please.`);
  const page = ['# Ana', '', 'Ana runs operations.', '', '- **Git emails:** `dev@example.com`.', ...prefs, '', 'Back to [people](README.md).', ''].join('\n');
  assert.ok(Buffer.byteLength(page) > 3000, `${Buffer.byteLength(page)} bytes`);
  writeFileSync(join(env.repo.root, 'wiki', 'people', 'ana.md'), page);
  const insert = insertFact(env);
  for (let i = 0; i < 5; i += 1) insert('ops', 'feedback', `Preference fact ${i}.`, 1);
  const lines = (await digestOf(env)).split('\n');
  const start = lines.indexOf('## You (wiki/people/ana.md)');
  const end = lines.indexOf('The rest: wiki/people/ana.md.');
  assert.ok(start > 1 && end > start, 'a person section ending with the rest line');
  assert.deepEqual(lines.slice(start + 1, start + 4), ['Ana runs operations.', '- **Git emails:** `dev@example.com`.', '- Preference 0: short notes, plain words, one idea at a time, please.']);
  assert.ok(Buffer.byteLength(lines.slice(start, end + 1).join('\n')) < PERSON_MAX_BYTES);
  assert.ok(!lines.includes('# Ana') && !lines.includes('Back to [people](README.md).'), 'no title or footer');
  assert.equal(lines[end + 1], '## Live facts');
  assert.match(lines[end + 2], /^- \[feedback\] Preference fact/);
});

test('with no people page listing you, the digest has no person section and still asks for a search', async t => {
  const env = await setup(t);
  mkdirSync(join(env.repo.root, 'wiki', 'people'), { recursive: true });
  writeFileSync(join(env.repo.root, 'wiki', 'people', 'bo.md'), '# Bo\n\n- **Git emails:** `bo@example.com`.\n');
  insertFact(env)('ops', 'feedback', 'Keep replies short.', 1);
  const lines = (await digestOf(env)).split('\n');
  assert.equal(lines.filter(line => line.startsWith('## You')).length, 0);
  assert.match(lines[1], /Once you know the task, and before you act on more than a quick question, search memory for its key terms in your own words: `node \.claude\/skills\/memory\/scripts\/memory\.mjs search <terms>`\.$/);
});

test("the current change's open threads all show first, old ones too", async t => {
  const env = await setup(t);
  const dir = join(env.repo.root, 'openspec', 'changes', 'add-po-search');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'proposal.md'), '# Add PO search\n\n**Branch:** po-search\n');
  execFileSync('git', ['checkout', '-q', '-b', 'po-search'], { cwd: env.repo.root });
  const insert = insertFact(env);
  for (let i = 0; i < 12; i += 1) insert('add-po-search', 'thread', `Current question ${i}.`, i === 11 ? 45 : i);
  for (let i = 0; i < 20; i += 1) insert('other', 'thread', `Other question ${i}.`, i);
  for (let i = 0; i < 50; i += 1) insert('ops', 'project', `Settled fact ${i}.`, 1);
  const lines = (await digestOf(env)).split('\n');
  const start = lines.indexOf('## Open threads on `add-po-search`');
  assert.ok(start > 0, 'the current change has its own section');
  assert.deepEqual(lines.slice(start + 1, start + 13).map(line => line.match(/^- \[thread\] Current question (\d+)\./)?.[1]), Array.from({ length: 12 }, (_, i) => String(i)));
  assert.equal(lines[start + 13], `Open threads on other changes, by step: 20 untagged. ${STEP_SEARCH}`);
  assert.equal(lines[start + 14], '## Live facts');
  assert.equal(lines.filter(line => line.startsWith('- [thread] Other question')).length, 0);
});

test('a store of 400 live facts keeps the digest within its caps and says how many it left out', async t => {
  const env = await setup(t);
  const insert = insertFact(env);
  for (let i = 0; i < 400; i += 1) insert(`s${i % 7}`, ['thread', 'feedback', 'project', 'reference', 'user'][i % 5], `Fact ${i} ${'about the release window '.repeat(4)}`.trim(), i % 40);
  const lines = (await digestOf(env)).split('\n');
  const shown = lines.filter(line => line.startsWith('- [')).length;
  assert.equal(lines.filter(line => line.startsWith('- [thread]')).length, 0);
  assert.equal(lines.at(-1), `${400 - shown} more live facts are not shown. Search them: \`node .claude/skills/memory/scripts/memory.mjs search <terms>\`.`);
});

// A session's facts, with the branch the session started on.
async function sessionFacts(env, id, branch, facts) {
  await put(env, { session: id, source: 'save', facts });
  env.fake.db.prepare('UPDATE sessions SET branch = ? WHERE id = ?').run(branch, id);
}

const lines = result => result.stdout.trim().split('\n').map(line => line.replace(/ \(.*$/, '')).sort();

test('search by change finds a session whose branch was renamed, alone or with the branch', async t => {
  const env = await setup(t);
  await sessionFacts(env, 'claude:renamed', 'magical-chicken', [
    { action: 'add', type: 'project', slug: 'add-home-repo', body: 'Home keeps private-life facts.' },
    { action: 'add', type: 'reference', slug: 'paseo', body: 'Paseo renames branches from its sidebar.' },
  ]);
  await sessionFacts(env, 'claude:current', 'explore/home-mode', [{ action: 'add', type: 'project', slug: 'other', body: 'Started on the new name.' }]);
  await sessionFacts(env, 'claude:unrelated', 'elsewhere', [{ action: 'add', type: 'project', slug: 'unrelated', body: 'Nothing to do with it.' }]);
  const both = await memory(env.repo, env.fake, ['search', '--branch', 'explore/home-mode', '--change', 'add-home-repo']);
  assert.equal(both.code, 0, both.stderr);
  assert.deepEqual(lines(both), ['- [project] Home keeps private-life facts.', '- [project] Started on the new name.', '- [reference] Paseo renames branches from its sidebar.']);
  const change = await memory(env.repo, env.fake, ['search', '--change', 'add-home-repo']);
  assert.deepEqual(lines(change), ['- [project] Home keeps private-life facts.', '- [reference] Paseo renames branches from its sidebar.']);
  const branch = await memory(env.repo, env.fake, ['search', '--branch', 'explore/home-mode']);
  assert.deepEqual(lines(branch), ['- [project] Started on the new name.'], 'the branch alone misses the renamed session');
  const worded = await memory(env.repo, env.fake, ['search', 'paseo', '--change', 'add-home-repo']);
  assert.deepEqual(lines(worded), ['- [reference] Paseo renames branches from its sidebar.']);
});

test("search by change keeps the team filter on a teammate's personal facts", async t => {
  const env = await setup(t);
  mkdirSync(env.repo.stateDir, { recursive: true });
  writeFileSync(join(env.repo.stateDir, 'team.json'), JSON.stringify({ team: true }));
  const boMachine = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const boKey = newKey(boMachine);
  env.fake.db.prepare('INSERT INTO memory_keys (hash, email, role, created_at, machine_id) VALUES (?, ?, ?, ?, ?)').run(await hashKey(boKey), 'bo@example.com', 'admin', 'now', boMachine);
  const currentId = env.repo.machineId;
  env.repo.machineId = boMachine;
  writeFileSync(join(env.repo.dataHome, 'wongstack', 'machine-id'), `${boMachine}\n`);
  const currentEnv = readFileSync(join(env.repo.root, '.env'), 'utf8');
  writeFileSync(join(env.repo.root, '.env'), `CLOUDFLARE_MEMORY_TOKEN=${boKey}\n`);
  execFileSync('git', ['config', 'user.email', 'bo@example.com'], { cwd: env.repo.root });
  await sessionFacts(env, 'claude:bo', 'bo-branch', [
    { action: 'add', type: 'project', slug: 'add-home-repo', body: 'Bo shipped the home schema.' },
    { action: 'add', type: 'feedback', slug: 'prefs', body: 'Bo wants short replies.' },
  ]);
  env.repo.machineId = currentId;
  writeFileSync(join(env.repo.dataHome, 'wongstack', 'machine-id'), `${currentId}\n`);
  writeFileSync(join(env.repo.root, '.env'), currentEnv);
  execFileSync('git', ['config', 'user.email', 'dev@example.com'], { cwd: env.repo.root });
  const mine = await memory(env.repo, env.fake, ['search', '--change', 'add-home-repo']);
  assert.deepEqual(lines(mine), ['- [project] Bo shipped the home schema.']);
  const everyone = await memory(env.repo, env.fake, ['search', '--change', 'add-home-repo', '--everyone']);
  assert.deepEqual(lines(everyone), ['- [feedback] Bo wants short replies.', '- [project] Bo shipped the home schema.']);
});

test('--state filters before the limit, so an older match is still found', async t => {
  const env = await setup(t);
  mkdirSync(join(env.repo.root, 'openspec', 'changes', 'busy'), { recursive: true });
  await put(env, { source: 'save', slug: 'chat', facts: [{ action: 'add', type: 'thread', body: 'Open question from a conversation.', tags: ['plan'] }] });
  for (const n of [1, 2, 3]) await put(env, { source: 'save', slug: 'busy', facts: [{ action: 'add', type: 'thread', body: `Open item ${n} in a change.`, tags: ['plan'] }] });
  const found = await memory(env.repo, env.fake, ['search', '--type', 'thread', '--state', 'conversation', '--limit', '2']);
  assert.match(found.stdout, /from a conversation/);
  const capped = await memory(env.repo, env.fake, ['search', '--type', 'thread', '--state', 'active', '--limit', '2']);
  assert.equal(capped.stdout.trim().split('\n').length, 2);
});

test('.env values lose their quotes and comments, and keep what is inside the quotes', () => {
  const text = ['A="abc" # note', 'B="x y"  ', "C='single'", 'D="has # inside"', 'E=plain # note', 'export F=exported', 'G=a#b', 'H=', 'I="crlf"\r', ''].join('\n');
  assert.deepEqual(parseEnv(text), { A: 'abc', B: 'x y', C: 'single', D: 'has # inside', E: 'plain', F: 'exported', G: 'a#b', H: '', I: 'crlf' });
});

test('writing the memory key replaces every earlier line, so the new key is the one read', t => {
  const primaryRoot = tempDir(t, 'env-key-');
  const file = join(primaryRoot, '.env');
  writeFileSync(file, 'A=1\r\nCLOUDFLARE_MEMORY_TOKEN=\r\nB=2\r\nexport CLOUDFLARE_MEMORY_TOKEN=old\r\n');
  writeEnvKey({ primaryRoot }, 'new');
  assert.equal(parseEnv(readFileSync(file, 'utf8')).CLOUDFLARE_MEMORY_TOKEN, 'new');
  assert.equal(readFileSync(file, 'utf8').match(/CLOUDFLARE_MEMORY_TOKEN/g).length, 1);
  assert.equal(parseEnv(readFileSync(file, 'utf8')).B, '2');
  writeFileSync(file, 'A=1');
  writeEnvKey({ primaryRoot }, 'first');
  assert.equal(readFileSync(file, 'utf8'), 'A=1\nCLOUDFLARE_MEMORY_TOKEN=first\n');
});

test('an offline write goes to the spool, and the spool drains through the gate', async t => {
  const env = await setup(t);
  env.fake.setOffline(true);
  const offline = await put(env, { source: 'save', slug: 'sp', facts: [{ action: 'add', type: 'project', body: 'Written while offline.' }] });
  assert.equal(offline.code, 0);
  assert.match(offline.stdout, /spooled: 1 facts wait in/);
  const spooled = readdirSync(join(env.repo.stateDir, 'spool'));
  assert.equal(spooled.length, 1);
  env.fake.setOffline(false);
  const listed = await memory(env.repo, env.fake, ['spool']);
  assert.match(listed.stdout, /Candidate 1: \[project\] Written while offline\./);
  const path = join(env.repo.stateDir, 'spool', spooled[0]);
  const decisions = writeJsonFile(env.repo.home, 'dec.json', { source: 'save', slug: 'sp', facts: [{ action: 'add', type: 'project', body: 'Written while offline.' }] });
  const drained = await memory(env.repo, env.fake, ['put-facts', '--file', decisions, '--spooled', path]);
  assert.match(drained.stdout, /added 1/);
  assert.equal(readdirSync(join(env.repo.stateDir, 'spool')).length, 0);
});

test('a store with no bucket keeps working and says transcripts are not stored', async t => {
  const env = await setup(t, { bucket: false });
  await put(env, { source: 'save', slug: 'nb', facts: [{ action: 'add', type: 'project', body: 'No bucket here.' }] });
  const id = rows(env, 'SELECT id FROM facts')[0].id;
  const source = await memory(env.repo, env.fake, ['source', String(id)]);
  assert.match(source.stdout, /no R2 bucket, so transcripts are not stored/);
  const brief = await memory(env.repo, env.fake, ['brief', '--slug', 'nb']);
  assert.equal(brief.code, 0, brief.stderr);
  assert.match(brief.stdout, new RegExp(`Fact #${id} ·`));
  assert.match(brief.stdout, /Source: source <fact-id>/);
  assert.ok(!env.fake.calls.some(call => call.includes('/r2/')));
});

test('a missing token names the variable and prints no value', async t => {
  const env = await setup(t);
  const result = await memory(env.repo, env.fake, ['search', 'x'], { env: { WONG_MEMORY_STATE_DIR: env.repo.stateDir } });
  assert.equal(result.code, 0);
  writeFileSync(join(env.repo.root, '.env'), 'OTHER=1\n');
  const missing = await memory(env.repo, env.fake, ['search', 'x']);
  assert.equal(missing.code, 1);
  assert.match(missing.stderr, /CLOUDFLARE_MEMORY_TOKEN is not set in \.env; node \.claude\/skills\/memory\/scripts\/memory\.mjs join --file <private-file> installs a credential issued by the repo admin\. See wiki\/development\/memory-key\.md/);
});

test('helpers: FTS query, tag normalization, near tags, redaction', () => {
  assert.equal(ftsQuery('The digest, the DIGEST!'), '"digest"');
  assert.equal(ftsQuery('how should previews be checked'), '"previews" OR "checked"');
  assert.equal(ftsQuery('how should'), '"how" OR "should"', 'filler stays when nothing else is left');
  assert.equal(ftsQuery('a b'), null);
  assert.equal(normalizeTag('Saves'), 'save');
  assert.equal(nearTag('checkpoints', ['checkpoint']), 'checkpoint');
  assert.equal(nearTag('deploy', ['review']), null);
  const values = secretValues({ A: SECRET, B: 'short' });
  assert.deepEqual(values, [SECRET]);
  assert.equal(redact(`x ${SECRET} y`, values), 'x [redacted:.env] y');
  assert.equal(findCredential('eyJhbGciOiJIUzI1.eyJzdWIiOiIxMjM0.SflKxwRJSMeKKF2QT4', []), 'JWT');
});

test('redaction replaces every token shape, keeps the word Bearer, and leaves a JSONL line valid', () => {
  const memoryKey = `wongm_${Buffer.from('bo@other.example').toString('base64url')}.${'k'.repeat(43)}`;
  const shapes = {
    'GitHub token': 'ghp_abcdefghijklmnopqrstuvwxyz0123',
    'GitHub fine-grained token': 'github_pat_11ABCDEFG0123456789_abcdefghij',
    'API key (sk-)': 'sk-proj-abcdefghijklmnopqrstuvwx',
    'AWS access key': 'AKIAABCDEFGHIJKLMNOP',
    JWT: 'eyJhbGciOiJIUzI1.eyJzdWIiOiIxMjM0.SflKxwRJSMeKKF2QT4',
    'Memory key': memoryKey,
  };
  for (const [name, token] of Object.entries(shapes)) {
    assert.equal(redact(`use ${token} twice: ${token}.`, []), 'use [redacted:token] twice: [redacted:token].', name);
    assert.equal(findCredential(`use ${token}`, []), name);
  }
  assert.equal(redact('Authorization: Bearer abcdefghijklmnopqrstuvwxyz.0123', []), 'Authorization: Bearer [redacted:token]');
  assert.equal(findCredential('Authorization: Bearer abcdefghijklmnopqrstuvwxyz.0123', []), 'Bearer header');
  const line = JSON.stringify({ message: { content: `curl -H "Authorization: Bearer ${memoryKey}" and ${SECRET} and ${shapes['GitHub token']}` } });
  const redacted = redact(line, secretValues({ A: SECRET }));
  const parsed = JSON.parse(redacted);
  assert.equal(parsed.message.content, 'curl -H "Authorization: Bearer [redacted:token]" and [redacted:.env] and [redacted:token]');
  assert.equal(redact('plain words stay as they are', []), 'plain words stay as they are');
});

test('a fact from an earlier notes migration still prints its note', async t => {
  const env = await setup(t);
  const now = '2026-09-01T00:00:00Z';
  env.fake.db.prepare("INSERT INTO sessions (id, agent, status, raw_key, raw_bytes, updated_at) VALUES ('migration:old', 'migration', 'captured', 'migration/old.md', 14, ?)").run(now);
  const { id } = env.fake.db.prepare("INSERT INTO facts (slug, type, body, session_id, source, created_at) VALUES ('old', 'project', 'The cap is 100 lines.', 'migration:old', 'migration', ?) RETURNING id").get(now);
  env.fake.objects.set('migration/old.md', Buffer.from('Old note text.'));
  const source = await memory(env.repo, env.fake, ['source', String(id)]);
  assert.equal(source.code, 0, source.stderr);
  assert.match(source.stdout, /Old note text\./);
});

test('no command imports notes', async t => {
  const env = await setup(t);
  const file = writeJsonFile(env.repo.home, 'migration.json', { notes: [{ slug: 'old', text: 'Old note text.', facts: [] }] });
  const before = env.fake.calls.length;
  const result = await memory(env.repo, env.fake, ['import', '--file', file]);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /usage: memory\.mjs/);
  assert.equal(env.fake.calls.length, before, 'nothing reaches the store');
});

test('--home is an unknown flag, and nothing reaches the store', async t => {
  const env = await setup(t);
  const before = env.fake.calls.length;
  const input = writeJsonFile(env.repo.home, 'home.json', { source: 'save', slug: 'family', facts: [{ action: 'add', type: 'user', body: 'A private-life fact.' }] });
  for (const args of [['put-facts', '--home', '--file', input], ['search', '--home', 'school']]) {
    const result = await memory(env.repo, env.fake, args);
    assert.equal(result.code, 2, args.join(' '));
    assert.match(result.stderr, /Unknown option '--home'/);
  }
  assert.equal(env.fake.calls.length, before);
});

test('the shipped question set: each question finds its fact in the top three, and filler alone finds nothing', async t => {
  const env = await setup(t);
  const { facts, questions } = JSON.parse(readFileSync(new URL('./fixtures/memory-search-questions.json', import.meta.url), 'utf8'));
  const insert = env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author, owner_machine_id) VALUES (?, ?, ?, 'save', '2026-10-01T00:00:00Z', 'dev@example.com', ?) RETURNING id");
  const ids = new Map(facts.map(fact => [insert.get(fact.slug, fact.type, fact.body, env.repo.machineId).id, fact.key]));
  for (const { query, finds } of questions) {
    const result = await memory(env.repo, env.fake, ['search', ...query.split(' ')]);
    assert.equal(result.code, 0, result.stderr);
    const ranked = [...result.stdout.matchAll(/, #(\d+)\)$/gm)].map(([, id]) => ids.get(Number(id)));
    if (finds) assert.ok(ranked.slice(0, 3).includes(finds), `"${query}" ranks ${finds} in the top three: ${ranked.join(', ') || 'none'}`);
    else assert.deepEqual(ranked, [], `"${query}" shares only filler words, so it finds nothing`);
  }
});

test('a thread must name who checks it: a verb or area tag, read through aliases', async t => {
  const env = await setup(t);
  const untagged = await put(env, { source: 'save', slug: 'q', facts: [
    { action: 'add', type: 'project', body: 'A settled fact in the same batch.' },
    { action: 'add', type: 'thread', body: 'Does the preview need a second check?' },
  ] });
  assert.equal(untagged.code, 1);
  assert.match(untagged.stderr, /fact 2: a thread needs the tag of the verb whose next run should check it \(explore, plan, apply, save, ship, continue, verify, routine, sync, setup, close, improve\), or the area tag/);
  assert.equal(rows(env, 'SELECT count(*) AS n FROM facts')[0].n, 0, 'nothing in the batch is stored');
  const gated = await memory(env.repo, env.fake, ['gate', '--file', writeJsonFile(env.repo.home, 'gate.json', { slug: 'q', facts: [{ type: 'thread', body: 'Does the preview need a second check?' }] })]);
  assert.match(gated.stdout, /Tags: fact 1: a thread needs the tag of the verb/);
  for (const tag of ['verify', 'worker']) {
    const tagged = await put(env, { source: 'save', slug: 'q', facts: [{ action: 'add', type: 'thread', body: `Checked by ${tag}?`, tags: [tag] }] });
    assert.equal(tagged.code, 0, tagged.stderr);
  }
  env.fake.db.prepare("INSERT INTO tags (name, definition, alias_of, created_at) VALUES ('checks', 'Look-alike of verify.', 'verify', 'now')").run();
  const aliased = await put(env, { source: 'save', slug: 'q', facts: [{ action: 'add', type: 'thread', body: 'Checked through an alias?', tags: ['checks'] }] });
  assert.equal(aliased.code, 0, aliased.stderr);
  assert.equal(rows(env, "SELECT count(*) AS n FROM facts WHERE type = 'thread'")[0].n, 3);
});

test('a refused spooled thread keeps its spool file', async t => {
  const env = await setup(t);
  const spooled = writeJsonFile(env.repo.home, 'spooled.json', { source: 'save', slug: 'q', facts: [{ action: 'add', type: 'thread', body: 'Written offline, with no tag.' }] });
  const result = await memory(env.repo, env.fake, ['put-facts', '--file', spooled, '--spooled', spooled]);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /a thread needs the tag/);
  assert.ok(readFileSync(spooled, 'utf8').includes('Written offline'), 'the spool file stays for the next try');
});

test('a look-alike tag merges as an alias: a search by the main tag finds it, and an alias never points at an alias', async t => {
  const env = await setup(t);
  env.fake.db.prepare("INSERT INTO tags (name, definition, created_at) VALUES ('memory', 'Session memory.', 'now'), ('memory-worker', 'The memory route.', 'now'), ('deploys', 'Deploys.', 'now')").run();
  await put(env, { source: 'save', slug: 'm', facts: [{ action: 'add', type: 'project', body: 'The memory route refuses the keys table.', tags: ['memory-worker'] }] });
  const tag = (...args) => memory(env.repo, env.fake, ['tag', ...args]);
  assert.equal((await tag('memory-worker', '--alias-of', 'memory')).code, 0);
  assert.match((await memory(env.repo, env.fake, ['search', '--tag', 'memory'])).stdout, /refuses the keys table/);
  assert.match((await memory(env.repo, env.fake, ['tags'])).stdout, /- memory-worker \(1\) alias of memory: The memory route\./);
  for (const [args, refusal] of [
    [['deploys', '--alias-of', 'memory-worker'], /memory-worker is itself an alias of memory; use that/],
    [['memory', '--alias-of', 'deploys'], /memory-worker is an alias of memory; point it at deploys first/],
    [['deploys', '--alias-of', 'deploys'], /deploys can not be its own alias/],
    [['deploys', '--alias-of', 'nope'], /no tag nope/],
    [['nope', '--definition', 'x'], /no tag nope/],
    [['deploys'], /usage: memory\.mjs tag/],
  ]) {
    const result = await tag(...args);
    assert.equal(result.code, 1, args.join(' '));
    assert.match(result.stderr, refusal);
  }
  assert.equal((await tag('memory-worker', '--no-alias')).code, 0);
  assert.equal(rows(env, "SELECT alias_of FROM tags WHERE name = 'memory-worker'")[0].alias_of, null);
});

test('a put-facts whose upkeep fails still stores its fact and exits 0, and the next write retries upkeep', async t => {
  const env = await setup(t);
  env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at) VALUES ('old', 'project', 'Routes live in app/worker/api/.', 'save', '2026-09-01T00:00:00Z')").run();
  env.fake.db.exec("CREATE TRIGGER no_restate BEFORE INSERT ON facts WHEN new.source = 'consolidation' BEGIN SELECT RAISE(ABORT, 'restates refused'); END");
  const result = await put(env, { source: 'save', slug: 'new', facts: [{ action: 'add', type: 'project', body: 'A fact saved before upkeep.' }] });
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /^stored: added 1, superseded 0, dropped 0\nupkeep skipped: memory query failed: restates refused\n$/);
  assert.equal(rows(env, "SELECT count(*) AS n FROM facts WHERE body = 'A fact saved before upkeep.'")[0].n, 1);
  env.fake.db.exec('DROP TRIGGER no_restate');
  const next = await put(env, { source: 'save', slug: 'new', facts: [{ action: 'add', type: 'project', body: 'The next save.' }] });
  assert.match(next.stdout, /upkeep: closed 0, retagged 1, tags 0/);
});

test('concurrent first starts publish one complete private machine ID and a corrupt ID never rotates', async t => {
  const { execFile } = await import('node:child_process');
  const { machineId } = await import('../../.agents/skills/memory/scripts/lib/machine-id.mjs');
  const { statSync } = await import('node:fs');
  const dir = tempDir(t, 'identity-'); const file = join(dir, 'machine-id');
  const module = new URL('../../.agents/skills/memory/scripts/lib/machine-id.mjs', import.meta.url).href;
  const start = () => new Promise((resolve, reject) => execFile(process.execPath, ['--input-type=module', '-e', `import { machineId } from ${JSON.stringify(module)}; process.stdout.write(machineId(process.argv[1]));`, file], (error, stdout) => error ? reject(error) : resolve(stdout)));
  const ids = await Promise.all(Array.from({ length: 8 }, start));
  assert.equal(new Set(ids).size, 1); assert.equal(machineId(file), ids[0]);
  assert.equal(statSync(file).mode & 0o077, 0);
  assert.notEqual(machineId(join(tempDir(t, 'other-identity-'), 'machine-id')), ids[0]);
  writeFileSync(file, 'corrupt'); assert.throws(() => machineId(file), /Invalid WongStack machine identity/);
  assert.equal(readFileSync(file, 'utf8'), 'corrupt');
});

test('the ownership migration preserves historical bodies, authors, sources and raw references without claiming them', async t => {
  const { DatabaseSync } = await import('node:sqlite'); const db = new DatabaseSync(':memory:'); t.after(() => db.close());
  const dir = new URL('../../.agents/skills/memory/migrations/', import.meta.url);
  const files = readdirSync(dir).filter(name => name.endsWith('.sql')).sort();
  for (const file of files.filter(name => !name.startsWith('0007'))) db.exec(readFileSync(new URL(file, dir), 'utf8'));
  db.exec("INSERT INTO sessions (id, agent, author, machine, status, raw_key, updated_at) VALUES ('migration:old', 'migration', 'original@example.com', 'same-host', 'captured', 'sessions/original@example.com/old.jsonl', '2026-01-01')");
  db.exec("INSERT INTO facts (slug, type, body, session_id, source, created_at, author) VALUES ('old', 'feedback', 'Original private fact', 'migration:old', 'migration', '2026-01-01', 'original@example.com')");
  const fact = { ...db.prepare('SELECT * FROM facts').get() }; const session = { ...db.prepare('SELECT * FROM sessions').get() };
  db.exec(readFileSync(new URL('0007_machine_ownership.sql', dir), 'utf8'));
  assert.deepEqual({ ...db.prepare('SELECT * FROM facts').get() }, { ...fact, owner_machine_id: null });
  assert.deepEqual({ ...db.prepare('SELECT * FROM sessions').get() }, { ...session, owner_machine_id: null });
  assert.throws(() => db.exec("UPDATE facts SET owner_machine_id = 'claimed'"), /ownership cannot change/);
  assert.throws(() => db.exec("UPDATE sessions SET owner_machine_id = 'claimed'"), /ownership cannot change/);
});

test('login-link markers are redacted and rejected from facts even when absent from .env', async t => {
  const env = await setup(t); const marker = `wongl_${'m'.repeat(43)}`;
  assert.ok(!redact(`Open ?memory_login_link=${marker}`, []).includes(marker));
  const result = await put(env, { slug: 'x', facts: [{ action: 'add', type: 'project', body: `Use ${marker}` }] });
  assert.equal(result.code, 1); assert.doesNotMatch(result.stdout + result.stderr, /wongl_/);
});
