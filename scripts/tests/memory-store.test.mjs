import assert from 'node:assert/strict';
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { ftsQuery, nearTag, normalizeTag } from '../../.agents/skills/memory/scripts/memory.mjs';
import { findCredential, redact, secretValues } from '../../.agents/skills/memory/scripts/lib/scan.mjs';
import { memory, rows, SECRET, setup, writeJsonFile } from './fixtures/memory/harness.mjs';

const put = (env, input) => memory(env.repo, env.fake, ['put-facts', '--file', writeJsonFile(env.repo.home, `in-${Date.now()}-${Math.random()}.json`, input)]);

test('migrations run twice without changing anything', async () => {
  const env = await setup();
  const before = rows(env, 'SELECT count(*) AS n FROM sqlite_master')[0].n;
  const again = await memory(env.repo, env.fake, ['migrate']);
  assert.equal(again.code, 0);
  assert.equal(rows(env, 'SELECT count(*) AS n FROM sqlite_master')[0].n, before);
  assert.equal(rows(env, 'SELECT count(*) AS n FROM schema_migrations')[0].n, 1);
});

test('a fact is never edited or deleted; a later fact supersedes it', async () => {
  const env = await setup();
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

test('a resolved thread closes when a fact supersedes it, and show lists open threads first', async () => {
  const env = await setup();
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

test('the gate shows live facts on the slug and close keyword matches elsewhere', async () => {
  const env = await setup();
  await put(env, { source: 'save', slug: 'alpha', facts: [{ action: 'add', type: 'feedback', body: 'User prefers one bundled pull request for refactors.' }] });
  await put(env, { source: 'save', slug: 'beta', facts: [{ action: 'add', type: 'project', body: 'The beta rollout uses feature flags.' }] });
  const candidates = writeJsonFile(env.repo.home, 'cand.json', { slug: 'beta', facts: [{ type: 'feedback', body: 'For a refactor the user wants a single bundled pull request.' }] });
  const gated = await memory(env.repo, env.fake, ['gate', '--file', candidates]);
  assert.equal(gated.code, 0, gated.stderr);
  assert.match(gated.stdout, /Live facts on beta:\n  - \[project\] The beta rollout/);
  assert.match(gated.stdout, /Closest matches on other slugs:\n  - \[feedback\] User prefers one bundled pull request/);
});

test('length, type, and credential checks reject a fact without echoing a secret', async () => {
  const env = await setup();
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

test('tags need a definition, near duplicates warn, and aliases match their target', async () => {
  const env = await setup();
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

test('search filters by text, type, slug, date, author, and change state', async () => {
  const env = await setup();
  await put(env, { source: 'save', slug: 'one', facts: [{ action: 'add', type: 'user', body: 'The user is a staff engineer who likes terse replies.' }] });
  await put(env, { source: 'save', slug: 'two', facts: [{ action: 'add', type: 'project', body: 'Replies in reviews stay terse.' }] });
  const text = await memory(env.repo, env.fake, ['search', 'terse', 'replies']);
  assert.equal(text.stdout.trim().split('\n').length, 2);
  const typed = await memory(env.repo, env.fake, ['search', 'terse', '--type', 'user']);
  assert.match(typed.stdout, /staff engineer/);
  assert.doesNotMatch(typed.stdout, /reviews/);
  assert.match((await memory(env.repo, env.fake, ['search', '--slug', 'two'])).stdout, /reviews/);
  assert.match((await memory(env.repo, env.fake, ['search', '--since', '2999-01-01'])).stdout, /No matching facts/);
  assert.match((await memory(env.repo, env.fake, ['search', '--author', 'dev@'])).stdout, /\(one, conversation, 0d, dev, #1\)/);
  assert.match((await memory(env.repo, env.fake, ['search', '--state', 'active'])).stdout, /No matching facts/);
});

test('an offline write goes to the spool, and the spool drains through the gate', async () => {
  const env = await setup();
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

test('a store with no bucket keeps working and says transcripts are not stored', async () => {
  const env = await setup({ bucket: false });
  await put(env, { source: 'save', slug: 'nb', facts: [{ action: 'add', type: 'project', body: 'No bucket here.' }] });
  const id = rows(env, 'SELECT id FROM facts')[0].id;
  const source = await memory(env.repo, env.fake, ['source', String(id)]);
  assert.match(source.stdout, /no R2 bucket, so transcripts are not stored/);
  assert.ok(!env.fake.calls.some(call => call.includes('/r2/')));
});

test('a missing token names the variable and prints no value', async () => {
  const env = await setup();
  const result = await memory(env.repo, env.fake, ['search', 'x'], { env: { WONG_MEMORY_STATE_DIR: env.repo.stateDir } });
  assert.equal(result.code, 0);
  writeFileSync(join(env.repo.root, '.env'), 'OTHER=1\n');
  const missing = await memory(env.repo, env.fake, ['search', 'x']);
  assert.equal(missing.code, 1);
  assert.match(missing.stderr, /CLOUDFLARE_MEMORY_TOKEN is not set in \.env\. See wiki\/development\/memory\.md#the-memory-token/);
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

test('import writes each note through the shared path, links supersedes by key, and resumes', async () => {
  const env = await setup();
  const file = writeJsonFile(env.repo.home, 'migration.json', {
    tags: [{ name: 'save', definition: 'The checkpoint verb.' }],
    notes: [
      { slug: 'old', started: '2026-07-01', updated: '2026-07-02', text: 'Old note text.', facts: [{ key: 'old#1', type: 'project', body: 'The cap is 100 lines.', tags: ['save'] }] },
      { slug: 'new', updated: '2026-08-01', text: 'New note text.', facts: [{ key: 'new#1', type: 'project', body: 'The cap is 150 lines.', supersedes: ['old#1'] }] },
      { slug: 'empty', updated: '2026-08-02', text: 'Nothing reusable.', facts: [] },
    ],
  });
  const first = await memory(env.repo, env.fake, ['import', '--file', file]);
  assert.equal(first.code, 0, first.stderr);
  assert.match(first.stdout, /3 migration sessions exist/);
  const facts = rows(env, 'SELECT id, slug, body, created_at, superseded_by, source FROM facts ORDER BY id');
  assert.equal(facts[0].superseded_by, facts[1].id);
  assert.equal(facts[0].created_at, '2026-07-02T00:00:00Z');
  assert.ok(facts.every(fact => fact.source === 'migration'));
  assert.deepEqual(rows(env, "SELECT status FROM sessions WHERE id = 'migration:empty'"), [{ status: 'skipped' }]);
  assert.equal(env.fake.objects.get('migration/old.md').toString(), 'Old note text.');
  const again = await memory(env.repo, env.fake, ['import', '--file', file]);
  assert.match(again.stdout, /skip old: already imported/);
  assert.equal(rows(env, 'SELECT count(*) AS n FROM facts')[0].n, 2);
  const grown = writeJsonFile(env.repo.home, 'migration-2.json', {
    tags: [{ name: 'save', definition: 'The checkpoint verb.' }, { name: 'hosting', definition: 'Where the service runs.' }],
    notes: [{ slug: 'old', updated: '2026-07-02', facts: [] }, { slug: 'late', updated: '2026-09-25', text: 'Added later.', facts: [{ type: 'project', body: 'One VM per user.', tags: ['hosting'] }] }],
  });
  const resumed = await memory(env.repo, env.fake, ['import', '--file', grown]);
  assert.equal(resumed.code, 0, resumed.stderr);
  assert.deepEqual(rows(env, "SELECT tag FROM fact_tags JOIN facts ON facts.id = fact_id WHERE slug = 'late'"), [{ tag: 'hosting' }]);
});
