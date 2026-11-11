// The pull: related topics' score and caps, and `pull <node>` for a topic, a path, a change, a fact, and a word
// that is no node, inside its line and byte caps, with the store answering and not.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { MAX_BYTES, MAX_LINES, MORE_ITEMS, related } from '../../.agents/plugins/memory/scripts/lib/pull.mjs';
import { memory, rows, setup, tempDir, writeJsonFile } from './fixtures/memory/harness.mjs';

const files = (root, map) => Object.entries(map).forEach(([path, body]) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), body);
});
// A store that answers tag and slug queries from a list, as the real one does for these reads.
const listStore = facts => ({ facts: async queries => queries.map(query => facts
  .filter(fact => (!query.tags || query.tags.some(tag => fact.tags.includes(tag))) && (!query.slug || fact.slug === query.slug))
  .slice(0, query.limit ?? 50)) });
let id = 0;
const fact = (slug, tags, body = `Fact ${id + 1}.`) => ({ id: ++id, slug, tags, body, type: 'project' });

test('related scores 3 a shared fact and 1 a fact of a shared change, at most 10 from one change', async t => {
  const root = tempDir(t, 'pull-related-');
  files(root, { 'a.md': '# A\n\nSee [b](b.md).\n', 'b.md': '# B\n', 'c.md': '# C\n' });
  const areas = { a: { page: 'a.md', aliases: ['alpha'] }, b: { page: 'b.md' }, c: { page: 'c.md' }, bare: { page: null } };
  const store = listStore([
    fact('s1', ['a', 'b', 'bare'], 'A and B share this fact.'),
    fact('s1', ['alpha']),
    fact('s1', ['b']),
    ...Array.from({ length: 12 }, () => fact('s1', ['c', 'bare'])),
  ]);
  const found = await related(store, areas, 'alpha', { root });
  assert.deepEqual(found.map(({ tag, score, facts, changes, linked }) => ({ tag, score, facts, changes, linked })), [
    { tag: 'c', score: 10, facts: 0, changes: 1, linked: false },
    { tag: 'b', score: 4, facts: 1, changes: 1, linked: true },
  ], 'c: 12 facts in s1 count 10; b: 3 for the shared fact and 1 in s1; a tag with no page is no topic');
  assert.equal(found[1].sample, 'A and B share this fact.');
});

test('related names eight topics at most, highest score first', async () => {
  const tags = Array.from({ length: 10 }, (_, n) => `t${n}`);
  const areas = Object.fromEntries(['a', ...tags].map(tag => [tag, { page: `${tag}.md` }]));
  const store = listStore(tags.flatMap((tag, n) => Array.from({ length: n + 1 }, () => fact(null, ['a', tag]))));
  const found = await related(store, areas, 'a');
  assert.deepEqual(found.map(row => row.tag), ['t9', 't8', 't7', 't6', 't5', 't4', 't3', 't2']);
  assert.equal(found[0].score, 30);
});

const PAGES = {
  'wiki/development/memory.md': '# Memory\n\nFacts live in the store. Read [mini apps](../stack/mini-apps.md).\n\n## Capture\n\n## Digest\n',
  'wiki/stack/mini-apps.md': '# Mini apps\n\nPages at /apps/.\n',
  'wiki/stack/core-stack.md': '# Core stack\n\nThe Worker.\n',
  'app/worker/index.ts': '',
};
const put = (env, value) => memory(env.repo, env.fake, ['put-facts', '--file', writeJsonFile(env.repo.home, `in-${Math.random()}.json`, value)]);

async function seeded(t) {
  const env = await setup(t);
  files(env.repo.root, { ...PAGES, 'openspec/changes/topic-web/proposal.md': '# Pull any node\n' });
  const stored = await put(env, { source: 'save', slug: 'topic-web', facts: [
    { action: 'add', type: 'thread', body: 'Should related topics count changes?', tags: ['memory'] },
    { action: 'add', type: 'project', body: 'A pull shows three items a group.', tags: ['memory', 'mini-apps'] },
    { action: 'add', type: 'feedback', body: 'Keep pull answers short.', tags: ['memory'] },
    { action: 'add', type: 'project', body: 'The Worker serves mini apps.', tags: ['worker', 'mini-apps'] },
  ] });
  assert.equal(stored.code, 0, stored.stderr);
  return env;
}

test('pull <topic>: summary, page, parts, links, related, changes, and its fact groups', async t => {
  const env = await seeded(t);
  const result = await memory(env.repo, env.fake, ['pull', 'memory']);
  assert.equal(result.code, 0, result.stderr);
  const lines = result.stdout.trim().split('\n');
  assert.equal(lines[0], '# memory (topic)');
  assert.ok(lines.includes('Page: wiki/development/memory.md'));
  assert.ok(lines.includes('Parts: Capture · Digest'));
  assert.ok(lines.includes('Links: mini-apps'));
  assert.ok(lines.includes('Related: mini-apps (1 shared fact, 1 shared change, linked) · worker (0 shared facts, 1 shared change)'), result.stdout);
  assert.ok(lines.includes('Changes: topic-web (active, 3 facts)'), result.stdout);
  assert.match(result.stdout, /## Open threads\n- \[thread\] Should related topics count changes\?/);
  assert.match(result.stdout, /## Likes\n- \[feedback\] Keep pull answers short\./);
  assert.match(result.stdout, /## Decided\n- \[project\] A pull shows three items a group\./);
  assert.match(lines.at(-1), /^3 live facts\. Pull a name or a number above/);
  const json = JSON.parse((await memory(env.repo, env.fake, ['pull', 'memory', '--json'])).stdout);
  assert.equal(json.kind, 'topic');
  assert.deepEqual(json.related.map(row => [row.tag, row.linked]), [['mini-apps', true], ['worker', false]]);
  const near = JSON.parse((await memory(env.repo, env.fake, ['related', 'memory', '--json'])).stdout);
  assert.deepEqual(near.related.map(row => row.tag), ['mini-apps', 'worker']);
});

test('pull <path> prints the areas lookup, then its fact groups', async t => {
  const env = await seeded(t);
  const result = await memory(env.repo, env.fake, ['pull', 'app/worker/index.ts']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /^Areas: worker \(app\/worker\/index\.ts\)\nDocs: /);
  assert.match(result.stdout, /## Decided\n- \[project\] The Worker serves mini apps\./);
});

test('pull wiki: a root folder that is also a topic shows the topic, its page and related groups', async t => {
  const env = await seeded(t);
  files(env.repo.root, { 'wiki/wiki-style.md': '# Wiki style\n\nOne topic, one page. See [memory](development/memory.md).\n\n## Links\n' });
  const stored = await put(env, { source: 'save', slug: 'topic-web', facts: [{ action: 'add', type: 'project', body: 'Wiki pages link their topics.', tags: ['wiki', 'memory'] }] });
  assert.equal(stored.code, 0, stored.stderr);
  const result = await memory(env.repo, env.fake, ['pull', 'wiki']);
  assert.equal(result.code, 0, result.stderr);
  const lines = result.stdout.trim().split('\n');
  assert.equal(lines[0], '# wiki (topic)');
  assert.ok(lines.includes('Page: wiki/wiki-style.md'), result.stdout);
  assert.match(result.stdout, /^Related: memory \(1 shared fact, 1 shared change, linked\)/m);
  assert.match(result.stdout, /## Decided\n- \[project\] Wiki pages link their topics\./);
});

test('pull <change> and show <change>: title, topics, threads, facts, chats', async t => {
  const env = await seeded(t);
  for (const command of ['pull', 'show']) {
    const result = await memory(env.repo, env.fake, [command, 'topic-web']);
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /^# topic-web \(active\): 4 live facts\nProposal: openspec\/changes\/topic-web\/proposal\.md — Pull any node\n/);
    assert.match(result.stdout, /^Topics: memory \(3\) · mini-apps \(2\) · worker \(1\)$/m);
    assert.match(result.stdout, /## Open threads\n- \[thread\] Should related/);
    assert.match(result.stdout, /## Facts, newest first\n(- \[\w+\] .+\n){3}/);
  }
});

test('pull #N: the whole fact, its topics and change, and what replaced it', async t => {
  const env = await seeded(t);
  const [old] = rows(env, "SELECT id FROM facts WHERE body LIKE 'A pull shows%'");
  await put(env, { source: 'save', slug: 'topic-web', facts: [{ action: 'supersede', supersedes: [old.id], type: 'project', body: 'A pull shows three items a group, and a count.', tags: ['memory'] }] });
  const [next] = rows(env, "SELECT id FROM facts WHERE body LIKE '%and a count.'");
  const before = await memory(env.repo, env.fake, ['pull', `#${old.id}`]);
  assert.equal(before.code, 0, before.stderr);
  assert.match(before.stdout, new RegExp(`^# Fact #${old.id} \\(project, superseded by #${next.id}\\)\\nA pull shows three items a group\\.\\n`));
  assert.match(before.stdout, /^Topics: memory · mini-apps$/m);
  assert.match(before.stdout, /^Change: topic-web \(active\)$/m);
  assert.match(before.stdout, /## Replaced by\n- \[project\] A pull shows three items a group, and a count\./);
  const after = await memory(env.repo, env.fake, ['pull', String(next.id)]);
  assert.match(after.stdout, /## Replaced\n- \[project\] A pull shows three items a group\. /);
});

test('a word that is no node exits 1 with the nearest topics and no facts', async t => {
  const env = await seeded(t);
  const result = await memory(env.repo, env.fake, ['pull', 'memry']);
  assert.equal(result.code, 1);
  assert.match(result.stdout, /^No memory node named memry\. Nearest topics: memory/);
  assert.doesNotMatch(result.stdout, /- \[/);
});

test('a topic with 141 facts stays inside the caps; --more shows one group whole', async t => {
  const env = await setup(t);
  files(env.repo.root, PAGES);
  const types = ['project', 'thread', 'feedback', 'reference'];
  const facts = Array.from({ length: 141 }, (_, n) => ({ action: 'add', type: types[n % 4], body: `Rule ${n}: ${'a long reason that fills the line '.repeat(8)}`, tags: ['memory'] }));
  for (const slug of ['big-a', 'big-b', 'big-c', 'big-d', 'big-e']) {
    const stored = await put(env, { source: 'save', slug, facts: facts.splice(0, slug === 'big-e' ? facts.length : 30) });
    assert.equal(stored.code, 0, stored.stderr);
  }
  const result = await memory(env.repo, env.fake, ['pull', 'memory']);
  assert.equal(result.code, 0, result.stderr);
  const lines = result.stdout.trimEnd().split('\n');
  assert.ok(lines.length <= MAX_LINES, `${lines.length} lines`);
  assert.ok(Buffer.byteLength(result.stdout) <= MAX_BYTES, `${Buffer.byteLength(result.stdout)} bytes`);
  assert.match(result.stdout, /## Decided\n(- \[project\] .+\n){3}· 33 more\n/);
  assert.match(result.stdout, /^Changes: (big-\w \(conversation, \d+ facts\)( · )?){3} · 2 more$/m);
  assert.match(lines.at(-1), /^141 live facts\./);
  const more = await memory(env.repo, env.fake, ['pull', 'memory', '--more', 'decided']);
  assert.equal(more.code, 0, more.stderr);
  const moreLines = more.stdout.trim().split('\n');
  assert.equal(moreLines[0], '## Decided (memory)');
  assert.equal(moreLines.filter(line => line.startsWith('- [project]')).length, MORE_ITEMS);
  assert.equal(moreLines.at(-1), '· 6 more');
  const none = await memory(env.repo, env.fake, ['pull', 'memory', '--more', 'nothing']);
  assert.equal(none.code, 1);
});

test('with the store not answering, a topic prints its local parts and one line that facts are missing', async t => {
  const env = await seeded(t);
  env.fake.setOffline(true);
  const result = await memory(env.repo, env.fake, ['pull', 'memory']);
  assert.equal(result.code, 0, result.stderr);
  const lines = result.stdout.trim().split('\n');
  assert.deepEqual(lines.slice(0, 2), ['# memory (topic)', 'Session memory: facts, capture, digest, write gate, and verified wiki/OpenSpec retrieval.']);
  assert.ok(lines.includes('Parts: Capture · Digest'));
  assert.equal(lines.at(-1), 'Memory was not loaded (memory store unreachable (network)); go on without it.');
  assert.doesNotMatch(result.stdout, /- \[/);
});

test('the memory helper page sets its limits and four answer parts, and names no chat app as a requirement', () => {
  const page = readFileSync(new URL('../../.agents/plugins/memory/references/recall-helper.md', import.meta.url), 'utf8');
  for (const limit of [/12 pulls/, /3 page parts/, /2 `M source <id>` reads/, /at most 300 words/]) assert.match(page, limit);
  for (const part of ['Applies', 'Open', 'The person', 'Not followed']) assert.match(page, new RegExp(`\\*\\*${part}\\*\\*`));
  assert.doesNotMatch(page, /Claude|Codex|Cursor|Paseo/);
});

test('the removed extraction commands exit 1 and name the memory helper page', async t => {
  const env = await setup(t);
  for (const command of ['extract', 'extract-task']) {
    const result = await memory(env.repo, env.fake, [command, 'how does the chat start work']);
    assert.equal(result.code, 1, command);
    assert.match(result.stderr, new RegExp(`${command} was removed: .*references/recall-helper\\.md.*pull <name>`));
  }
});
