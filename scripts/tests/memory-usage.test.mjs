// Use counts: one row for each look-up a chat makes, what a summary reads from the rows, and the commands that add one.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { recordUse, usageSummary, weakAnswer } from '../../.agents/plugins/memory/scripts/lib/usage.mjs';
import { memory, node, rows, setup, tempDir, writeJsonFile } from './fixtures/memory/harness.mjs';

const usesIn = dir => (existsSync(join(dir, 'usage.jsonl')) ? readFileSync(join(dir, 'usage.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line)) : []);

test('each look-up adds one row: a hit keeps no words, a miss keeps its words cut to 200', t => {
  const ctx = { root: '/work/sales-chat', stateDir: tempDir(t, 'usage-') };
  recordUse(ctx, { command: 'pull', node: 'memory', topics: ['memory', 'memory'], facts: [3, 3, 4], words: 'words of a hit' });
  recordUse(ctx, { command: 'recall', miss: true, words: `where   is\nthe rule ${'x'.repeat(300)}` });
  recordUse(ctx, { command: 'search', facts: Array.from({ length: 50 }, (_, n) => n + 1) });
  const [hit, miss, many] = usesIn(ctx.stateDir);
  const { at, ...rest } = hit;
  assert.match(at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.deepEqual(rest, { command: 'pull', node: 'memory', topics: ['memory'], facts: [3, 4], workspace: 'sales-chat' });
  assert.deepEqual([miss.miss, miss.words.length, miss.words.startsWith('where is the rule xxx')], [true, 200, true]);
  assert.equal(many.facts.length, 20, 'a row holds 20 fact ids at most');
});

test('an answer is weak when nothing came back, or no one fact holds half of the question\'s main words', () => {
  const question = 'which espresso machine does the office use';
  const unrelated = ['The washing machine is in the yard.', 'The office opens at 9.', 'A sewing machine was sold.'];
  assert.equal(weakAnswer(question, unrelated), true, 'each fact shares one of three main words, and no two add up');
  assert.equal(weakAnswer(question, [...unrelated, 'The office bought a new machine.']), false, 'two of three');
  assert.equal(weakAnswer('refund approval owner', ['The owner approved it.']), false, 'approval matches approved');
  assert.equal(weakAnswer('plan links rule', ['Each plan prints its link.']), false, 'a plural matches its singular');
  assert.equal(weakAnswer('what about espresso', ['The washing machine is in the yard.']), false, 'one main word: any answer is a hit');
  assert.equal(weakAnswer('', ['Any fact.']), false, 'a look-up by filter alone asks no words');
  assert.equal(weakAnswer(question, []), true);
  assert.equal(weakAnswer('espresso', []), true);
});

test('a background run adds no row, and a state folder that can not be written fails no read', t => {
  const dir = tempDir(t, 'usage-');
  const ctx = { root: '/work/chat', stateDir: dir };
  process.env.WONG_MEMORY_RUN = '1';
  t.after(() => { delete process.env.WONG_MEMORY_RUN; });
  recordUse(ctx, { command: 'pull', node: 'memory', topics: ['memory'] });
  assert.deepEqual(usesIn(dir), []);
  delete process.env.WONG_MEMORY_RUN;
  // The tests run as root, which no mode stops: a file where the folder should be does.
  writeFileSync(join(dir, 'a-file'), '');
  const blocked = { root: '/work/chat', stateDir: join(dir, 'a-file', 'state') };
  assert.doesNotThrow(() => recordUse(blocked, { command: 'pull', node: 'memory', topics: ['memory'] }));
  assert.deepEqual(usageSummary(blocked), { lookups: 0, topics: [], facts: [], misses: [], pairs: [] });
});

test('a summary drops rows over 30 days old, and gives the most used topics, the facts returned most, the missed questions, and topics used together', t => {
  const ctx = { root: '/work/chat', stateDir: tempDir(t, 'usage-') };
  const row = (at, workspace, command, more = {}) => JSON.stringify({ at: `${at}:00:00.000Z`, command, node: null, topics: [], facts: [], workspace, ...more });
  writeFileSync(join(ctx.stateDir, 'usage.jsonl'), [
    row('2026-10-11T00', 'w', 'pull', { topics: ['a'], facts: [9] }),
    row('2026-11-10T10', 'w', 'pull', { topics: ['a', 'bee'], facts: [1, 2] }),
    row('2026-11-10T11', 'w', 'recall', { miss: true, words: 'Refund rule' }),
    row('2026-11-11T10', 'w', 'topic', { topics: ['a'] }),
    row('2026-11-11T11', 'w', 'search', { topics: ['b'], facts: [1] }),
    row('2026-11-11T12', 'v', 'pull', { miss: true, words: 'other thing' }),
    'not json',
    row('2026-11-12T09', 'w', 'pull', { topics: ['a', 'b', 'c'], facts: [1, 3] }),
    row('2026-11-12T10', 'w', 'recall', { miss: true, words: 'refund rule' }),
    row('2026-11-12T11', 'v', 'pull', { topics: ['a', 'c'] }),
  ].map(line => `${line}\n`).join(''));
  const now = Date.parse('2026-11-12T12:00:00Z');
  // `bee` is an alias of the topic `b`; `c` is a tag with no page.
  const topicOf = tag => ({ a: 'a', b: 'b', bee: 'b' })[tag] ?? null;
  assert.deepEqual(usageSummary(ctx, { now, topicOf }), {
    lookups: 8,
    topics: [{ topic: 'a', uses: 4 }, { topic: 'b', uses: 3 }],
    facts: [{ id: 1, uses: 3 }, { id: 2, uses: 1 }, { id: 3, uses: 1 }],
    misses: [{ words: 'refund rule', command: 'recall', at: '2026-11-12T10:00:00.000Z', times: 2 }, { words: 'other thing', command: 'pull', at: '2026-11-11T12:00:00.000Z', times: 1 }],
    pairs: [{ topics: ['a', 'b'], days: 3 }],
  });
  const kept = usesIn(ctx.stateDir);
  assert.deepEqual([kept.length, kept[0].at], [8, '2026-11-10T10:00:00.000Z'], 'the row 32 days old and the broken line are gone from the file');
  assert.equal(usageSummary(ctx, { now, topicOf, since: '2026-11-12T00:00:00.000Z' }).lookups, 3);
});

const files = (root, map) => Object.entries(map).forEach(([path, body]) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), body);
});

test('a pull, a recall, a name that is no node and the prompt hook each add a row, a background run none; usage prints three lists', async t => {
  const env = await setup(t);
  files(env.repo.root, {
    'wiki/development/memory.md': '# Memory\n\nFacts live in the store.\n',
    'knowledge/README.md': '# Company\n\n- [People](people/README.md)\n',
    'knowledge/people/README.md': '# People\n\nWho is who.\n',
    'knowledge/people/ada.md': '# Ada\n\nAda runs the ads.\n',
  });
  const stored = await memory(env.repo, env.fake, ['put-facts', '--file', writeJsonFile(env.repo.home, 'in.json', { source: 'save', slug: 'topic-web', facts: [
    { action: 'add', type: 'thread', body: 'Should related topics count changes?', tags: ['memory'] },
    { action: 'add', type: 'project', body: 'A pull shows three items a group.', tags: ['memory'] },
  ] })]);
  assert.equal(stored.code, 0, stored.stderr);
  const ids = rows(env, 'SELECT id FROM facts ORDER BY id').map(fact => fact.id);
  const run = (args, options) => memory(env.repo, env.fake, args, options);
  const hook = prompt => node(env.repo, env.fake, 'topic-match.mjs', [], { input: JSON.stringify({ prompt, session_id: 'chat-1', cwd: env.repo.root }) });

  assert.equal((await run(['pull', 'memory'])).code, 0);
  assert.equal((await run(['pull', 'memry'])).code, 1);
  assert.equal((await run(['recall', 'zebra migration quota', '--mode', 'keyword'])).code, 0);
  assert.match((await hook('What did Ada say about the ads?')).stdout, /Topic people\/ada/);
  assert.equal((await hook('And Ada again?')).stdout, '', 'a topic the chat has is added no second time');
  const used = usesIn(env.repo.stateDir);
  assert.deepEqual(used.map(use => [use.command, use.node, use.topics, use.miss ?? false, use.words ?? null]), [
    ['pull', 'memory', ['memory'], false, null],
    ['pull', null, [], true, 'memry'],
    ['recall', null, [], true, 'zebra migration quota'],
    ['topic', null, ['people/ada'], false, null],
  ]);
  assert.deepEqual([...used[0].facts].sort((a, b) => a - b), ids);
  assert.equal(used[0].workspace.length > 0, true);

  assert.equal((await run(['pull', 'memory'], { env: { WONG_MEMORY_RUN: '1' } })).code, 0);
  assert.equal(usesIn(env.repo.stateDir).length, 4, 'a background run counts no use');

  const day = new Date().toISOString().slice(0, 10);
  const text = await run(['usage']);
  assert.equal(text.code, 0, text.stderr);
  assert.equal(text.stdout, ['4 look-ups by chats on this computer in the last 30 days.',
    '## Most used topics', '- memory (1)', '- people/ada (1)',
    '## Facts returned most', ...ids.map(id => `- #${id} (1)`),
    '## Questions that found nothing', `- zebra migration quota (recall, ${day})`, `- memry (pull, ${day})`, ''].join('\n'));
  const json = JSON.parse((await run(['usage', '--days', '7', '--json'])).stdout);
  assert.deepEqual([json.version, json.days, json.lookups, json.topics[0]], [1, 7, 4, { topic: 'memory', uses: 1 }]);
  assert.equal(usesIn(env.repo.stateDir).length, 4, 'reading the counts adds none');

  for (const command of ['recall', 'search', 'brief']) {
    const weak = await run([command, 'pull zebra migration quota', ...(command === 'recall' ? ['--mode', 'keyword'] : [])]);
    assert.equal(weak.code, 0, weak.stderr);
    assert.match(weak.stdout, /A pull shows three items a group\./, `${command} still gives the fact that shares one word`);
    const row = usesIn(env.repo.stateDir).at(-1);
    assert.deepEqual([row.command, row.miss, row.words, row.facts, row.topics], [command, true, 'pull zebra migration quota', [], []], 'and counts no answer');
  }

  const found = await run(['recall', 'pull shows three items', '--mode', 'keyword']);
  assert.equal(found.code, 0, found.stderr);
  const last = usesIn(env.repo.stateDir).at(-1);
  assert.deepEqual([last.command, last.miss ?? false, last.words ?? null, last.facts.includes(ids[1]), last.topics], ['recall', false, null, true, ['memory']]);
});

test('with no look-up yet, usage says so in each list', async t => {
  const env = await setup(t);
  const text = await memory(env.repo, env.fake, ['usage']);
  assert.equal(text.code, 0, text.stderr);
  assert.equal(text.stdout, ['0 look-ups by chats on this computer in the last 30 days.', '## Most used topics', 'None yet.', '## Facts returned most', 'None yet.',
    '## Questions that found nothing', 'None.', ''].join('\n'));
});
