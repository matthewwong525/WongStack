// Topics: page summaries, the digest's topic lines, the topics a message names, and the prompt hook.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { topics } from '../../.agents/memory/topics.mjs';
import { matchTopics, pageLinks, summaryOf, topicLines } from '../../.agents/plugins/memory/scripts/lib/topics.mjs';

const REPO = fileURLToPath(new URL('../..', import.meta.url));
const HOOK = join(REPO, '.agents/plugins/memory/scripts/topic-match.mjs');
const PROFILE = join(REPO, '.agents/memory/profile.mjs');

const company = (tag, hub = null, summary = `All about ${tag}.`) => ({ tag, kind: 'company', page: `knowledge/${tag}.md`, summary, aliases: [], paths: [], docs: [], hub });
const code = (tag, aliases = []) => ({ tag, kind: 'code', page: null, summary: `The ${tag} code.`, aliases, paths: [], docs: [], hub: null });

function tempRepo(t, files) {
  const root = mkdtempSync(join(tmpdir(), 'topics-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  execFileSync('git', ['init', '-q', root]);
  return root;
}

function hook(root, prompt, session = 'chat-1') {
  const env = { ...process.env, WONG_MEMORY_PROFILE: PROFILE, WONG_MEMORY_STATE_DIR: join(root, '.state') };
  const result = spawnSync(process.execPath, [HOOK], { cwd: root, env, encoding: 'utf8', input: JSON.stringify({ prompt, session_id: session, cwd: root }) });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout ? JSON.parse(result.stdout).hookSpecificOutput.additionalContext : '';
}

test('a summary is the first sentence after the frontmatter and title, links read as words, cut on a word', () => {
  assert.equal(summaryOf('---\npublic: true\n---\n# Ada\n\nAda runs [the ads](ads.md) for **us**. She likes short notes.\n'), 'Ada runs the ads for us.');
  assert.equal(summaryOf('# Empty\n'), '');
  const long = summaryOf(`# Long\n\n${'word '.repeat(40)}end.`);
  assert.ok(long.length <= 120 && long.endsWith('word…'), long);
});

test('topic lines: hub order, eight company lines at most, the code names, the pull, within 1 KB', () => {
  assert.deepEqual(topicLines([], 'memory.mjs'), []);
  const lines = topicLines([company('people/bo', 1), company('loose'), company('people/ada', 0), code('worker'), code('memory')], 'memory.mjs');
  assert.deepEqual(lines, ['## Topics', 'people/ada  All about people/ada.', 'people/bo  All about people/bo.', 'Code: worker, memory', 'Pull a topic: `memory.mjs areas <topic>`']);
  const many = [...Array.from({ length: 12 }, (_, i) => company(`page-${i}`, i, `${'x'.repeat(100)}.`)), ...Array.from({ length: 80 }, (_, i) => code(`area-${i}`))];
  const capped = topicLines(many, 'memory.mjs');
  assert.ok(Buffer.byteLength(capped.join('\n')) <= 1024);
  assert.ok(capped.filter(line => line.startsWith('page-')).length <= 8);
  assert.match(capped.at(-2), /^Code: area-0, .*, …$/);
});

test('a message names a topic: the whole tag, an alias, or the last part are clear; a word that starts a tag is near', () => {
  const list = [company('people/ada'), company('refunds'), code('service-definitions', ['openapi']), code('worker'), code('plan')];
  const tags = hits => hits.map(({ topic, clear }) => [topic.tag, clear]);
  assert.deepEqual(tags(matchTopics('What did Ada say about the ads?', list)), [['people/ada', true]]);
  assert.deepEqual(tags(matchTopics('Fix the OpenAPI view', list)), [['service-definitions', true]]);
  assert.deepEqual(tags(matchTopics('the service definitions page', list)), [['service-definitions', true]]);
  assert.deepEqual(tags(matchTopics('a ref and a wor item', list)), [], 'a near word needs four letters');
  assert.deepEqual(tags(matchTopics('servi and refu', list)), [['refunds', false], ['service-definitions', false]]);
  assert.deepEqual(tags(matchTopics('the refunds work for Ada, services, and the worker', list)), [['people/ada', true], ['refunds', true], ['worker', true]], 'clear first, three at most');
  assert.deepEqual(tags(matchTopics('make a plan', list, { skills: ['plan'] })), [], 'a skill-named topic is left out');
  assert.deepEqual(tags(matchTopics('ask Ada', list, { skip: ['people/ada'] })), [], 'a topic shown before is left out');
});

test('the pages one step from a page: those it links to and those that link to it', t => {
  const root = tempRepo(t, {
    'knowledge/people/README.md': '# People\n\n- [Ada](ada.md)\n',
    'knowledge/people/ada.md': '# Ada\n\nAda runs [refunds](../refunds.md#who) and [people](./).\n',
    'knowledge/refunds.md': '# Refunds\n\nNo links.\n',
  });
  const pages = ['knowledge/people/README.md', 'knowledge/people/ada.md', 'knowledge/refunds.md'];
  assert.deepEqual(pageLinks(root, 'knowledge/people/ada.md', pages), { out: ['knowledge/refunds.md', 'knowledge/people/README.md'], in: ['knowledge/people/README.md'] });
});

test("WongStack's topics: every area, then each company page by its path; an area wins a clash", t => {
  const root = tempRepo(t, {
    'knowledge/README.md': '# Company\n\n- [People](people/README.md)\n- [Refunds](refunds.md)\n',
    'knowledge/people/README.md': '# People\n\nWho is who.\n',
    'knowledge/people/ada.md': '# Ada\n\nAda runs the ads.\n',
    'knowledge/refunds.md': '# Refunds\n\nHow a refund is approved.\n',
    'knowledge/refunds.mine.md': '# Refunds\n\nThe other side.\n',
    'knowledge/memory.md': '# Memory\n\nA company page named like an area.\n',
  });
  const list = topics({ root });
  const companyTopics = list.filter(topic => topic.kind === 'company').map(({ tag, page, summary, hub }) => [tag, page, summary, hub]);
  assert.deepEqual(companyTopics, [
    ['people', 'knowledge/people/README.md', 'Who is who.', 0],
    ['people/ada', 'knowledge/people/ada.md', 'Ada runs the ads.', null],
    ['refunds', 'knowledge/refunds.md', 'How a refund is approved.', 1],
  ]);
  const memory = list.find(topic => topic.tag === 'memory');
  assert.equal(memory.kind, 'code');
  assert.equal(memory.page, null, 'no doc of the area exists in this repo');
});

test('the prompt hook adds a topic once per chat, and nothing for a skill name or no topic', t => {
  const root = tempRepo(t, {
    'knowledge/README.md': '# Company\n\n- [People](people/README.md)\n',
    'knowledge/people/README.md': '# People\n\nWho is who.\n',
    'knowledge/people/ada.md': '# Ada\n\nAda runs the ads.\n',
    '.claude/skills/refunds/SKILL.md': '---\nname: refunds\n---\n',
    'knowledge/refunds.md': '# Refunds\n\nHow a refund is approved.\n',
  });
  const first = hook(root, 'What did Ada say about the ads?');
  assert.match(first, /^Topic people\/ada: Ada runs the ads\.$/m);
  assert.match(first, /areas <topic>/);
  assert.equal(hook(root, 'And Ada again?'), '', 'once per chat');
  assert.match(hook(root, 'Ada?', 'chat-2'), /Topic people\/ada/, 'a new chat shows it again');
  assert.equal(hook(root, 'run refunds now'), '', 'a topic named for a skill is left out');
  assert.equal(hook(root, 'nothing named here'), '');
  assert.equal(hook(root, '/plan'), '', 'a step name is left out');
});

test('the prompt hook reads 500 company pages within three seconds', t => {
  const files = { 'knowledge/README.md': '# Company\n\nThe hub.\n' };
  for (let i = 0; i < 500; i++) files[`knowledge/team-${i % 10}/page-${i}.md`] = `# Page ${i}\n\nPage ${i} holds what [the hub](../README.md) says.\n`;
  const root = tempRepo(t, files);
  const start = Date.now();
  assert.match(hook(root, 'look at page-417'), /Topic team-7\/page-417: Page 417 holds what the hub says\./);
  assert.ok(Date.now() - start < 3000, `${Date.now() - start} ms`);
});
