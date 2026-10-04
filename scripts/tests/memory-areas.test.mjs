// Code areas: the shipped list and its docs, path matching, `memory.mjs areas` with its docs, past changes, and
// backlinks, `retag`, and area tags that define themselves.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { areasOf, loadAreas } from '../../.agents/skills/memory/scripts/lib/areas.mjs';
import { editedPaths } from '../../.agents/skills/memory/scripts/before-edit.mjs';
import { memory, node, rows, setup, writeJsonFile } from './fixtures/memory/harness.mjs';

const AREAS = loadAreas();
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const files = (root, map) => Object.entries(map).forEach(([path, body]) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), body);
});
// An archived change whose tasks name the given paths.
const archived = (folder, title, ...paths) => ({
  [`openspec/changes/archive/${folder}/proposal.md`]: `# ${title}\n`,
  [`openspec/changes/archive/${folder}/tasks.md`]: paths.map(path => `- [x] Edit \`${path}\`.\n`).join(''),
});
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
    for (const alias of area.aliases || []) {
      assert.ok(typeof alias === 'string' && alias, `${tag}'s aliases are names`);
      assert.ok(!Object.hasOwn(AREAS, alias), `${tag}'s alias ${alias} is not itself an area tag`);
    }
  }
  assert.deepEqual(AREAS.memory.aliases, ['memory-architecture', 'memory-worker']);
  assert.deepEqual(AREAS.tests.aliases, ['testing']);
});

test('every capability spec is named by an area, and every named doc exists', () => {
  const named = new Set(Object.values(AREAS).flatMap(area => area.docs || []));
  const specs = readdirSync(join(REPO, 'openspec/specs')).map(cap => `openspec/specs/${cap}/spec.md`).filter(spec => existsSync(join(REPO, spec)));
  assert.ok(specs.length > 20);
  assert.deepEqual(specs.filter(spec => !named.has(spec)), [], 'each of these specs needs an area in areas.json');
  assert.deepEqual([...named].filter(doc => !existsSync(join(REPO, doc))), [], 'each of these docs is gone');
});

test("areas loads a change's facts by the folders it names: threads first, capped, nothing else", async t => {
  const env = await setup(t);
  const dir = join(env.repo.root, 'openspec', 'changes', 'fix-routes');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'tasks.md'), '- [ ] 1.1 Route `/api/x` in `app/worker/index.ts`. Verify with `npm test`.\n');
  const stored = await put(env, { source: 'save', slug: 'routes', facts: [
    { action: 'add', type: 'thread', body: 'Does every route need its own test?', tags: ['worker'], createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
    { action: 'add', type: 'project', body: 'When you touch the server routes, test every route, not only the new one.', tags: ['worker'], createdAt: new Date(Date.now() - 86400000).toISOString() },
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

test("areas keeps machine ownership when only the author label changes", async t => {
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
  assert.equal(factLines(mine).length, 2);
  assert.match(mine.stdout, /Bo wants Worker changes split by route/);
  assert.match(mine.stdout, /The Worker serves assets first/);
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

test('areas prints docs, past changes, and backlinks before the facts, even with the store unreachable', async t => {
  const env = await setup(t);
  files(env.repo.root, {
    'wiki/stack/mini-apps.md': '# Mini apps\n\nServe [hello](../../app/worker/apps/hello/index.ts).\n',
    'app/worker/apps/hello/index.ts': '',
    ...archived('2026-09-01-add-mini-apps', 'Add mini apps', 'app/worker/apps/'),
  });
  const expected = [
    'Areas: worker (app/worker/apps/hello/index.ts), mini-apps (app/worker/apps/hello/index.ts)',
    'Docs: wiki/stack/mini-apps.md',
    'Past changes:',
    '- [2026-09-01-add-mini-apps](openspec/changes/archive/2026-09-01-add-mini-apps/proposal.md) — Add mini apps',
    'Linked to app/worker/apps/hello/index.ts from:',
    '- wiki/stack/mini-apps.md:3',
  ];
  await put(env, { source: 'save', slug: 'routes', facts: [{ action: 'add', type: 'project', body: 'Test every route, not only the new one.', tags: ['worker'] }] });
  const loaded = await memory(env.repo, env.fake, ['areas', 'app/worker/apps/hello/index.ts']);
  assert.equal(loaded.code, 0, loaded.stderr);
  assert.deepEqual(loaded.stdout.trim().split('\n').slice(0, 6), expected, 'openspec/specs/mini-apps/spec.md is missing here, so it is skipped');
  assert.match(loaded.stdout.trim().split('\n')[6], /^- \[project\] Test every route/);
  env.fake.setOffline(true);
  const unreachable = await memory(env.repo, env.fake, ['areas', 'app/worker/apps/hello/index.ts']);
  assert.equal(unreachable.code, 0, unreachable.stderr);
  assert.deepEqual(unreachable.stdout.trim().split('\n'), [...expected, 'Memory was not loaded (memory store unreachable (network)); go on without it.']);
});

test('past changes: those naming the path first, then those sharing an area, newest first, five at most', async t => {
  const env = await setup(t);
  env.fake.setOffline(true);
  files(env.repo.root, {
    ...archived('2026-01-01-exact', 'Names the file', 'app/worker/apps/hello/index.ts'),
    ...archived('2026-01-02-folder', 'Names its folder', 'app/worker/apps/hello/'),
    ...archived('2026-01-03-broad', 'Names a folder above the area', 'app/worker/'),
    ...archived('2026-01-04-wiki', 'Another area', 'wiki/voice.md'),
    ...Object.assign({}, ...[5, 6, 7, 8, 9].map(day => archived(`2026-01-0${day}-area-${day}`, `Area ${day}`, 'app/worker/index.ts'))),
  });
  const past = async (...args) => (await memory(env.repo, env.fake, ['areas', ...args])).stdout.split('\n')
    .filter(line => line.startsWith('- [2026')).map(line => line.match(/^- \[([^\]]+)\]/)[1]);
  assert.deepEqual(await past('app/worker/apps/hello/index.ts'),
    ['2026-01-02-folder', '2026-01-01-exact', '2026-01-09-area-9', '2026-01-08-area-8', '2026-01-07-area-7'], 'a folder above the area, like app/worker/, names too much to count');
  assert.deepEqual(await past('app/worker/apps/'), ['2026-01-02-folder', '2026-01-01-exact', '2026-01-09-area-9', '2026-01-08-area-8', '2026-01-07-area-7'],
    'a folder asked about matches the files inside it');
  assert.deepEqual((await past('wiki/voice.md')), ['2026-01-04-wiki']);
});

test('backlinks print only for paths asked about directly, never for the paths a change names', async t => {
  const env = await setup(t);
  env.fake.setOffline(true);
  files(env.repo.root, {
    'wiki/README.md': '# Wiki\n\n[routes](../app/worker/index.ts)\n',
    'app/worker/index.ts': '',
    'openspec/changes/fix-routes/tasks.md': '- [ ] 1.1 Route `/api/x` in `app/worker/index.ts`.\n',
  });
  const byChange = await memory(env.repo, env.fake, ['areas', '--change', 'fix-routes']);
  assert.doesNotMatch(byChange.stdout, /Linked to/);
  const direct = await memory(env.repo, env.fake, ['areas', 'app/worker/index.ts']);
  assert.match(direct.stdout, /^Linked to app\/worker\/index\.ts from:\n- wiki\/README\.md:3$/m);
});

test('a topic name loads its area, unless a file has that name', async t => {
  const env = await setup(t);
  env.fake.setOffline(true);
  files(env.repo.root, { 'wiki/stack/mini-apps.md': '# Mini apps\n' });
  const topic = await memory(env.repo, env.fake, ['areas', 'mini-apps']);
  assert.match(topic.stdout, /^Areas: mini-apps \(topic\)\nDocs: wiki\/stack\/mini-apps\.md\n/);
  files(env.repo.root, { 'mini-apps': '' });
  const file = await memory(env.repo, env.fake, ['areas', 'mini-apps', 'not-an-area']);
  assert.equal(file.stdout.trim(), 'No mapped area for these paths.');
});

const daysAgo = days => new Date(Date.now() - days * 86400000).toISOString().replace(/\.\d{3}Z$/, 'Z');
const upkeep = env => memory(env.repo, env.fake, ['upkeep']);
const tagsOf = (env, id) => rows(env, 'SELECT tag FROM fact_tags WHERE fact_id = ? ORDER BY tag', id).map(row => row.tag);

test('upkeep closes a thread unchecked for 30 days, keeping its tags and naming its id', async t => {
  const env = await setup(t);
  const db = env.fake.db;
  db.prepare("INSERT INTO tags (name, definition, created_at) VALUES ('verify', 'The /verify walk.', 'now')").run();
  const insert = db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author) VALUES ('checks', 'thread', ?, 'save', ?, 'dev@example.com') RETURNING id");
  const old = insert.get(`Does the phone view still scroll? ${'Check it on a real phone after the next layout change. '.repeat(6)}`.trim(), daysAgo(31)).id;
  const fresh = insert.get('Is the new route fast enough?', daysAgo(29)).id;
  for (const id of [old, fresh]) db.prepare("INSERT INTO fact_tags (fact_id, tag) VALUES (?, 'verify')").run(id);
  const result = await upkeep(env);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'upkeep: closed 1, retagged 0, tags 1');
  const [closing] = rows(env, 'SELECT id, slug, type, body, source FROM facts WHERE id = (SELECT superseded_by FROM facts WHERE id = ?)', old);
  assert.match(closing.body, new RegExp(`^Closed unchecked after 30 days \\(thread #${old}, ${daysAgo(31).slice(0, 10)}\\): Does the phone view`));
  assert.ok(closing.body.length <= 400, `${closing.body.length} characters`);
  assert.deepEqual({ ...closing, id: undefined, body: undefined }, { id: undefined, body: undefined, slug: 'checks', type: 'project', source: 'consolidation' });
  assert.deepEqual(tagsOf(env, closing.id), ['verify']);
  assert.equal(rows(env, 'SELECT superseded_by FROM facts WHERE id = ?', fresh)[0].superseded_by, null, 'a 29-day thread stays open');
  assert.match((await memory(env.repo, env.fake, ['search', 'phone', '--all'])).stdout, /\[thread\] Does the phone view/, 'the thread stays searchable');
});

test('upkeep adds the area a fact names and the verb a thread names, keeping body, date, session, and author', async t => {
  const env = await setup(t);
  const db = env.fake.db;
  db.prepare("INSERT INTO sessions (id, agent, author, status, updated_at) VALUES ('claude:s', 'claude', 'matthew@example.com', 'captured', 'now')").run();
  const insert = db.prepare("INSERT INTO facts (slug, type, body, session_id, source, created_at, author) VALUES ('routes', ?, ?, 'claude:s', 'save', '2026-09-30T10:00:00Z', 'matthew@example.com') RETURNING id");
  const fact = insert.get('feedback', 'Test every route when `app/worker/index.ts` changes.').id;
  const thread = insert.get('thread', 'Check on the next real /wong-sync whether the hook merges.').id;
  const plain = insert.get('project', 'Nothing here names a folder, e.g. this one.').id;
  const result = await upkeep(env);
  assert.equal(result.stdout.trim(), 'upkeep: closed 0, retagged 2, tags 0');
  const restated = id => rows(env, 'SELECT id, type, body, session_id, created_at, author FROM facts WHERE id = (SELECT superseded_by FROM facts WHERE id = ?)', id)[0];
  assert.deepEqual({ ...restated(fact), id: undefined }, { id: undefined, type: 'feedback', body: 'Test every route when `app/worker/index.ts` changes.', session_id: 'claude:s', created_at: '2026-09-30T10:00:00Z', author: 'matthew@example.com' });
  assert.deepEqual(tagsOf(env, restated(fact).id), ['worker']);
  assert.deepEqual(tagsOf(env, restated(thread).id), ['sync']);
  assert.equal(rows(env, 'SELECT superseded_by FROM facts WHERE id = ?', plain)[0].superseded_by, null);
  assert.equal((await upkeep(env)).stdout.trim(), 'upkeep: closed 0, retagged 0, tags 0', 'a second pass finds nothing');
});

test('upkeep sets area tag definitions and aliases to the list, and restates at most 50 per pass', async t => {
  const env = await setup(t);
  const db = env.fake.db;
  db.prepare("INSERT INTO tags (name, definition, created_at) VALUES ('mini-apps', 'Small apps on their own Worker beside the main app.', 'now'), ('testing', 'Tests.', 'now')").run();
  const insert = db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author) VALUES ('many', 'project', ?, 'save', ?, 'dev@example.com')");
  for (let i = 0; i < 60; i += 1) insert.run(`Route ${i} lives in app/worker/api/r${i}.ts.`, daysAgo(1));
  const first = await upkeep(env);
  assert.equal(first.stdout.trim(), 'upkeep: closed 0, retagged 50, tags 2');
  assert.deepEqual(rows(env, "SELECT name, definition, alias_of FROM tags WHERE name IN ('mini-apps', 'testing', 'tests') ORDER BY name"), [
    { name: 'mini-apps', definition: AREAS['mini-apps'].definition, alias_of: null },
    { name: 'testing', definition: 'Tests.', alias_of: 'tests' },
    { name: 'tests', definition: AREAS.tests.definition, alias_of: null },
  ]);
  assert.equal((await upkeep(env)).stdout.trim(), 'upkeep: closed 0, retagged 10, tags 0', 'the rest wait for the next pass');
});

const edit = (env, path, session = 's1', options = {}) => node(env.repo, env.fake, 'before-edit.mjs', [], {
  input: JSON.stringify({ session_id: session, cwd: env.repo.root, hook_event_name: 'PreToolUse', tool_name: 'Edit', tool_input: { file_path: join(env.repo.root, path) } }), ...options,
});

test("the pre-edit hook shows an area's threads, then its newest facts, once per area per session", async t => {
  const env = await setup(t);
  const db = env.fake.db;
  db.prepare("INSERT INTO tags (name, definition, created_at) VALUES ('worker', 'The Worker.', 'now')").run();
  const insert = db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author) VALUES ('routes', ?, ?, 'save', ?, 'dev@example.com') RETURNING id");
  for (let i = 0; i < 10; i += 1) db.prepare("INSERT INTO fact_tags (fact_id, tag) VALUES (?, 'worker')").run(insert.get('project', `Route fact ${i}.`, daysAgo(i)).id);
  db.prepare("INSERT INTO fact_tags (fact_id, tag) VALUES (?, 'worker')").run(insert.get('thread', 'Does every route need a probe?', daysAgo(20)).id);
  insert.get('project', 'An untagged fact.', daysAgo(0));
  const first = await edit(env, 'app/worker/index.ts');
  assert.equal(first.code, 0, first.stderr);
  const { hookSpecificOutput: output } = JSON.parse(first.stdout);
  assert.equal(output.hookEventName, 'PreToolUse');
  const lines = output.additionalContext.split('\n');
  assert.equal(lines[0], 'Memory for worker:');
  assert.match(lines[1], /^- \[thread\] Does every route need a probe\?/);
  assert.deepEqual(lines.slice(2).map(line => line.match(/Route fact (\d)/)?.[1]), ['0', '1', '2', '3', '4', '5', '6']);
  assert.equal(lines.length - 1, 8, 'eight facts at most');
  const again = await edit(env, 'app/worker/api/health.ts');
  assert.deepEqual([again.code, again.stdout], [0, ''], 'an area already shown this session shows nothing');
  const otherSession = await edit(env, 'app/worker/index.ts', 's2');
  assert.match(otherSession.stdout, /Memory for worker:/);
  const unmapped = await edit(env, 'README.md', 's3');
  assert.deepEqual([unmapped.code, unmapped.stdout], [0, '']);
});

test('the pre-edit hook shows nothing, and exits 0, with no key or no store', async t => {
  const env = await setup(t);
  await put(env, { source: 'save', slug: 'routes', facts: [{ action: 'add', type: 'project', body: 'Routes need probes.', tags: ['worker'] }] });
  env.fake.setOffline('hang');
  const unreachable = await edit(env, 'app/worker/index.ts');
  assert.deepEqual([unreachable.code, unreachable.stdout], [0, '']);
  env.fake.setOffline(false);
  writeFileSync(join(env.repo.root, '.env'), 'OTHER=1\n');
  const noKey = await edit(env, 'app/worker/index.ts', 's2');
  assert.deepEqual([noKey.code, noKey.stdout], [0, '']);
});

test("the pre-edit hook reads Claude Code's edited file and every file in a Codex patch", () => {
  assert.deepEqual(editedPaths({ tool_input: { file_path: '/r/app/worker/index.ts', old_string: 'a', new_string: 'b' } }), ['/r/app/worker/index.ts']);
  assert.deepEqual(editedPaths({ tool_input: { notebook_path: '/r/n.ipynb' } }), ['/r/n.ipynb']);
  const command = ['*** Begin Patch', '*** Update File: /r/app/worker/index.ts', '@@', '+// hi', '*** Add File: wiki/new.md', '+# New',
    '*** Update File: a.txt', '*** Move to: scripts/tests/b.txt', '*** Delete File: old.md', '*** End Patch'].join('\n');
  assert.deepEqual(editedPaths({ tool_name: 'apply_patch', tool_input: { command } }), ['/r/app/worker/index.ts', 'wiki/new.md', 'a.txt', 'scripts/tests/b.txt', 'old.md']);
  assert.deepEqual(editedPaths({ tool_input: { command: 'ls -la' } }), []);
  assert.deepEqual(editedPaths({}), []);
});
