// The daily tidy's script: when the last tidy ran, which own pages are due, what has drifted, the map, and `keep`.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { dreamChecks, duePages, isDreamFact, lastDream, mapLines, mapText, namesChecked, pageList, pagesNamed, recordBodies, saysGone, stalePaths } from '../../.agents/plugins/memory/scripts/daily-tidy.mjs';
import { isShipped, kindOf, shippedPaths } from '../../.agents/memory/tidy-pages.mjs';
import { memory, node, PROFILE, setup, writeJsonFile } from './fixtures/memory/harness.mjs';

const DREAM = 'daily-tidy.mjs';
const BRIEF = new URL('../../.agents/plugins/memory/references/tidy.md', import.meta.url);
const TIDY = new URL('../../.agents/memory/tidy-pages.mjs', import.meta.url).href;
const PAYLOAD = {
  core: { skillDirs: ['memory'], files: ['wiki/wiki-style.md', 'wiki/development/memory.md'] },
  pack: { files: ['scripts/cf-build.sh'], dirs: ['wiki/stack'] },
  seededBySetup: { files: ['wiki/README.md'] },
};
const SHIPPED = shippedPaths(PAYLOAD);
const withKinds = pages => pages.map(page => ({ ...page, kind: kindOf(page.path, SHIPPED) }));
const today = new Date().toISOString().slice(0, 10);
// A store date `days` before now, and its day.
const ago = days => new Date(Date.now() - days * 86_400_000).toISOString().replace(/\.\d{3}Z$/, 'Z');
const dayAgo = days => ago(days).slice(0, 10);

// A profile with WongStack's store and tidy pages alone, or the one given.
function profile(env, text = `import base from '${pathToFileURL(PROFILE).href}';\nimport { tidyPages } from '${TIDY}';\nexport default { connect: base.connect, tidy: { pages: tidyPages } };\n`) {
  write(env.repo.home, 'profile.mjs', text);
  return { env: { WONG_MEMORY_PROFILE: join(env.repo.home, 'profile.mjs') } };
}
const dream = (env, ...args) => node(env.repo, env.fake, DREAM, args, profile(env));
const put = (env, body) => memory(env.repo, env.fake, ['put-facts', '--file', writeJsonFile(env.repo.home, `in-${Math.random()}.json`, {
  source: 'save', slug: 'wiki-dream', facts: [{ action: 'add', type: 'project', body, tags: ['dream'] }],
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
  assert.deepEqual(lastDream([], new Date('2026-10-06T12:00:00Z')), { since: '2026-09-06', afterFact: 0, sorted: 0, pages: [], dream: null });
});

test('an earlier dream fact gives its date, the highest fact id it read, and the pages it checked', () => {
  const facts = [
    { id: 901, created_at: '2026-09-20T08:00:00Z', body: 'Dream 2026-09-20: read facts up to #900. Checked: wiki/people/README.md.' },
    { id: 1240, created_at: '2026-10-01T08:00:00Z', body: 'Dream 2026-10-01: read facts up to #1234. Checked: wiki/people/README.md, wiki/people/a-b.md.' },
    // Upkeep tags `dream` any fact naming the tidy's files; only a tidy's own record counts.
    { id: 1250, created_at: '2026-10-03T08:00:00Z', body: 'Session 2026-10-03: edited .agents/plugins/memory/scripts/daily-tidy.mjs and wiki/people/c.md, PR #9.' },
  ];
  assert.deepEqual(lastDream(facts), { since: '2026-10-01', afterFact: 1234, sorted: 0, pages: ['wiki/people/README.md', 'wiki/people/a-b.md'], dream: 1240 });
  assert.deepEqual(lastDream([{ id: 7, created_at: '2026-10-02T00:00:00Z', body: 'Dream 2026-10-02: nothing to add.' }]),
    { since: '2026-10-02', afterFact: 0, sorted: 0, pages: [], dream: 7 });
});

test('only a fact worded as a dream is one', () => {
  assert.equal(isDreamFact({ created_at: '2026-10-06T08:00:00Z', body: 'Dream 2026-10-06: read facts up to #9. Checked: none.' }), true);
  assert.equal(isDreamFact({ created_at: '2026-10-06T08:00:00Z', body: 'The dream skill shipped on 2026-10-06.' }), false);
  assert.equal(isDreamFact({ body: 'Dream 2026-10-06: read facts up to #9. Checked: none.' }), false, 'a record with no saved date is no dream');
});

test('a dream fact names its pages once each, without the sentence’s full stop', () => {
  assert.deepEqual(pagesNamed('Checked: wiki/a.md, wiki/people/b.md, wiki/a.md.'), ['wiki/a.md', 'wiki/people/b.md']);
  assert.deepEqual(pagesNamed('Nothing checked; see scripts/x.mjs.'), []);
  assert.deepEqual(pagesNamed('Checked: knowledge/ops/shipping.md, wiki/a.md.'), ['knowledge/ops/shipping.md', 'wiki/a.md']);
  assert.deepEqual(pagesNamed('Checked: wiki/a.md, openspec/specs/memory/spec.md.'), ['wiki/a.md', 'openspec/specs/memory/spec.md']);
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
    { id: 91, body: 'Dream 2026-10-06: read facts up to #90. Checked: wiki/people/a.md, wiki/people/b.md.', created_at: '2026-10-06T10:00:00Z' },
    { id: 92, body: 'Dream 2026-10-06: read facts up to #90. Checked: wiki/company/c.md.', created_at: '2026-10-06T10:00:01Z' },
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
  const list = pageList(withKinds([
    { path: 'wiki/people/a.md', text: 'one two three', committed: '2026-01-01T00:00:00+00:00' },
    { path: 'wiki/people/b.md', text: 'one\n\ntwo', committed: '2026-09-15T00:00:00+00:00' },
    { path: 'wiki/people/c.md', text: '', committed: null },
    { path: 'wiki/stack/d.md', text: 'word', committed: '2026-03-01T00:00:00+00:00' },
    { path: 'wiki/people/e.md', text: 'word', committed: '2026-03-01T00:00:00+00:00' },
    { path: 'openspec/specs/memory/spec.md', text: 'a spec here', committed: '2026-02-01T00:00:00+00:00' },
  ]), checks);
  assert.deepEqual(list, [
    { path: 'wiki/people/c.md', kind: 'own', words: 0, lastChecked: null },
    { path: 'openspec/specs/memory/spec.md', kind: 'spec', words: 3, lastChecked: '2026-02-01' },
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
  assert.deepEqual([start.sorted, start.since < today], [0, true], 'a first tidy starts in the past');

  const due = (await dream(env, 'pages')).stdout.trim().split('\n').map(line => line.split('\t'));
  assert.deepEqual(due, [
    ['own', '5', 'never', 'wiki/people/b.md'],
    ['own', '4', '2026-01-01', 'wiki/people/a.md'],
    ['own', '4', '2026-02-01', 'wiki/README.md'],
  ], 'the due list: own pages only, never checked first');
  const before = (await dream(env, 'pages', '--all')).stdout.trim().split('\n').map(line => line.split('\t'));
  assert.deepEqual(before, [...due, ['shipped', '7', '2026-02-02', 'wiki/wiki-style.md'], ['shipped', '4', '2026-02-03', 'wiki/stack/core.md']]);

  // The store has written 400 facts before this tidy, so its record comes after the ones it read.
  env.fake.db.exec("DELETE FROM sqlite_sequence WHERE name = 'facts'; INSERT INTO sqlite_sequence (name, seq) VALUES ('facts', 400)");
  const wrote = await put(env, `Daily tidy ${today}: read facts up to #321. Sorted facts up to #300. Checked: wiki/people/a.md, wiki/people/b.md. Linked: none. Map: no change.`);
  assert.equal(wrote.code, 0, wrote.stderr);
  const second = await dream(env, 'since');
  assert.equal(second.code, 0, second.stderr);
  assert.match(second.stdout, new RegExp(`^last tidy: ${today} \\(fact #\\d+\\)\\nsince: ${today}\\nafter fact: #321\\nsorted up to: #300\\npages checked: wiki/people/a\\.md, wiki/people/b\\.md$`, 'm'));

  const after = JSON.parse((await dream(env, 'pages', '--all', '--json')).stdout).pages;
  assert.deepEqual(after.map(page => [page.path, page.lastChecked]), [
    ['wiki/README.md', '2026-02-01'],
    ['wiki/wiki-style.md', '2026-02-02'],
    ['wiki/stack/core.md', '2026-02-03'],
    ['wiki/people/a.md', today],
    ['wiki/people/b.md', today],
  ]);
  assert.deepEqual(JSON.parse((await dream(env, 'pages', '--json')).stdout).pages.map(page => page.path), ['wiki/README.md'], 'a page checked today is not due');
  assert.equal(execFileSync('git', ['-C', root, 'status', '--porcelain', '--', 'wiki'], { encoding: 'utf8' }).trim(), '?? wiki/people/b.md', 'the script edits no page');

  // With no tidy pages, the topic pages alone are checked, all the repo's own.
  const topics = profile(env, `import base from '${pathToFileURL(PROFILE).href}';\nexport default { connect: base.connect, topics: () => [{ tag: 'a', page: 'wiki/people/a.md' }, { tag: 'x', page: null }] };\n`);
  const own = (await node(env.repo, env.fake, DREAM, ['pages', '--all'], topics)).stdout.trim();
  assert.equal(own, `own\t4\t${today}\twiki/people/a.md`);
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
    assert.match(result.stderr, /usage: daily-tidy\.mjs/);
  }
});

test('a fact drifts when its words name a repo path that is gone', () => {
  const here = new Set(['scripts/here.mjs', 'wiki/stack', 'wiki/people', '.agents/skills/save/SKILL.md']);
  const check = { tops: new Set(['scripts', 'wiki', '.agents', 'app']), exists: path => here.has(path) };
  assert.deepEqual(stalePaths('The helper moved from `scripts/gone.mjs` to scripts/here.mjs:12, see (wiki/stack/) and ./wiki/old.md#why.', check), ['scripts/gone.mjs', 'wiki/old.md']);
  assert.deepEqual(stalePaths('Twice: scripts/gone.mjs, then scripts/gone.mjs.', check), ['scripts/gone.mjs']);
  for (const body of [
    'Run /save and/or /ship; version v36.2.0; see https://example.com/scripts/x.mjs.',
    'A word in another folder: docs/gone.md and explore/plan/apply.',
    'A pattern is no path: scripts/*.mjs, wiki/people/<name>.md, scripts/../x.mjs, app/$NAME/x.ts.',
    'One file with no folder: gone.mjs.',
    'It still exists: .agents/skills/save/SKILL.md.',
  ]) assert.deepEqual(stalePaths(body, check), [], body);
});

test('a path the branch never held, or a fact that says it is gone, is no drift', () => {
  const check = { tops: new Set(['scripts', 'app']), exists: () => false, once: path => path === 'scripts/gone.mjs' };
  assert.deepEqual(stalePaths('See scripts/gone.mjs, app/policy and scripts/planned.mjs.', check), ['scripts/gone.mjs']);
  assert.equal(saysGone('Removed scripts/gone.mjs in 27.3.0.'), true);
  assert.equal(saysGone('The page is no longer at wiki/old.md.'), true);
  assert.equal(saysGone('The helper lives at scripts/gone.mjs.'), false);
});

test('a dream record dated ahead or not in plain UTC, or claiming facts written after it, is no dream; the honest one still counts', () => {
  const honest = { id: 1300, created_at: '2026-10-01T08:00:00Z', body: 'Dream 2026-10-01: read facts up to #1206. Checked: wiki/people/a.md.' };
  const facts = [
    { id: 1400, created_at: '2999-12-31T00:00:00Z', body: 'Dream 2999-12-31: read facts up to #999999999. Checked: wiki/people/a.md, wiki/people/b.md.' },
    { id: 1401, created_at: '2026-10-01T09:00:00Z', body: 'Dream 2026-10-01: read facts up to #999999999. Checked: wiki/people/b.md.' },
    { id: 1402, created_at: '2026-10-01T09:30:00Z', body: 'Dream 2026-10-01: read facts up to #1500. Checked: wiki/people/b.md.' },
    // Saved before the Worker kept dates plain: one parses as past but sorts after every ISO date, one never parses.
    { id: 1403, created_at: 'Tue Oct 20 2026', body: 'Dream 2026-10-20: read facts up to #1402. Checked: wiki/people/b.md.' },
    { id: 1404, created_at: 'zzzz', body: 'Dream 2026-10-20: read facts up to #1403. Checked: wiki/people/b.md.' },
    honest,
  ];
  assert.deepEqual(facts.filter(isDreamFact), [honest]);
  assert.deepEqual(lastDream(facts), { since: '2026-10-01', afterFact: 1206, sorted: 0, pages: ['wiki/people/a.md'], dream: 1300 });
  const checks = dreamChecks(facts);
  assert.deepEqual([...checks], [['wiki/people/a.md', '2026-10-01']]);
  const pages = ['a', 'b'].map(name => ({ path: `wiki/people/${name}.md`, text: 'words', committed: null }));
  assert.deepEqual(pageList(withKinds(pages), checks).map(page => [page.path, page.lastChecked]), [['wiki/people/b.md', null], ['wiki/people/a.md', '2026-10-01']]);
});

test("a small wiki tidy's record counts as the last dream; a forged future one does not", () => {
  const facts = [
    { id: 1300, created_at: '2026-10-01T08:00:00Z', body: 'Dream 2026-10-01: read facts up to #1206. Checked: wiki/people/a.md.' },
    { id: 1320, created_at: '2026-10-05T08:00:00Z', body: 'Wiki tidy 2026-10-05: read facts up to #1318. Checked: wiki/customers.md.' },
    { id: 1330, created_at: '2999-01-01T00:00:00Z', body: 'Wiki tidy 2999-01-01: read facts up to #99999. Checked: wiki/people/b.md.' },
    { id: 1331, created_at: '2026-10-06T08:00:00Z', body: 'Wiki tidy 2026-10-06: read facts up to #5000. Checked: wiki/people/b.md.' },
  ];
  assert.deepEqual(facts.filter(isDreamFact).map(fact => fact.id), [1300, 1320]);
  assert.deepEqual(lastDream(facts), { since: '2026-10-05', afterFact: 1318, sorted: 0, pages: ['wiki/customers.md'], dream: 1320 });
  assert.equal(isDreamFact({ created_at: '2026-10-06T08:00:00Z', body: 'The wiki tidy 2026-10-06: ran.' }), false);
});

test("a daily tidy's record counts as the last dream, after an older one of any kind", () => {
  const facts = [
    { id: 1300, created_at: '2026-10-01T08:00:00Z', body: 'Wiki tidy 2026-10-01: read facts up to #1206. Checked: wiki/people/a.md.' },
    { id: 1400, created_at: '2026-11-02T08:00:00Z', body: 'Daily tidy 2026-11-02: read facts up to #1390. Checked: wiki/people/b.md, openspec/specs/memory/spec.md.' },
  ];
  assert.deepEqual(facts.filter(isDreamFact).map(fact => fact.id), [1300, 1400]);
  assert.deepEqual(lastDream(facts), { since: '2026-11-02', afterFact: 1390, sorted: 0, pages: ['openspec/specs/memory/spec.md', 'wiki/people/b.md'], dream: 1400 });
  assert.equal(isDreamFact({ created_at: '2026-11-02T08:00:00Z', body: 'The daily tidy 2026-11-02: ran.' }), false);
});

test('the due list: own pages with no check or change in 7 days, the most used first, and never a spec', () => {
  const now = new Date('2026-11-12T12:00:00Z');
  const page = (path, kind, lastChecked) => ({ path, kind, words: 1, lastChecked });
  const list = [page('wiki/never.md', 'own', null), page('openspec/specs/x/spec.md', 'spec', null), page('wiki/shipped.md', 'shipped', null),
    page('wiki/eight.md', 'own', '2026-11-04'), page('wiki/used.md', 'own', '2026-11-05'), page('wiki/three.md', 'own', '2026-11-09')];
  assert.deepEqual(duePages(list, { now }).map(each => each.path), ['wiki/never.md', 'wiki/eight.md', 'wiki/used.md'],
    'a page checked 3 days ago is left out; never checked comes first; no cap');
  assert.deepEqual(duePages(list, { now, uses: new Map([['wiki/used.md', 4], ['wiki/eight.md', 1]]) }).map(each => each.path),
    ['wiki/used.md', 'wiki/eight.md', 'wiki/never.md']);
  assert.deepEqual(duePages(list, { now, all: true }).map(each => each.path),
    ['wiki/never.md', 'wiki/shipped.md', 'wiki/eight.md', 'wiki/used.md', 'wiki/three.md'], '--all: every page but a spec');
});

test('a dream fact split in two gives the pages of both parts', () => {
  const facts = [
    { id: 1207, created_at: '2026-10-06T08:00:00Z', body: 'Dream 2026-10-06: read facts up to #1206. Checked: wiki/people/a.md.' },
    { id: 1208, created_at: '2026-10-06T08:00:01Z', body: 'Dream 2026-10-06: read facts up to #1206. Checked: wiki/people/b.md.' },
    { id: 901, created_at: '2026-10-01T08:00:00Z', body: 'Dream 2026-10-01: read facts up to #900. Checked: wiki/people/old.md.' },
  ];
  const last = lastDream(facts);
  assert.deepEqual([last.afterFact, last.pages], [1206, ['wiki/people/a.md', 'wiki/people/b.md']]);
});

const note = (env, body, tags) => memory(env.repo, env.fake, ['put-facts', '--file', writeJsonFile(env.repo.home, `in-${Math.random()}.json`, {
  source: 'save', slug: 'notes', newTags: (tags ?? []).map(name => ({ name, definition: `Facts about ${name}.` })),
  facts: [{ action: 'add', type: 'project', body, ...(tags ? { tags } : {}) }],
})]);

test('drift lists stale-path facts and no plan, pages lists no spec, and neither writes', async t => {
  const env = await setup(t);
  const { root } = env.repo;
  write(root, '.gitignore', '.dev.vars\n');
  write(root, 'scripts/here.mjs', '// here\n');
  write(root, 'app/keep.txt', 'kept\n');
  write(root, 'openspec/changes/archive/2026-01-01-old-plan/proposal.md', '# Old\n');
  write(root, 'openspec/changes/done-plan/tasks.md', '- [x] 1.1 One\n');
  write(root, 'openspec/specs/billing/spec.md', '# Billing\n\nA spec.\n');
  write(root, 'wiki/README.md', '# Wiki\n\nThe hub.\n');
  commit(root, '.gitignore', '2026-01-01T00:00:00Z');
  // The branch once held the helper, so a fact still naming it has drifted.
  write(root, 'scripts/gone.mjs', '// once\n');
  commit(root, 'scripts/gone.mjs', '2026-01-01T00:00:01Z');
  rmSync(join(root, 'scripts/gone.mjs'));
  commit(root, 'scripts/gone.mjs', '2026-01-01T00:00:02Z');
  commit(root, 'openspec/changes/done-plan/tasks.md', '2026-01-02T00:00:00Z');
  commit(root, 'openspec/specs/billing/spec.md', '2026-01-03T00:00:00Z');
  commit(root, 'wiki/README.md', '2026-02-01T00:00:00Z');
  for (const body of [
    'The helper lives at scripts/gone.mjs, beside scripts/here.mjs.',
    'The trial notes are in openspec/changes/old-plan/trial.md.',
    'Local keys sit in app/.dev.vars, which git ignores.',
    'Nothing here names a path.',
  ]) assert.equal((await note(env, body)).code, 0);
  const status = () => execFileSync('git', ['-C', root, 'status', '--porcelain'], { encoding: 'utf8' });
  const before = status();

  const text = await dream(env, 'drift');
  assert.equal(text.code, 0, text.stderr);
  const lines = text.stdout.trim().split('\n').map(line => line.split('\t'));
  assert.equal(lines.length, 1, text.stdout);
  assert.match(lines[0][1], /^#\d+$/);
  assert.deepEqual([lines[0][0], ...lines[0].slice(2)], ['fact', 'scripts/gone.mjs', 'The helper lives at scripts/gone.mjs, beside scripts/here.mjs.']);

  const json = JSON.parse((await dream(env, 'drift', '--json')).stdout);
  assert.deepEqual(json.facts.map(fact => [fact.slug, fact.type, fact.paths]), [['notes', 'project', ['scripts/gone.mjs']]]);
  assert.deepEqual(Object.keys(json), ['facts', 'skipped'], 'a finished plan is no line of the tidy');
  assert.deepEqual(json.skipped, []);

  for (const args of [['pages'], ['pages', '--all']]) {
    const pages = (await dream(env, ...args)).stdout.trim().split('\n').map(line => line.split('\t'));
    assert.deepEqual(pages, [['own', '4', '2026-02-01', 'wiki/README.md']], 'a spec is in no page list');
  }
  const map = await dream(env, 'survey');
  assert.equal(map.code, 0, map.stderr);
  assert.match(map.stdout, /^gone files: 1; #\d+$/m);
  assert.match(map.stdout, /^due pages: 1; wiki\/README\.md$/m);
  assert.doesNotMatch(map.stdout, /openspec\/specs\/|done-plan/, 'no spec row and no plan line in any output');
  assert.equal(status(), before, 'the script edits no file');

  env.fake.setOffline(true);
  const offline = await dream(env, 'drift', '--json');
  assert.equal(offline.code, 0, offline.stderr);
  assert.match(offline.stderr, /memory store could not be read, so no fact was checked/);
  assert.deepEqual(JSON.parse(offline.stdout), { facts: [], skipped: ['fact'] });
  const noMap = await dream(env, 'survey');
  assert.equal(noMap.code, 1);
  assert.match(noMap.stderr, /memory store could not be read, so no map was made/);
});

test('a record names the tags and topics it checked, and the highest fact it sorted', () => {
  const body = 'Daily tidy 2026-11-10: read facts up to #480. Sorted facts up to #300. Checked: wiki/a.md, tag:loose, topic:people/ada. Linked: none. Map: no change.';
  assert.deepEqual(namesChecked(body), ['tag:loose', 'topic:people/ada']);
  assert.deepEqual(namesChecked('Checked: wiki/a.md. A note on a tag: none.'), []);
  const facts = [{ id: 500, created_at: '2026-11-10T08:00:00Z', body }];
  assert.deepEqual(lastDream(facts), { since: '2026-11-10', afterFact: 480, sorted: 300, pages: ['wiki/a.md'], dream: 500 });
  assert.deepEqual([...dreamChecks(facts)], [['wiki/a.md', '2026-11-10'], ['tag:loose', '2026-11-10'], ['topic:people/ada', '2026-11-10']]);
  assert.equal(isDreamFact({ id: 290, created_at: '2026-11-10T08:00:00Z', body: 'Daily tidy 2026-11-10: read facts up to #100. Sorted facts up to #300.' }), false,
    'a record that sorted a fact written after it is forged');
  assert.equal(lastDream([{ id: 9, created_at: '2026-11-10T08:00:00Z', body: 'Daily tidy 2026-11-10: read facts up to #5. Linked: Sorted facts up to #7.' }]).sorted, 0,
    "a link's words do not set it");
});

test("a tidy's record holds the highest ids its parts read and sorted, and repeats the last record's with none", () => {
  const last = lastDream([{ id: 500, created_at: '2026-11-10T08:00:00Z', body: 'Daily tidy 2026-11-10: read facts up to #480. Sorted facts up to #300. Checked: none.' }]);
  const units = [{ read: 510, checked: ['wiki/a.md'], linked: [] }, { read: 505, sorted: 320, checked: ['tag:loose', 'two words'], linked: ['big and\nsmall'] }, { checked: ['wiki/a.md'], linked: [] }];
  assert.deepEqual(recordBodies({ day: '2026-11-12', units, last, map: ['no topic 4 to 2', 'missed questions 6 to 1'] }),
    ['Daily tidy 2026-11-12: read facts up to #510. Sorted facts up to #320. Checked: wiki/a.md, tag:loose. Linked: big and small. Map: no topic 4 to 2, missed questions 6 to 1.']);
  assert.deepEqual(recordBodies({ day: '2026-11-12', last }),
    ['Daily tidy 2026-11-12: read facts up to #480. Sorted facts up to #300. Checked: none. Linked: none. Map: no change.']);
  const older = lastDream([{ id: 500, created_at: '2026-11-10T08:00:00Z', body: 'Wiki tidy 2026-11-10: read facts up to #480. Checked: wiki/a.md.' }]);
  assert.match(recordBodies({ day: '2026-11-12', units: [{ checked: [], linked: [] }], last: older })[0], /read facts up to #480\. Sorted facts up to #0\./);
  assert.match(recordBodies({ day: '2026-11-12', last: lastDream([], new Date('2026-11-12T00:00:00Z')) })[0], /read facts up to #0\. Sorted facts up to #0\./);
});

test('a record over 400 characters splits into facts the next tidy reads as one', () => {
  const pages = Array.from({ length: 30 }, (_, n) => `wiki/people/person-${String(n).padStart(2, '0')}.md`);
  const units = [{ read: 510, sorted: 320, checked: [...pages, 'topic:big'], linked: ['x'.repeat(300)] }];
  const bodies = recordBodies({ day: '2026-11-10', units, last: { afterFact: 0, sorted: 0 }, map: ['large topics 2 to 1'] });
  assert.ok(bodies.length > 2, `${bodies.length} facts`);
  for (const body of bodies) {
    assert.ok(body.length <= 400, `${body.length} characters`);
    assert.ok(body.startsWith('Daily tidy 2026-11-10: read facts up to #510. Sorted facts up to #320. '), body);
    assert.ok(body.endsWith('.'), body);
  }
  assert.ok(bodies.join(' ').includes(`Linked: ${'x'.repeat(200)}.`), 'one linked text is cut to 200 characters');
  const facts = bodies.map((body, index) => ({ id: 600 + index, created_at: `2026-11-10T08:00:0${index}Z`, body }));
  assert.deepEqual(lastDream(facts), { since: '2026-11-10', afterFact: 510, sorted: 320, pages, dream: 600 + bodies.length - 1 });
  assert.equal(dreamChecks(facts).get('topic:big'), '2026-11-10');
});

// The map's input: a record two days old, 101 facts in each of two topics, and facts with no topic.
function mapInput() {
  const topicOf = tag => ({ big: 'big', 'fresh-big': 'fresh-big', small: 'small', alias: 'small' })[tag] ?? null;
  const old = { type: 'project', created_at: ago(40) };
  const record = { id: 500, type: 'project', tags: ['dream'], created_at: ago(2), superseded_by: null,
    body: `Daily tidy ${dayAgo(2)}: read facts up to #480. Sorted facts up to #300. Checked: tag:checked-tag, topic:fresh-big, wiki/b.md. Linked: none. Map: no change.` };
  const facts = [
    ...Array.from({ length: 101 }, (_, n) => ({ ...old, id: n + 1, tags: ['big'], body: `Big ${n}.` })),
    ...Array.from({ length: 101 }, (_, n) => ({ ...old, id: n + 102, tags: ['fresh-big'], body: `Fresh ${n}.` })),
    { ...old, id: 250, tags: ['loose-tag'], body: 'An old fact with a tag and no topic.' },
    { ...old, id: 260, tags: [], body: 'An old fact with no tag.' },
    { ...old, id: 350, tags: ['loose-tag', 'plan'], body: 'A fact above the sorted id.' },
    { ...old, id: 360, tags: ['checked-tag'], body: 'Its tag was checked 2 days ago.' },
    { ...old, id: 481, type: 'thread', tags: ['small', 'improve'], created_at: ago(1), body: 'Memory misled a chat here.' },
    { ...old, id: 490, tags: ['alias'], created_at: ago(1), body: 'A new fact under an alias.' },
    record,
  ];
  const usage = {
    topics: [{ topic: 'small', uses: 7 }, { topic: 'big', uses: 2 }],
    facts: [{ id: 1, uses: 4 }, { id: 2, uses: 3 }, { id: 490, uses: 1 }],
    misses: [{ words: 'where is the refund rule', command: 'recall', at: ago(1), times: 2 }, { words: 'asked before the last tidy', command: 'pull', at: ago(5), times: 1 }],
    pairs: [{ topics: ['big', 'small'], days: 3 }],
  };
  const pages = [
    { path: 'wiki/a.md', kind: 'own', text: 'one', committed: ago(20) },
    { path: 'wiki/b.md', kind: 'own', text: 'one', committed: ago(30) },
    { path: 'wiki/c.md', kind: 'own', text: 'one', committed: null },
    { path: 'wiki/d.md', kind: 'own', text: 'one', committed: ago(10) },
    { path: 'wiki/e.md', kind: 'own', text: 'one', committed: ago(3) },
    { path: 'wiki/f.md', kind: 'shipped', text: 'one', committed: null },
  ];
  return { facts, records: [record], topicOf, steps: ['plan'], usage, pages, pageUses: new Map([['wiki/d.md', 5]]), gone: [{ id: 250 }] };
}

test('the map has one line for each weakness, with its count and names to pull', () => {
  const map = mapLines(mapInput());
  assert.deepEqual(map.lines, [
    { name: 'new facts', count: 2, names: ['#481', '#490'] },
    { name: 'trouble notes', count: 1, names: ['#481'] },
    { name: 'missed questions', count: 1, names: ['"where is the refund rule"'] },
    { name: 'no topic', count: 4, names: ['#350', '#360'] },
    { name: 'tags with no page', count: 2, names: ['loose-tag (2)', 'improve (1)'] },
    { name: 'large topics', count: 1, names: ['big (101 facts, 2% used)'] },
    { name: 'gone files', count: 1, names: ['#250'] },
    { name: 'due pages', count: 3, names: ['wiki/d.md', 'wiki/c.md', 'wiki/a.md'] },
    { name: 'most used', count: 2, names: ['small (7)', 'big (2)'] },
    { name: 'often returned', count: 3, names: ['#1 (4)', '#2 (3)', '#490 (1)'] },
    { name: 'used together', count: 1, names: ['big + small (3 days)'] },
  ]);
  assert.deepEqual([map.last.dream, map.last.afterFact, map.last.sorted], [500, 480, 300]);
  assert.deepEqual(map.questions, ['where is the refund rule'], 'only a question asked since the last record');
  assert.deepEqual(map.newFacts, [481, 490]);
  assert.equal(mapText(map).split('\n')[3], 'no topic: 4; #350 · #360');
});

test('the map leaves off what a tidy checked today, and reads 30 days back with no record', () => {
  const input = mapInput();
  const checked = mapLines({ ...input, checked: ['wiki/a.md', 'tag:loose-tag', 'topic:big'] });
  const line = name => checked.lines.find(each => each.name === name);
  assert.deepEqual([line('due pages').names, line('tags with no page').names, line('large topics').count], [['wiki/d.md', 'wiki/c.md'], ['improve (1)'], 0]);

  const first = mapLines({ ...input, records: [], facts: input.facts.filter(fact => fact.id !== 500) });
  assert.equal(first.last.dream, null);
  assert.deepEqual(first.newFacts, [481, 490], 'facts written in the last 30 days');
  assert.equal(first.lines[2].count, 2, 'every kept missed question');
  assert.equal(first.lines.find(each => each.name === 'large topics').count, 2);

  assert.deepEqual(mapLines({}).lines.map(each => [each.count, each.names]), Array.from({ length: 11 }, () => [0, []]));
});

test('survey prints zeros for an empty store with no counts, and the map of a store with facts', async t => {
  const env = await setup(t);
  const names = ['new facts', 'trouble notes', 'missed questions', 'no topic', 'tags with no page', 'large topics', 'gone files', 'due pages', 'most used', 'often returned', 'used together'];
  const empty = await dream(env, 'survey');
  assert.equal(empty.code, 0, empty.stderr);
  assert.equal(empty.stdout, `${names.map(name => `${name}: 0`).join('\n')}\n`);
  const json = JSON.parse((await dream(env, 'survey', '--json')).stdout);
  assert.deepEqual([json.version, json.last.dream, json.questions, json.lines.map(each => each.count)], [1, null, [], names.map(() => 0)]);
  assert.equal(existsSync(join(env.repo.stateDir, 'usage.jsonl')), false, 'reading the map counts no use');

  assert.equal((await note(env, 'Refunds over 100 dollars need the owner.', ['refund-rules'])).code, 0);
  writeFileSync(join(env.repo.stateDir, 'usage.jsonl'), `${JSON.stringify({ at: new Date().toISOString(), command: 'recall', node: null, topics: [], facts: [], workspace: 'w', miss: true, words: 'who approves a refund' })}\n`);
  const map = (await dream(env, 'survey')).stdout.split('\n');
  assert.match(map[0], /^new facts: 1; #\d+$/);
  assert.equal(map[2], 'missed questions: 1; "who approves a refund"');
  assert.match(map[3], /^no topic: 1; #\d+$/);
  assert.equal(map[4], 'tags with no page: 1; refund-rules (1)');
});

test('keep stages every change and adds one line for the part; outside a tidy it exits 2 and stages nothing', async t => {
  const env = await setup(t);
  const { root } = env.repo;
  const progress = join(env.repo.home, 'progress.jsonl');
  const staged = () => execFileSync('git', ['-C', root, 'diff', '--cached', '--name-only'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  const keep = (file, ...args) => node(env.repo, env.fake, DREAM, ['keep', ...args], { env: { WONG_MEMORY_TIDY_PROGRESS: file } });
  write(root, 'wiki/a.md', '# A\n\nOne.\n');

  const outside = await keep('', '--read', '12');
  assert.equal(outside.code, 2);
  assert.match(outside.stderr, /keep works only inside the daily tidy/);
  assert.deepEqual(staged(), []);
  const bad = await keep(progress, '--read', 'twelve');
  assert.equal(bad.code, 2);
  assert.deepEqual([staged(), existsSync(progress)], [[], false]);

  const first = await keep(progress, '--read', '12', '--checked', 'wiki/a.md');
  assert.equal(first.code, 0, first.stderr);
  assert.ok(staged().includes('wiki/a.md'));
  write(root, 'wiki/b.md', '# B\n\nTwo.\n');
  assert.equal((await keep(progress, '--sorted', '#9', '--checked', 'tag:loose', '--checked', 'topic:people/ada', '--linked', 'a and b')).code, 0);
  assert.ok(staged().includes('wiki/b.md'));
  const lines = readFileSync(progress, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  assert.deepEqual(lines.map(line => Object.fromEntries(Object.entries(line).filter(([key]) => key !== 'at'))), [
    { read: 12, checked: ['wiki/a.md'], linked: [] },
    { sorted: 9, checked: ['tag:loose', 'topic:people/ada'], linked: ['a and b'] },
  ]);
});

test('the brief gives a goal, limits and tools, and no fixed steps', () => {
  const brief = readFileSync(BRIEF, 'utf8');
  assert.match(brief, /^## The goal$/m);
  const nevers = brief.split('## Never')[1].split('\n## ')[0].trim().split('\n');
  assert.equal(nevers.length, 8);
  for (const line of nevers) assert.match(line, /^- Never /);
  for (const tool of ['`T survey`', '`T keep ', '`M recall`']) assert.ok(brief.includes(tool), tool);
  assert.doesNotMatch(brief, /^\s*\d+\. /m, 'no numbered step');
  assert.doesNotMatch(brief, /--daily|--dry-run|openspec|needs you|for the person/i, 'no old flag, no spec check, and no list for a person');
  assert.equal(existsSync(new URL('../../.agents/plugins/memory/skills', import.meta.url)), false, 'the command is gone');
});
