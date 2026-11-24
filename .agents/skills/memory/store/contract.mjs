// The memory store's check: one node:test suite any backend must pass before memory runs on it. `makeStore()`
// gives a fresh, empty `{ as(caller) }`: one store object per caller, on one shared set of data. references/setup.md
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

const ANA = { role: 'member', subject: 'ana', email: 'ana@example.com' };
const BO = { role: 'member', subject: 'bo', email: 'bo@example.com' };
const READER = { role: 'reader', subject: 'rae', email: 'rae@example.com' };
const TEAM = { role: 'team', subject: null, email: 'memory-schedule:nightly' };
const ADMIN = { role: 'admin', subject: 'ada', email: 'ada@example.com' };
// An old admin key has no person: its own facts are the unassigned ones.
const OLD_KEY = { role: 'admin', subject: null, email: 'key@example.com' };
const S1 = 'claude:0a0a-0001', S2 = 'claude:0a0a-0002';
const BYTES = new TextEncoder().encode('{"type":"user"}\n');
const session = (id, status = 'captured') => ({ id, agent: 'claude', host: 'test-host', branch: 'main', cwd: '/repo',
  startedAt: '2026-01-01T00:00:00Z', endedAt: null, status, reason: null, readThrough: null, rawBytes: null });
const refused = { kind: 'forbidden' };

export function checkStore(makeStore, name = 'memory store') {
  const open = async () => {
    const backend = await makeStore();
    return caller => backend.as(caller);
  };
  const one = async (store, fact, extra = {}) => (await store.write({ source: 'save', slug: 'demo', facts: [fact], ...extra })).ids[0];
  const byId = async (store, id, query = {}) => (await store.facts([{ ids: [id], ...query }]))[0][0];
  const seen = async (store, everyone = false) => new Set((await store.facts([{ everyone }]))[0].map(fact => fact.id));

  describe(`${name} contract`, () => {
    test('caller says who is calling', async () => {
      const as = await open();
      for (const caller of [ANA, READER, ADMIN]) assert.deepEqual(await (await as(caller)).caller(), caller);
    });

    test('a write stamps the fact from the caller, and a read gives its sources', async () => {
      const ana = await (await open())(ANA);
      const written = await ana.write({ session: session(S1), source: 'save', slug: 'demo', newTags: [{ name: 'deploys', definition: 'Deploys.' }],
        facts: [{ type: 'project', body: 'Deploys go through CI.', tags: ['deploys'], sources: [`session:${S1}`] }] });
      assert.equal(written.ids.length, 1);
      assert.deepEqual([written.superseded, written.left], [[], []]);
      const fact = await byId(ana, written.ids[0], { withTags: true });
      assert.deepEqual(fact.sources, [`session:${S1}`]);
      assert.deepEqual(fact.tags, ['deploys']);
      assert.equal(typeof fact.created_at, 'string');
      assert.deepEqual([fact.slug, fact.type, fact.body, fact.author, fact.owner_subject, fact.shared, fact.superseded_by],
        ['demo', 'project', 'Deploys go through CI.', 'ana@example.com', 'ana', 1, null]);
      assert.deepEqual((await byId(ana, await one(ana, { type: 'project', body: 'Written outside a chat.' }))).sources, []);
    });

    test('a supersede marks the old fact and edits nothing', async () => {
      const as = await open();
      const ana = await as(ANA), bo = await as(BO), admin = await as(ADMIN);
      const old = await one(ana, { type: 'project', body: 'Old words.' });
      const next = await ana.write({ source: 'save', slug: 'demo', facts: [{ type: 'project', body: 'New words.', supersedes: [old] }] });
      assert.deepEqual(next.superseded, [{ asked: [old], marked: [old] }]);
      const kept = await byId(ana, old, { all: true });
      assert.deepEqual([kept.body, kept.superseded_by], ['Old words.', next.ids[0]]);
      assert.equal(await byId(ana, old), undefined, 'a live read leaves the old fact out');
      // A member's supersede of a teammate's fact leaves it live and names it back.
      const tried = await bo.write({ source: 'save', slug: 'demo', facts: [{ type: 'project', body: 'Bo disagrees.', supersedes: next.ids }] });
      assert.deepEqual(tried.superseded, [{ asked: next.ids, marked: [] }]);
      assert.deepEqual(tried.left, [{ id: next.ids[0], author: 'ana@example.com' }]);
      const ruled = await admin.write({ source: 'save', slug: 'demo', facts: [{ type: 'project', body: 'The admin decides.', supersedes: next.ids }] });
      assert.deepEqual(ruled.superseded, [{ asked: next.ids, marked: next.ids }]);
    });

    test('a restate keeps the origin and adds tags; a close ends a thread', async () => {
      const as = await open();
      const ana = await as(ANA), bo = await as(BO);
      const newTags = [{ name: 'deploys', definition: 'Deploys.' }, { name: 'ci', definition: 'CI.' }];
      const id = await one(ana, { type: 'project', body: 'Deploys wait for CI.', tags: ['deploys'] }, { session: session(S1), newTags });
      const before = await byId(ana, id);
      const [restated] = (await ana.write({ source: 'consolidation', facts: [{ restate: id, tags: ['ci'] }] })).ids;
      const after = await byId(ana, restated, { withTags: true });
      for (const key of ['slug', 'type', 'body', 'author', 'created_at', 'owner_subject', 'shared']) assert.equal(after[key], before[key], key);
      assert.deepEqual(after.sources, before.sources);
      assert.deepEqual([...after.tags].sort(), ['ci', 'deploys']);
      assert.equal((await byId(ana, id, { all: true })).superseded_by, restated);
      await assert.rejects(bo.write({ source: 'consolidation', facts: [{ restate: restated, tags: ['ci'] }] }), refused);

      const thread = await one(ana, { type: 'thread', body: 'Is the deploy fixed?', tags: ['deploys'] });
      const [closed] = (await ana.write({ source: 'consolidation', facts: [{ close: thread, body: 'Closed: the deploy is fixed.' }] })).ids;
      const done = await byId(ana, closed, { withTags: true });
      assert.deepEqual([done.type, done.body, done.tags, done.owner_subject], ['project', 'Closed: the deploy is fixed.', ['deploys'], 'ana']);
      assert.equal((await byId(ana, thread, { all: true })).superseded_by, closed);
    });

    test('each caller sees what the role table allows', async () => {
      const as = await open();
      const [ana, bo, reader, team, admin, oldKey] = await Promise.all([ANA, BO, READER, TEAM, ADMIN, OLD_KEY].map(as));
      const shared = await one(ana, { type: 'project', body: 'A shared decision.' });
      const personal = await one(ana, { type: 'user', body: 'Ana likes short replies.' });
      const feedback = await one(ana, { type: 'feedback', body: 'Ana wants tests first.' });
      const unshared = await one(reader, { type: 'project', body: 'A reader note.' });
      const unassigned = await one(oldKey, { type: 'user', body: 'An unassigned old note.' });
      const teamFact = await one(team, { type: 'project', body: 'A nightly schedule note.' });
      assert.equal((await byId(reader, unshared)).shared, 0);
      const all = [shared, personal, feedback, unshared, unassigned, teamFact];
      const expect = async (store, everyone, ids) => assert.deepEqual([...await seen(store, everyone)].sort(), [...ids].sort());
      await expect(ana, false, [shared, personal, feedback, teamFact]);
      await expect(bo, false, [shared, teamFact]);
      await expect(bo, true, [shared, teamFact]);
      await expect(reader, false, [shared, unshared, teamFact]);
      await expect(team, false, [shared, teamFact]);
      await expect(admin, false, [shared, teamFact]);
      await expect(admin, true, all);
      await expect(oldKey, false, [shared, unassigned, teamFact]);
      await expect(oldKey, true, all);
      // A schedule writes team facts only; a tag is everyone's, so only the admin changes one.
      await assert.rejects(team.write({ session: session(S1), source: 'save', slug: 'demo', facts: [{ type: 'project', body: 'No.' }] }), refused);
      await assert.rejects(team.putSession(session(S1)), refused);
      await assert.rejects(ana.defineTag({ name: 'ci', definition: 'CI.', aliasOf: null }), refused);
      assert.deepEqual(await admin.defineTag({ name: 'ci', definition: 'CI.', aliasOf: null }), {});
      const tag = (await ana.tags()).find(row => row.name === 'ci');
      assert.deepEqual([tag.definition, tag.alias_of, typeof tag.uses], ['CI.', null, 'number']);
    });

    test('sessions and transcripts belong to their owner', async () => {
      const as = await open();
      const [ana, bo, admin] = await Promise.all([ANA, BO, ADMIN].map(as));
      assert.deepEqual(await ana.putSession({ ...session(S1), readThrough: 5 }), {});
      const row = await ana.session({ id: S1 });
      assert.deepEqual([row.id, row.status, Number(row.read_through)], [S1, 'captured', 5]);
      assert.equal(await bo.session({ id: S1 }), null);
      assert.equal((await admin.session({ id: S1 })).id, S1);
      await assert.rejects(bo.putSession(session(S1)), refused);
      await ana.putSession(session(S2, 'private'));
      await assert.rejects(ana.putSession(session(S2)), refused, 'a private session stays private');

      const id = await one(ana, { type: 'project', body: 'Said in the chat.' }, { session: session(S1) });
      await assert.rejects(bo.putTranscript({ sessionId: S1, agent: 'claude' }, BYTES), refused);
      const put = await ana.putTranscript({ sessionId: S1, agent: 'claude' }, BYTES);
      assert.deepEqual(await ana.transcript({ factId: 999999 }), { fact: null });
      assert.ok((await bo.transcript({ factId: id })).missing, 'a teammate sees the fact, not its transcript');
      if (put.missing) return;
      assert.equal(typeof put.key, 'string');
      for (const reader of [ana, admin]) assert.deepEqual([...await reader.transcript({ factId: id })], [...BYTES]);
    });

    test('the digest, runs and stats answer in their shapes', async () => {
      const as = await open();
      const [ana, bo] = await Promise.all([ANA, BO].map(as));
      const newTags = [{ name: 'plan', definition: 'Planning.' }];
      const here = await one(ana, { type: 'thread', body: 'Plan the deploy.', tags: ['plan'] }, { newTags });
      await one(ana, { slug: 'other', type: 'thread', body: 'Plan another change.', tags: ['plan'] });
      await one(ana, { type: 'project', body: 'A decision.' });
      assert.deepEqual(await ana.putRun({ kind: 'capture', host: 'test-host', startedAt: '2026-01-01T00:00:00Z', status: 'ok', reason: null, counts: { captured: 1 } }), {});
      const digest = await ana.digest({ slug: 'demo', stepTags: ['plan'] });
      assert.deepEqual(digest.threads.map(fact => fact.id), [here]);
      assert.deepEqual(digest.steps.map(({ tag, n }) => ({ tag, n })), [{ tag: 'plan', n: 1 }]);
      assert.deepEqual([digest.live, digest.run.kind, digest.run.status, digest.daily], [3, 'capture', 'ok', null]);
      assert.ok(!('facts' in digest) && !('consolidation' in digest), 'the digest lists no facts of its own');
      assert.equal((await bo.digest({ slug: 'demo', stepTags: ['plan'] })).run, null, 'a run is only its sender\'s');
      const stats = await ana.stats();
      assert.deepEqual(stats.types.map(({ type, n }) => ({ type, n })), [{ type: 'project', n: 1 }, { type: 'thread', n: 2 }]);
      assert.deepEqual(['facts', 'live', 'sessions', 'private'].map(key => Number(stats.totals[key])), [3, 3, 0, 0]);
      assert.ok(Array.isArray(stats.consolidations));
    });

    test('a read by session gives only that chat\'s facts', async () => {
      const ana = await (await open())(ANA);
      const mine = await one(ana, { type: 'project', body: 'Said in chat one.' }, { session: session(S1) });
      await one(ana, { type: 'project', body: 'Said in chat two.' }, { session: session(S2) });
      await one(ana, { type: 'project', body: 'Said outside a chat.' });
      assert.deepEqual((await ana.facts([{ session: S1 }]))[0].map(fact => fact.id), [mine]);
    });

    test('one daily run a day for each sign-in: the first claim wins, force claims again, and the finish fills the row', async () => {
      const as = await open();
      const [ana, bo, team] = await Promise.all([ANA, BO, TEAM].map(as));
      const daily = (store, extra) => store.putRun({ kind: 'daily', status: 'started', day: '2026-11-11', host: 'laptop', reason: null, counts: {}, ...extra });
      assert.deepEqual(await daily(ana), { claimed: true });
      assert.deepEqual(await daily(ana, { host: 'desktop' }), { claimed: false }, 'a second computer the same day starts none');
      assert.deepEqual(await daily(bo), { claimed: true }, 'a teammate has a day of their own');
      assert.deepEqual(await daily(ana, { day: '2026-11-12' }), { claimed: true });
      assert.deepEqual(await daily(ana, { day: '2026-11-12', force: true, host: 'desktop' }), { claimed: true });
      await ana.putRun({ kind: 'daily', status: 'ok', day: '2026-11-12', host: 'desktop', reason: null, counts: { added: 4, pages: 2 } });
      const { daily: last } = await ana.digest({});
      assert.deepEqual([last.day, last.status, last.host, last.counts], ['2026-11-12', 'ok', 'desktop', { added: 4, pages: 2 }]);
      assert.equal(typeof last.last, 'string');
      assert.equal((await bo.digest({})).daily.day, '2026-11-11', 'each sign-in reads its own');
      await assert.rejects(daily(ana, { day: 'today' }), { kind: 'query' });
      await assert.rejects(daily(team), refused);
    });

    test('the digest names the busy tags of the week, eight at most, and only your own new preferences', async () => {
      const as = await open();
      const [ana, bo] = await Promise.all([ANA, BO].map(as));
      const names = Array.from({ length: 10 }, (_, i) => `topic${i}`);
      const newTags = names.map(name => ({ name, definition: `Topic ${name}.` }));
      for (const [i, name] of names.entries()) {
        for (let n = 0; n <= i; n += 1) await one(ana, { type: 'project', body: `Work on ${name}, part ${n}.`, tags: [name] }, { newTags });
      }
      await one(ana, { type: 'project', body: 'An old decision.', tags: ['topic0'] }, { createdAt: '2026-01-01T00:00:00Z' });
      const { lately } = await ana.digest({});
      assert.deepEqual(lately.map(({ tag, n }) => [tag, Number(n)]), names.slice(2).reverse().map((name, i) => [name, 10 - i]));
      const liked = await one(ana, { type: 'feedback', body: 'Ana wants tests first.' });
      const who = await one(ana, { type: 'user', body: 'Ana runs operations.' });
      await one(ana, { type: 'feedback', body: 'Ana liked short replies long ago.' }, { createdAt: '2026-01-01T00:00:00Z' });
      await one(bo, { type: 'feedback', body: 'Bo wants long replies.' });
      assert.deepEqual((await ana.digest({})).fresh.map(fact => fact.id).sort(), [liked, who].sort());
      await ana.putRun({ kind: 'daily', status: 'ok', day: '2099-01-01', host: 'laptop', reason: null, counts: {}, startedAt: '2099-01-01T00:00:00Z' });
      assert.deepEqual((await ana.digest({})).fresh, [], 'a finished tidy placed them');
    });
  });
}
