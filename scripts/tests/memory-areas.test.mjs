// Code areas: the shipped list, path matching, `memory.mjs areas`, `retag`, and area tags that define themselves.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { areasOf, loadAreas } from '../../.agents/skills/memory/scripts/lib/areas.mjs';
import { memory, rows, setup, writeJsonFile } from './fixtures/memory/harness.mjs';

const AREAS = loadAreas();
const input = (env, value) => writeJsonFile(env.repo.home, `in-${Date.now()}-${Math.random()}.json`, value);
const put = (env, value) => memory(env.repo, env.fake, ['put-facts', '--file', input(env, value)]);
const retag = (env, value) => memory(env.repo, env.fake, ['retag', '--file', input(env, value)]);
const factLines = result => result.stdout.trim().split('\n').filter(line => line.startsWith('- ['));

test('the list maps .claude/ like .agents/, and the most specific folder wins', () => {
  assert.deepEqual(areasOf('.claude/skills/memory/scripts/memory.mjs', AREAS), ['memory']);
  assert.deepEqual(areasOf('.agents/skills/memory/scripts/memory.mjs', AREAS), ['memory']);
  assert.deepEqual(areasOf('.codex/skills/plan/SKILL.md', AREAS), ['plan']);
  assert.deepEqual(areasOf('app/worker/apps/x.ts', AREAS).sort(), ['mini-apps', 'worker']);
  assert.deepEqual(areasOf('app/worker/index.ts', AREAS), ['worker']);
  assert.deepEqual(areasOf('app/src/Home.tsx', AREAS), ['stack-pack']);
  assert.deepEqual(areasOf('/repo/app/worker/index.ts', AREAS, '/repo'), ['worker']);
  assert.deepEqual(areasOf('/elsewhere/app/worker/index.ts', AREAS, '/repo'), []);
  assert.deepEqual(areasOf('README.md', AREAS), []);
});

test('every area in the list has a definition and a folder', () => {
  assert.ok(Object.keys(AREAS).length > 10);
  for (const [tag, area] of Object.entries(AREAS)) {
    assert.ok(area.definition?.trim(), `${tag} has a definition`);
    assert.ok(area.paths?.length && area.paths.every(path => typeof path === 'string' && path), `${tag} has folders`);
  }
});

test("areas loads a change's facts by the folders it names: threads first, capped, nothing else", async t => {
  const env = await setup(t);
  const dir = join(env.repo.root, 'openspec', 'changes', 'fix-routes');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'tasks.md'), '- [ ] 1.1 Route `/api/x` in `app/worker/index.ts`. Verify with `npm test`.\n');
  const stored = await put(env, { source: 'save', slug: 'routes', facts: [
    { action: 'add', type: 'thread', body: 'Does every route need its own test?', tags: ['worker'], createdAt: '2026-09-01T00:00:00Z' },
    { action: 'add', type: 'project', body: 'When you touch the server routes, test every route, not only the new one.', tags: ['worker'], createdAt: '2026-09-30T00:00:00Z' },
    { action: 'add', type: 'project', body: 'The wiki links every page from its hub.', tags: ['wiki'] },
  ] });
  assert.equal(stored.code, 0, stored.stderr);
  const loaded = await memory(env.repo, env.fake, ['areas', '--change', 'fix-routes']);
  assert.equal(loaded.code, 0, loaded.stderr);
  assert.match(loaded.stdout, /^Areas: worker \(app\/worker\/index\.ts\)\n/);
  assert.deepEqual(factLines(loaded).map(line => line.split('?')[0].split(',')[0]), ['- [thread] Does every route need its own test', '- [project] When you touch the server routes']);
  const capped = await memory(env.repo, env.fake, ['areas', 'app/worker/api/health.ts', '--limit', '1']);
  assert.deepEqual(factLines(capped).map(line => line.slice(0, 12)), ['- [thread] D']);
  const none = await memory(env.repo, env.fake, ['areas', 'README.md', 'docs/x.md']);
  assert.equal(none.stdout.trim(), 'No mapped area for these paths.');
});

test("areas keeps the team filter: a teammate's feedback stays theirs", async t => {
  const env = await setup(t);
  mkdirSync(env.repo.stateDir, { recursive: true });
  writeFileSync(join(env.repo.stateDir, 'team.json'), JSON.stringify({ team: true }));
  execFileSync('git', ['config', 'user.email', 'bo@example.com'], { cwd: env.repo.root });
  await put(env, { source: 'save', slug: 'prefs', facts: [
    { action: 'add', type: 'feedback', body: 'Bo wants Worker changes split by route.', tags: ['worker'] },
    { action: 'add', type: 'project', body: 'The Worker serves assets first.', tags: ['worker'] },
  ] });
  execFileSync('git', ['config', 'user.email', 'dev@example.com'], { cwd: env.repo.root });
  const mine = await memory(env.repo, env.fake, ['areas', 'app/worker/index.ts']);
  assert.deepEqual(factLines(mine).map(line => line.slice(0, 30)), ['- [project] The Worker serves ']);
});

test('areas says memory was not loaded and exits 0 when the store is unreachable', async t => {
  const env = await setup(t);
  env.fake.setOffline(true);
  const result = await memory(env.repo, env.fake, ['areas', 'app/worker/index.ts']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /^Areas: worker \(app\/worker\/index\.ts\)\nMemory was not loaded \(memory store unreachable \(network\)\); go on without it\.\n$/);
});

test('an area tag defines itself from the list on its first write', async t => {
  const env = await setup(t);
  const stored = await put(env, { source: 'save', slug: 'routes', facts: [{ action: 'add', type: 'project', body: 'Routes live in app/worker/api/.', tags: ['worker'] }] });
  assert.equal(stored.code, 0, stored.stderr);
  assert.deepEqual(rows(env, "SELECT name, definition FROM tags WHERE name = 'worker'"), [{ name: 'worker', definition: AREAS.worker.definition }]);
  const unknown = await put(env, { source: 'save', slug: 'x', facts: [{ action: 'add', type: 'project', body: 'A fact.', tags: ['not-an-area'] }] });
  assert.match(unknown.stderr, /tag not-an-area does not exist/);
});

test('retag restates a fact with its body, date, session, author, and old tags, and skips what it cannot', async t => {
  const env = await setup(t);
  const db = env.fake.db;
  db.prepare("INSERT INTO sessions (id, agent, author, status, updated_at) VALUES ('claude:s', 'claude', 'matthew@example.com', 'captured', 'now')").run();
  db.prepare("INSERT INTO tags (name, definition, created_at) VALUES ('ci', 'GitHub Actions.', 'now')").run();
  const insert = db.prepare("INSERT INTO facts (slug, type, body, session_id, source, created_at, author) VALUES (?, 'feedback', ?, 'claude:s', 'save', '2026-09-30T10:00:00Z', 'matthew@example.com') RETURNING id");
  const old = insert.get('routing', 'Test every route, not only the new one.').id;
  const tagged = insert.get('routing', 'Already tagged.').id;
  db.prepare("INSERT INTO fact_tags (fact_id, tag) VALUES (?, 'ci'), (?, 'ci')").run(old, tagged);
  const result = await retag(env, { retag: [{ id: old, tags: ['worker'] }, { id: tagged, tags: ['ci'] }, { id: 9999, tags: ['worker'] }] });
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stdout.trim(), `retagged: 1\nskipped #${tagged}: already carries every tag\nskipped #9999: not found`);
  const [restated] = rows(env, 'SELECT id, slug, type, body, session_id, source, created_at, author FROM facts WHERE superseded_by IS NULL AND body LIKE ?', 'Test every%');
  assert.deepEqual({ ...restated, id: undefined }, { id: undefined, slug: 'routing', type: 'feedback', body: 'Test every route, not only the new one.', session_id: 'claude:s', source: 'consolidation', created_at: '2026-09-30T10:00:00Z', author: 'matthew@example.com' });
  assert.deepEqual(rows(env, 'SELECT tag FROM fact_tags WHERE fact_id = ? ORDER BY tag', restated.id).map(row => row.tag), ['ci', 'worker']);
  assert.equal(rows(env, 'SELECT superseded_by FROM facts WHERE id = ?', old)[0].superseded_by, restated.id);
  assert.equal(rows(env, "SELECT definition FROM tags WHERE name = 'worker'")[0].definition, AREAS.worker.definition, 'the area tag defined itself');
  const again = await retag(env, { retag: [{ id: old, tags: ['memory'] }] });
  assert.equal(again.stdout.trim(), `retagged: 0\nskipped #${old}: superseded by #${restated.id}`);
});
