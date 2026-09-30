import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { ftsQuery, nearTag, normalizeTag } from '../../.agents/skills/memory/scripts/memory.mjs';
import { findCredential, redact, secretValues } from '../../.agents/skills/memory/scripts/lib/scan.mjs';
import { parseEnv } from '../../.agents/skills/memory/scripts/lib/store.mjs';
import { writeEnvKey } from '../../.agents/skills/memory/scripts/lib/members.mjs';
import { MAX_BYTES, MAX_LINES } from '../../.agents/skills/memory/scripts/lib/digest.mjs';
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
    { action: 'add', type: 'thread', body: 'Should search rank by recency too?' },
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
  await put(env, { source: 'save', slug: 'setup-flow', facts: [{ action: 'add', type: 'thread', body: 'Next time, try a real setup from one token.' }] });
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
  const missing = await put(env, { source: 'save', slug: 't', facts: [{ action: 'add', type: 'project', body: 'A fact.', tags: ['save'] }] });
  assert.match(missing.stderr, /tag save does not exist/);
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
  const insert = env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author) VALUES (?, ?, ?, 'save', ?, 'dev@example.com')");
  return (slug, type, body, days) => insert.run(slug, type, body, daysAgo(days));
};
const digestOf = async env => {
  const result = await memory(env.repo, env.fake, ['digest']);
  assert.equal(result.code, 0, result.stderr);
  const text = result.stdout.trimEnd();
  assert.ok(text.split('\n').length <= MAX_LINES, `${text.split('\n').length} lines`);
  assert.ok(Buffer.byteLength(text) <= MAX_BYTES, `${Buffer.byteLength(text)} bytes`);
  return text;
};

test('other changes\' open threads show at most 8 under 30 days, and a line says how many more a search finds', async t => {
  const env = await setup(t);
  const insert = insertFact(env);
  for (let i = 0; i < 80; i += 1) insert(`change-${i % 10}`, 'thread', `Open question ${i}.`, i < 75 ? i * 0.3 : 31 + i);
  for (let i = 0; i < 100; i += 1) insert('ops', i % 5 ? 'project' : 'feedback', `Settled fact ${i}.`, 1);
  const lines = (await digestOf(env)).split('\n');
  const threads = lines.filter(line => line.startsWith('- [thread]'));
  assert.deepEqual(threads.map(line => line.match(/Open question (\d+)\./)[1]), ['0', '1', '2', '3', '4', '5', '6', '7'], 'the 8 newest');
  const held = lines.indexOf(threads.at(-1)) + 1;
  assert.equal(lines[held], '72 more open threads are not shown. Search them: `node .claude/skills/memory/scripts/memory.mjs search --type thread`.');
  assert.match(lines[held + 1], /^- \[feedback\] Settled fact/);
  assert.ok(lines.some(line => line.startsWith('- [project] Settled fact')), 'project facts still show');
  const shown = lines.filter(line => line.startsWith('- [')).length;
  assert.equal(lines.at(-1), `${180 - shown} more live facts are not shown. Search them: \`node .claude/skills/memory/scripts/memory.mjs search <terms>\`.`);
  const old = await memory(env.repo, env.fake, ['search', '--type', 'thread', '--limit', '100']);
  assert.match(old.stdout, /Open question 79\./, 'an aged-out thread stays live and searchable');
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
  assert.equal(lines[start + 13], '## Live facts');
  assert.equal(lines.filter(line => line.startsWith('- [thread] Other question')).length, 8);
  assert.ok(lines.includes('12 more open threads are not shown. Search them: `node .claude/skills/memory/scripts/memory.mjs search --type thread`.'));
});

test('a store of 400 live facts keeps the digest within its caps and says how many it left out', async t => {
  const env = await setup(t);
  const insert = insertFact(env);
  for (let i = 0; i < 400; i += 1) insert(`s${i % 7}`, ['thread', 'feedback', 'project', 'reference', 'user'][i % 5], `Fact ${i} ${'about the release window '.repeat(4)}`.trim(), i % 40);
  const lines = (await digestOf(env)).split('\n');
  const shown = lines.filter(line => line.startsWith('- [')).length;
  assert.ok(lines.filter(line => line.startsWith('- [thread]')).length <= 8);
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
  execFileSync('git', ['config', 'user.email', 'bo@example.com'], { cwd: env.repo.root });
  await sessionFacts(env, 'claude:bo', 'bo-branch', [
    { action: 'add', type: 'project', slug: 'add-home-repo', body: 'Bo shipped the home schema.' },
    { action: 'add', type: 'feedback', slug: 'prefs', body: 'Bo wants short replies.' },
  ]);
  execFileSync('git', ['config', 'user.email', 'dev@example.com'], { cwd: env.repo.root });
  const mine = await memory(env.repo, env.fake, ['search', '--change', 'add-home-repo']);
  assert.deepEqual(lines(mine), ['- [project] Bo shipped the home schema.']);
  const everyone = await memory(env.repo, env.fake, ['search', '--change', 'add-home-repo', '--everyone']);
  assert.deepEqual(lines(everyone), ['- [feedback] Bo wants short replies.', '- [project] Bo shipped the home schema.']);
});

test('--state filters before the limit, so an older match is still found', async t => {
  const env = await setup(t);
  mkdirSync(join(env.repo.root, 'openspec', 'changes', 'busy'), { recursive: true });
  await put(env, { source: 'save', slug: 'chat', facts: [{ action: 'add', type: 'thread', body: 'Open question from a conversation.' }] });
  for (const n of [1, 2, 3]) await put(env, { source: 'save', slug: 'busy', facts: [{ action: 'add', type: 'thread', body: `Open item ${n} in a change.` }] });
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
  assert.ok(!env.fake.calls.some(call => call.includes('/r2/')));
});

test('a missing token names the variable and prints no value', async t => {
  const env = await setup(t);
  const result = await memory(env.repo, env.fake, ['search', 'x'], { env: { WONG_MEMORY_STATE_DIR: env.repo.stateDir } });
  assert.equal(result.code, 0);
  writeFileSync(join(env.repo.root, '.env'), 'OTHER=1\n');
  const missing = await memory(env.repo, env.fake, ['search', 'x']);
  assert.equal(missing.code, 1);
  assert.match(missing.stderr, /CLOUDFLARE_MEMORY_TOKEN is not set in \.env; `node \.claude\/skills\/memory\/scripts\/memory\.mjs join` gets one through your GitHub access to this repo\. See wiki\/development\/memory\.md#the-memory-key/);
});

test('helpers: FTS query, tag normalization, near tags, redaction', () => {
  assert.equal(ftsQuery('The digest, the DIGEST!'), '"the" OR "digest"');
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
