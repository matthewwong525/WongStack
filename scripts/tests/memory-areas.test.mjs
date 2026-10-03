// Code areas: the shipped list and its docs, path matching, `memory.mjs areas` with its docs, past changes, and
// backlinks, `retag`, and area tags that define themselves.
import assert from 'node:assert/strict';
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

test('areas says memory was not loaded and exits 0 when the store is unreachable', async t => {
  const env = await setup(t);
  env.fake.setOffline(true);
  const result = await memory(env.repo, env.fake, ['areas', 'app/worker/index.ts']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /^Areas: worker \(app\/worker\/index\.ts\)\nMemory was not loaded \(machine-unreachable\); go on without it\.\n$/);
});

test('an area tag defines itself from the list on its first write', async t => {
  const env = await setup(t);
  const stored = await put(env, { source: 'save', slug: 'routes', facts: [{ action: 'add', type: 'project', body: 'Routes live in app/worker/api/.', tags: ['worker'] }] });
  assert.equal(stored.code, 0, stored.stderr);
  assert.deepEqual(rows(env, "SELECT name, definition FROM tags WHERE name = 'worker'"), [{ name: 'worker', definition: AREAS.worker.definition }]);
  const unknown = await put(env, { source: 'save', slug: 'x', facts: [{ action: 'add', type: 'project', body: 'A fact.', tags: ['not-an-area'] }] });
  assert.match(unknown.stderr, /tag not-an-area does not exist/);
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
  assert.deepEqual(unreachable.stdout.trim().split('\n'), [...expected, 'Memory was not loaded (machine-unreachable); go on without it.']);
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

const edit=(env,file,session='s1')=>node(env.repo,env.fake,'before-edit.mjs',[],{input:JSON.stringify({cwd:env.repo.root,session_id:session,tool_input:{file_path:join(env.repo.root,file)}})});
const daysAgo = days => new Date(Date.now() - days * 86400000).toISOString().replace(/\.\d{3}Z$/, 'Z');
const upkeep = env => memory(env.repo, env.fake, ['upkeep']);

test("the pre-edit hook shows an area's threads, then its newest facts, once per area per session", async t => {
  const env = await setup(t);
  for(let i=9;i>=0;i--){const result=await put(env,{source:'save',slug:'routes',facts:[{action:'add',type:'project',body:`Route fact ${i}.`,tags:['worker']}]});assert.equal(result.code,0,result.stderr);}
  await put(env,{source:'save',slug:'routes',facts:[{action:'add',type:'thread',body:'Does every route need a probe?',tags:['worker']},{action:'add',type:'project',body:'An untagged fact.'}]});
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

test("the pre-edit hook reads Claude Code's edited file and every file in a Codex patch", () => {
  assert.deepEqual(editedPaths({ tool_input: { file_path: '/r/app/worker/index.ts', old_string: 'a', new_string: 'b' } }), ['/r/app/worker/index.ts']);
  assert.deepEqual(editedPaths({ tool_input: { notebook_path: '/r/n.ipynb' } }), ['/r/n.ipynb']);
  const command = ['*** Begin Patch', '*** Update File: /r/app/worker/index.ts', '@@', '+// hi', '*** Add File: wiki/new.md', '+# New',
    '*** Update File: a.txt', '*** Move to: scripts/tests/b.txt', '*** Delete File: old.md', '*** End Patch'].join('\n');
  assert.deepEqual(editedPaths({ tool_name: 'apply_patch', tool_input: { command } }), ['/r/app/worker/index.ts', 'wiki/new.md', 'a.txt', 'scripts/tests/b.txt', 'old.md']);
  assert.deepEqual(editedPaths({ tool_input: { command: 'ls -la' } }), []);
  assert.deepEqual(editedPaths({}), []);
});

test('retag appends an actor correction, retains old history and defaults to the old privacy',async t=>{
 const e=await setup(t);const first=await put(e,{source:'save',slug:'prefs',facts:[{action:'add',type:'feedback',body:'Always check every preview route.',tags:['worker']}]});assert.equal(first.code,0,first.stderr);
 const old=rows(e,'SELECT * FROM facts')[0],corrected=await retag(e,{retag:[{id:old.id,tags:['memory']}]});assert.equal(corrected.code,0,corrected.stderr);const all=rows(e,'SELECT * FROM facts ORDER BY id');assert.equal(all.length,2);assert.equal(all[0].body,old.body);assert.equal(all[0].created_at,old.created_at);assert.equal(all[0].author,old.author);assert.equal(all[0].superseded_by,all[1].id);assert.equal(all[1].owner_principal_id,old.owner_principal_id);assert.equal(all[1].shared,0);assert.notEqual(all[1].session_id,old.session_id);
 const session=rows(e,'SELECT reason FROM sessions WHERE id=?',all[1].session_id)[0];assert.match(session.reason,new RegExp('Correction of fact #'+old.id));assert.deepEqual(rows(e,'SELECT tag FROM fact_tags WHERE fact_id=? ORDER BY tag',all[1].id).map(x=>x.tag),['memory','worker']);
});
test('immutable existing tag meanings refuse replacement and preserve their history',async t=>{
 const e=await setup(t);await put(e,{source:'save',slug:'area',facts:[{action:'add',type:'project',body:'Preview routes are checked.',tags:['worker']}]});const before=rows(e,'SELECT name,definition,alias_of FROM tags');const changed=await memory(e.repo,e.fake,['tag','worker','--definition','A different meaning']);assert.notEqual(changed.code,0);assert.match(changed.stderr,/immutable/);assert.deepEqual(rows(e,'SELECT name,definition,alias_of FROM tags'),before);
});

test('upkeep closes only threads unchecked for thirty days and caps each actual actor correction pass at fifty',async t=>{
 const e=await setup(t),oldDate=daysAgo(31),recentDate=daysAgo(29);
 for(let i=0;i<52;i++){const input=await e.fake.captureInput({visibility:'private',session:{id:'codex:upkeep:'+i,agent:'codex',status:'captured',reason:null,previousCursor:null,nextCursor:'1',updatedAt:i===51?recentDate:oldDate,branch:'main',cwd:null,startedAt:null,endedAt:null},facts:[{slug:'upkeep',type:'thread',body:'An unchecked question number '+i+'?',tags:[],supersedes:[]}]});const response=await e.fake.call('capture',input);assert.equal(response.status,200,await response.clone().text());}
 const result=await upkeep(e);assert.equal(result.code,0,result.stderr);assert.match(result.stdout,/closed 50/);const all=rows(e,'SELECT * FROM facts ORDER BY id');assert.equal(all.filter(x=>x.type==='thread'&&x.superseded_by!==null).length,50);assert.equal(all.filter(x=>x.type==='thread'&&x.superseded_by===null).length,2);assert.ok(all.filter(x=>x.type==='project').every(x=>x.shared===0&&x.owner_principal_id===all[0].owner_principal_id&&x.session_id!==all[0].session_id));assert.match(all.find(x=>x.type==='project').body,/Closed unchecked after 30 days/);assert.ok(all.slice(0,52).every(x=>x.created_at===(x.id===52?recentDate:oldDate)));
});

test('busy project history cannot hide an old own unchecked thread from scoped upkeep',async t=>{
 const e=await setup(t),input=await e.fake.captureInput({visibility:'private',session:{id:'codex:old-upkeep',agent:'codex',status:'captured',reason:null,previousCursor:null,nextCursor:'1',updatedAt:daysAgo(31),branch:'main',cwd:null,startedAt:null,endedAt:null},facts:[{slug:'old-upkeep',type:'thread',body:'An old own question must still be checked?',tags:[],supersedes:[]}]});assert.equal((await e.fake.call('capture',input)).status,200);
 const busy=await put(e,{source:'save',slug:'busy',facts:Array.from({length:205},(_,i)=>({action:'add',type:'project',body:'Newer project history number '+i}))});assert.equal(busy.code,0,busy.stderr);const old=rows(e,"SELECT superseded_by FROM facts WHERE type='thread'")[0];if(old.superseded_by===null){const result=await upkeep(e);assert.equal(result.code,0,result.stderr);}assert.notEqual(rows(e,"SELECT superseded_by FROM facts WHERE type='thread'")[0].superseded_by,null);assert.equal(rows(e,"SELECT count(*) n FROM facts WHERE body LIKE 'Closed unchecked after 30 days%'")[0].n,1);
});
