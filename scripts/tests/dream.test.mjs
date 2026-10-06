// /dream's script: when the last dream ran, and which wiki pages are the install's own.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { dreamChecks, isDreamFact, isShipped, lastDream, pageList, pagesNamed, shippedPaths } from '../../.agents/skills/dream/scripts/dream.mjs';
import { memory, node, setup, writeJsonFile } from './fixtures/memory/harness.mjs';

const DREAM = '../../dream/scripts/dream.mjs';
const PAYLOAD = {
  core: { skillDirs: ['dream'], files: ['wiki/wiki-style.md', 'wiki/development/memory.md'] },
  pack: { files: ['scripts/cf-build.sh'], dirs: ['wiki/stack'] },
  seededBySetup: { files: ['wiki/README.md'] },
};
const SHIPPED = shippedPaths(PAYLOAD);
const today = new Date().toISOString().slice(0, 10);

const dream = (env, ...args) => node(env.repo, env.fake, DREAM, args);
const put = (env, body) => memory(env.repo, env.fake, ['put-facts', '--file', writeJsonFile(env.repo.home, `in-${Math.random()}.json`, {
  source: 'save', slug: 'wiki-dream',   facts: [{ action: 'add', type: 'project', body, tags: ['dream'] }],
})]);

function write(root, path, text) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}

// Commit `path` with the given commit date.
function commit(root, path, date) {
  const env = { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date };
  execFileSync('git', ['-C', root, 'add', '--', path], { env });
  execFileSync('git', ['-C', root, 'commit', '-q', '-m', path], { env });
}

test('with no earlier dream, the first one reads 30 days back', () => {
  assert.deepEqual(lastDream([], new Date('2026-10-06T12:00:00Z')), { since: '2026-09-06', afterFact: 0, pages: [], dream: null });
});

test('an earlier dream fact gives its date, the highest fact id it read, and the pages it checked', () => {
  const facts = [
    { id: 40, created_at: '2026-09-20T08:00:00Z', body: 'Dream 2026-09-20: read facts up to #900. Checked: wiki/people/README.md.' },
    { id: 55, created_at: '2026-10-01T08:00:00Z', body: 'Dream 2026-10-01: read facts up to #1234. Checked: wiki/people/README.md, wiki/people/a-b.md.' },
    // Upkeep tags `dream` any fact naming the skill's folder; only a dream's own fact counts.
    { id: 60, created_at: '2026-10-03T08:00:00Z', body: 'Session 2026-10-03: edited .agents/skills/dream/SKILL.md and wiki/people/c.md, PR #9.' },
  ];
  assert.deepEqual(lastDream(facts), { since: '2026-10-01', afterFact: 1234, pages: ['wiki/people/README.md', 'wiki/people/a-b.md'], dream: 55 });
  assert.deepEqual(lastDream([{ id: 7, created_at: '2026-10-02T00:00:00Z', body: 'Dream 2026-10-02: nothing to add.' }]),
    { since: '2026-10-02', afterFact: 0, pages: [], dream: 7 });
});

test('only a fact worded as a dream is one', () => {
  assert.equal(isDreamFact({ body: 'Dream 2026-10-06: read facts up to #9. Checked: none.' }), true);
  assert.equal(isDreamFact({ body: 'The dream skill shipped on 2026-10-06.' }), false);
});

test('a dream fact names its pages once each, without the sentence’s full stop', () => {
  assert.deepEqual(pagesNamed('Checked: wiki/a.md, wiki/people/b.md, wiki/a.md.'), ['wiki/a.md', 'wiki/people/b.md']);
  assert.deepEqual(pagesNamed('Nothing checked; see scripts/x.mjs.'), []);
});

test('a page is shipped when the payload lists its file', () => {
  assert.equal(isShipped('wiki/wiki-style.md', SHIPPED), true);
  assert.equal(isShipped('wiki/development/memory.md', SHIPPED), true);
});

test('a page is shipped when the payload lists its folder', () => {
  assert.equal(isShipped('wiki/stack/mini-apps.md', SHIPPED), true);
  assert.equal(isShipped('wiki/stack/deep/page.md', SHIPPED), true);
  assert.equal(isShipped('wiki/stack-notes.md', SHIPPED), false, 'a folder name is not a prefix of a sibling file');
});

test('every other page is the install’s own, the pages setup seeded included', () => {
  assert.equal(isShipped('wiki/people/matthew-wong.md', SHIPPED), false);
  assert.equal(isShipped('wiki/development/our-process.md', SHIPPED), false);
  assert.equal(isShipped('wiki/README.md', SHIPPED), false);
  assert.equal(isShipped('wiki/anything.md', shippedPaths({})), false, 'no payload list: every page is own');
});

test('one dream recorded across two facts counts the pages of both', () => {
  // A fact holds 400 characters, so a dream that checked many pages records them in several facts.
  const checks = dreamChecks([
    { id: 11, body: 'Dream 2026-10-06: read facts up to #90. Checked: wiki/people/a.md, wiki/people/b.md.', created_at: '2026-10-06T10:00:00Z' },
    { id: 12, body: 'Dream 2026-10-06: read facts up to #90. Checked: wiki/company/c.md.', created_at: '2026-10-06T10:00:01Z' },
  ]);
  assert.deepEqual([...checks.keys()].sort(), ['wiki/company/c.md', 'wiki/people/a.md', 'wiki/people/b.md']);
  assert.equal(checks.get('wiki/people/a.md'), '2026-10-06');
});

test('pages sort longest unchecked first: never, then oldest, the newer of commit and dream', () => {
  const checks = dreamChecks([
    { created_at: '2026-09-01T00:00:00Z', body: 'Dream 2026-09-01: read facts up to #1. Checked: wiki/people/a.md, wiki/people/b.md.' },
    { created_at: '2026-10-01T00:00:00Z', body: 'Dream 2026-10-01: read facts up to #2. Checked: wiki/people/a.md.' },
    { created_at: '2026-10-05T00:00:00Z', body: 'Session 2026-10-05: rewrote wiki/people/b.md by hand.' },
  ]);
  assert.equal(checks.get('wiki/people/a.md'), '2026-10-01');
  assert.equal(checks.get('wiki/people/b.md'), '2026-09-01');
  const list = pageList([
    { path: 'wiki/people/a.md', text: 'one two three', committed: '2026-01-01T00:00:00+00:00' },
    { path: 'wiki/people/b.md', text: 'one\n\ntwo', committed: '2026-09-15T00:00:00+00:00' },
    { path: 'wiki/people/c.md', text: '', committed: null },
    { path: 'wiki/stack/d.md', text: 'word', committed: '2026-03-01T00:00:00+00:00' },
    { path: 'wiki/people/e.md', text: 'word', committed: '2026-03-01T00:00:00+00:00' },
  ], SHIPPED, checks);
  assert.deepEqual(list, [
    { path: 'wiki/people/c.md', kind: 'own', words: 0, lastChecked: null },
    { path: 'wiki/people/e.md', kind: 'own', words: 1, lastChecked: '2026-03-01' },
    { path: 'wiki/stack/d.md', kind: 'shipped', words: 1, lastChecked: '2026-03-01' },
    { path: 'wiki/people/b.md', kind: 'own', words: 2, lastChecked: '2026-09-15' },
    { path: 'wiki/people/a.md', kind: 'own', words: 3, lastChecked: '2026-10-01' },
  ]);
});

test('since and pages read the store and the checkout, and write neither', async t => {
  const env = await setup(t);
  const { root } = env.repo;
  write(root, '.claude/skills/wong-sync/references/payload-files.json', JSON.stringify(PAYLOAD));
  write(root, 'wiki/README.md', '# Wiki\n\nThe hub.\n');
  write(root, 'wiki/wiki-style.md', '# Style\n\nThe rules of the wiki.\n');
  write(root, 'wiki/stack/core.md', '# Core\n\nThe stack.\n');
  write(root, 'wiki/people/a.md', '# A\n\nA person.\n');
  write(root, 'wiki/people/b.md', '# B\n\nAnother person here.\n');
  commit(root, 'wiki/README.md', '2026-02-01T00:00:00Z');
  commit(root, 'wiki/wiki-style.md', '2026-02-02T00:00:00Z');
  commit(root, 'wiki/stack/core.md', '2026-02-03T00:00:00Z');
  commit(root, 'wiki/people/a.md', '2026-01-01T00:00:00Z');

  const first = await dream(env, 'since', '--json');
  assert.equal(first.code, 0, first.stderr);
  const start = JSON.parse(first.stdout);
  assert.equal(start.dream, null);
  assert.equal(start.afterFact, 0);
  assert.ok(start.since < today, 'a first dream starts in the past');

  const before = (await dream(env, 'pages')).stdout.trim().split('\n').map(line => line.split('\t'));
  assert.deepEqual(before, [
    ['own', '5', 'never', 'wiki/people/b.md'],
    ['own', '4', '2026-01-01', 'wiki/people/a.md'],
    ['own', '4', '2026-02-01', 'wiki/README.md'],
    ['shipped', '7', '2026-02-02', 'wiki/wiki-style.md'],
    ['shipped', '4', '2026-02-03', 'wiki/stack/core.md'],
  ]);

  const wrote = await put(env, `Dream ${today}: read facts up to #321. Checked: wiki/people/a.md, wiki/people/b.md.`);
  assert.equal(wrote.code, 0, wrote.stderr);
  const second = await dream(env, 'since');
  assert.equal(second.code, 0, second.stderr);
  assert.match(second.stdout, new RegExp(`^last dream: ${today} \\(fact #\\d+\\)\\nsince: ${today}\\nafter fact: #321\\npages checked: wiki/people/a\\.md, wiki/people/b\\.md$`, 'm'));

  const after = JSON.parse((await dream(env, 'pages', '--json')).stdout).pages;
  assert.deepEqual(after.map(page => [page.path, page.lastChecked]), [
    ['wiki/README.md', '2026-02-01'],
    ['wiki/wiki-style.md', '2026-02-02'],
    ['wiki/stack/core.md', '2026-02-03'],
    ['wiki/people/a.md', today],
    ['wiki/people/b.md', today],
  ]);
  assert.equal(execFileSync('git', ['-C', root, 'status', '--porcelain', '--', 'wiki'], { encoding: 'utf8' }).trim(), '?? wiki/people/b.md', 'the script edits no page');
});

test('a store that can not be read stops since, and leaves pages on commit dates', async t => {
  const env = await setup(t);
  write(env.repo.root, 'wiki/README.md', '# Wiki\n\nThe hub.\n');
  commit(env.repo.root, 'wiki/README.md', '2026-02-01T00:00:00Z');
  env.fake.setOffline(true);
  const since = await dream(env, 'since');
  assert.equal(since.code, 1);
  assert.match(since.stderr, /memory store could not be read/);
  const pages = await dream(env, 'pages');
  assert.equal(pages.code, 0, pages.stderr);
  assert.equal(pages.stdout.trim(), ['own', '4', '2026-02-01', 'wiki/README.md'].join('\t'));
  assert.match(pages.stderr, /commit dates alone/);
});

test('a missing or unknown command is a usage error', async t => {
  const env = await setup(t);
  for (const args of [[], ['dreams'], ['since', 'extra']]) {
    const result = await dream(env, ...args);
    assert.equal(result.code, 2, args.join(' '));
    assert.match(result.stderr, /usage: dream\.mjs/);
  }
});
