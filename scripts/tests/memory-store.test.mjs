// Current CLI cases use the fresh schema14/full-core harness; no legacy transport.
import assert from 'node:assert/strict';
import {mkdirSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {test} from 'node:test';
import {ftsQuery,nearTag,normalizeTag} from '../../.agents/skills/memory/scripts/memory.mjs';
import {findCredential,redact,secretValues} from '../../.agents/skills/memory/scripts/lib/scan.mjs';
import {parseEnv} from '../../.agents/skills/memory/scripts/lib/store.mjs';
import {MAX_BYTES,MAX_LINES} from '../../.agents/skills/memory/scripts/lib/digest.mjs';
import {memory,rows,SECRET,setup,writeJsonFile} from './fixtures/memory/harness.mjs';
const put=(env,input)=>memory(env.repo,env.fake,['put-facts','--file',writeJsonFile(env.repo.home,crypto.randomUUID()+'.json',input)]);
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

test('search filters text/type/slug/date/state and refuses email authorization filtering', async t => {
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
  assert.match((await memory(env.repo,env.fake,['search','--author','dev@'])).stderr,/author-filter-retired/);
  assert.match((await memory(env.repo, env.fake, ['search', '--state', 'active'])).stdout, /No matching facts/);
});

test('.env values lose their quotes and comments, and keep what is inside the quotes', () => {
  const text = ['A="abc" # note', 'B="x y"  ', "C='single'", 'D="has # inside"', 'E=plain # note', 'export F=exported', 'G=a#b', 'H=', 'I="crlf"\r', ''].join('\n');
  assert.deepEqual(parseEnv(text), { A: 'abc', B: 'x y', C: 'single', D: 'has # inside', E: 'plain', F: 'exported', G: 'a#b', H: '', I: 'crlf' });
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
  for(const fact of facts){const saved=await put(env,{source:'save',slug:fact.slug,facts:[{action:'add',type:fact.type,body:fact.body,...(fact.type==='thread'?{tags:['plan']}:{})}]});assert.equal(saved.code,0,saved.stderr);}
  const stored=rows(env,'SELECT id,body FROM facts'),ids=new Map(stored.map(row=>[row.id,facts.find(f=>f.body===row.body).key]));
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
  const alias=await put(env,{source:'save',slug:'q',newTags:[{name:'checks',definition:'Look-alike of verify.',aliasOf:'verify'}],facts:[]});assert.equal(alias.code,0,alias.stderr);
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


test('known private current bearer and JWK secret are rejected even as bare prose',async t=>{
 const e=await setup(t),state=JSON.parse(readFileSync(join(e.repo.stateDir,'machine.json'),'utf8'));
 for(const secret of [state.credential.token,state.privateKey.d]){const r=await put(e,{source:'save',slug:'secret',facts:[{action:'add',type:'project',body:'The private value is '+secret}]});assert.equal(r.code,1);assert.doesNotMatch(r.stdout+r.stderr,new RegExp(secret));}
 assert.equal(rows(e,'SELECT count(*) n FROM facts')[0].n,0);
});
test('consolidated digest prioritizes old private preferences and reports the exact total under busy history',async t=>{
 const e=await setup(t);await put(e,{source:'save',slug:'prefs',facts:[{action:'add',type:'feedback',body:'The user wants brief release notes.'}]});
 const result=await put(e,{source:'save',slug:'busy',facts:Array.from({length:205},(_,i)=>({action:'add',type:'project',body:'Busy team project decision '+i}))});assert.equal(result.code,0,result.stderr);
 const d=await memory(e.repo,e.fake,['digest']);assert.equal(d.code,0,d.stderr);assert.match(d.stdout,/brief release notes/);const shown=d.stdout.split('\n').filter(x=>x.startsWith('- [')).length;assert.match(d.stdout,new RegExp((206-shown)+' more live facts'));
 assert.ok(Buffer.byteLength(d.stdout)<=MAX_BYTES+1);assert.ok(d.stdout.trimEnd().split('\n').length<=MAX_LINES);
});

test('change-only search follows the renamed session union and combines branch, tag and FTS filters',async t=>{
 const e=await setup(t),sessionId='codex:renamed-business-session';let previous=null;
 for(const [slug,body,next] of [['old-change','Original release pipeline uses guarded capture.','4'],['renamed-change','Renamed release pipeline retains the original session.','8']]){const input=await e.fake.captureInput({session:{id:sessionId,agent:'codex',status:'captured',reason:null,previousCursor:previous,nextCursor:next,updatedAt:new Date().toISOString(),branch:'feature/release',cwd:null,startedAt:null,endedAt:null},facts:[{slug,type:'project',body,tags:[],supersedes:[]}]});const response=await e.fake.call('capture',input);assert.equal(response.status,200,await response.clone().text());previous=next;}
 const union=await memory(e.repo,e.fake,['search','release','pipeline','--change','old-change']);assert.equal(union.code,0,union.stderr);assert.match(union.stdout,/Original release/);assert.match(union.stdout,/Renamed release/);assert.doesNotMatch((await memory(e.repo,e.fake,['search','release','--branch','unrelated'])).stdout,/release pipeline/);
 const tagged=await memory(e.repo,e.fake,['put-facts','--file',writeJsonFile(e.repo.home,'branch-tags.json',{source:'save',slug:'tagged',facts:[{action:'add',type:'project',body:'Tagged release pipeline uses verification.',tags:['worker']}]})]);assert.equal(tagged.code,0,tagged.stderr);const combined=await memory(e.repo,e.fake,['search','release','pipeline','--tag','worker','--branch','main','--change','tagged']);assert.match(combined.stdout,/Tagged release/);assert.doesNotMatch(combined.stdout,/Original release|Renamed release/);
});
test('search applies local change state before the user limit',async t=>{
 const e=await setup(t);mkdirSync(join(e.repo.root,'openspec/changes/active-release'),{recursive:true});await put(e,{source:'save',slug:'active-release',facts:[{action:'add',type:'project',body:'The active release result must survive newer conversation noise.'}]});await put(e,{source:'save',slug:'conversation',facts:Array.from({length:12},(_,i)=>({action:'add',type:'project',body:'Newer release conversation noise '+i}))});const found=await memory(e.repo,e.fake,['search','release','--state','active','--limit','1']);assert.equal(found.code,0,found.stderr);assert.match(found.stdout,/active release result/);assert.doesNotMatch(found.stdout,/Newer release conversation noise/);
});
test('people page stays bounded in the actual digest and absent page falls back to private facts',async t=>{
 const e=await setup(t);await put(e,{source:'save',slug:'person',facts:[{action:'add',type:'user',body:'The user prefers concise business explanations.'}]});const absent=await memory(e.repo,e.fake,['digest']);assert.match(absent.stdout,/concise business explanations/);assert.doesNotMatch(absent.stdout,/## You/);mkdirSync(join(e.repo.root,'wiki/people'),{recursive:true});writeFileSync(join(e.repo.root,'wiki/people/dev.md'),'# Dev\nEmail: dev@example.com\n'+Array.from({length:100},(_,i)=>'Personal detail '+i+' '+('long '.repeat(20))).join('\n'));
 const present=await memory(e.repo,e.fake,['digest']);assert.equal(present.code,0,present.stderr);assert.match(present.stdout,/## You \(wiki\/people\/dev.md\)/);assert.match(present.stdout,/The rest: wiki\/people\/dev.md/);assert.match(present.stdout,/concise business explanations/);assert.ok(Buffer.byteLength(present.stdout)<=MAX_BYTES+1);assert.ok(present.stdout.trimEnd().split('\n').length<=MAX_LINES);
});
test('completed consolidation metrics derive every exact capture piece rather than the final piece or a model report',async t=>{
 const e=await setup(t),result=await put(e,{source:'consolidation',slug:'team',facts:Array.from({length:6},(_,i)=>({action:'add',type:'project',body:'Merged business observation '+i}))});assert.equal(result.code,0,result.stderr);const response=await e.fake.call('query',{operation:'runs',params:{}});assert.equal(response.status,200);const [run]=(await response.json()).result;assert.equal(run.kind,'consolidation');assert.equal(JSON.parse(run.counts).added,6);assert.equal(rows(e,'SELECT counts FROM runs').map(x=>JSON.parse(x.counts).added).at(-1),1);
});
