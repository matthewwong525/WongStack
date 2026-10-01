// The wiki check and backlinks: dead links and section links, lost pages, hubs that skip a page, page size and opening,
// and what a link counts as.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { backlinks, checkWiki, WIKI_PAGE_WORDS } from '../../.agents/skills/memory/scripts/lib/links.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(REPO, '.github/scripts/wiki-links.mjs');

// A temp repo holding the given files: { 'wiki/README.md': '...' }.
function repo(t, files) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-wiki-links-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), body);
  }
  return root;
}

// A whole, linked wiki: the root hub, a page, and a section with its own hub. Each page opens with a title and a sentence.
const WIKI = {
  'wiki/README.md': '# Wiki\nStart here.\n- [Voice](voice.md)\n- [Stack](stack/)\n',
  'wiki/voice.md': '# Voice\n\nUp: [the wiki](README.md).\n',
  'wiki/stack/README.md': '# Stack\nThe stack.\n- [Apps](apps.md)\n',
  'wiki/stack/apps.md': '# Apps\n\nUp: [stack](README.md). See [the skill](../../.agents/skills/x/SKILL.md#run).\n',
  '.agents/skills/x/SKILL.md': '# X\n\n## Run\n',
};
const check = root => spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' });

test('a whole wiki passes, and the script says so', t => {
  const root = repo(t, WIKI);
  assert.deepEqual(checkWiki(root), []);
  const run = check(root);
  assert.equal(run.status, 0, run.stdout);
  assert.equal(run.stdout.trim(), 'Wiki: 4 pages, all linked, each under 3,000 words.');
});

test('this repo\'s own wiki passes', () => {
  assert.deepEqual(checkWiki(REPO), []);
});

test('a repo with no wiki/ passes', t => {
  const root = repo(t, { 'README.md': '# Repo\n\n[gone](nowhere.md)\n' });
  assert.deepEqual(checkWiki(root), []);
  assert.equal(check(root).status, 0);
});

test('a link to a page that is gone fails, naming the page and line', t => {
  const root = repo(t, { ...WIKI, 'wiki/voice.md': '# Voice\n\nUp: [the wiki](README.md).\nSee [tone](tone.md#short).\n' });
  assert.deepEqual(checkWiki(root), ['wiki/voice.md:4: links to tone.md#short, which does not exist']);
  const run = check(root);
  assert.equal(run.status, 1);
  assert.match(run.stdout, /^### Wiki checks$/m);
  assert.match(run.stdout, /^- wiki\/voice\.md:4: links to tone\.md#short, which does not exist$/m);
});

test('a page no other wiki page links to fails; linking itself or from outside wiki/ does not count', t => {
  const root = repo(t, { ...WIKI, 'wiki/acme.md': '# Acme\n\n[Acme](acme.md), [up](README.md).\n', 'AGENTS.md': '[Acme](wiki/acme.md)\n' });
  assert.deepEqual(checkWiki(root), ['wiki/acme.md: no other wiki page links to it', 'wiki/README.md: does not link acme.md']);
  assert.deepEqual(backlinks(root, 'wiki/acme.md'), ['AGENTS.md:1'], 'a page linking itself is not a backlink');
});

test('a hub that skips a page or a subfolder of pages fails; a folder of images is exempt', t => {
  const root = repo(t, {
    ...WIKI,
    'wiki/README.md': '# Wiki\nStart here.\n- [Voice](voice.md)\n- [Apps](stack/apps.md)\n',
    'wiki/stack/README.md': '# Stack\n\nUp: [the wiki](../README.md).\n',
    'wiki/assets/shot.png': 'png',
  });
  assert.deepEqual(checkWiki(root), ['wiki/stack/README.md: does not link apps.md']);
  const missing = repo(t, { ...WIKI, 'wiki/README.md': '# Wiki\nStart here.\n- [Voice](voice.md)\n', 'wiki/voice.md': '# Voice\n\n[Stack](stack/README.md)\n' });
  assert.deepEqual(checkWiki(missing), ['wiki/README.md: does not link stack/']);
});

test('a link inside fenced code or a code span is not a link', t => {
  const root = repo(t, { ...WIKI, 'wiki/voice.md': '# Voice\n\n[up](README.md)\n\n```md\n[gone](gone.md)\n```\n\n`[also](gone.md)`\n' });
  assert.deepEqual(checkWiki(root), []);
  assert.deepEqual(backlinks(root, 'wiki/gone.md'), []);
});

test('a folder link lands on its README.md, and .claude/ reads as .agents/', t => {
  const root = repo(t, { ...WIKI, 'wiki/voice.md': '# Voice\n\n[up](README.md) [skill](../.claude/skills/x/SKILL.md)\n' });
  assert.deepEqual(checkWiki(root), [], 'the .claude/ link resolves to .agents/ even with no .claude link on disk');
  assert.deepEqual(backlinks(root, 'wiki/stack/README.md'), ['wiki/README.md:4', 'wiki/stack/apps.md:3']);
  assert.deepEqual(backlinks(root, '.claude/skills/x/SKILL.md'), ['wiki/stack/apps.md:3', 'wiki/voice.md:3']);
});

test('backlinks list links to a path or inside it, and skip archived changes', t => {
  const root = repo(t, {
    ...WIKI,
    'wiki/stack/apps.md': '# Apps\n\n[up](README.md) [hello](../../app/apps/hello/index.ts) [site](https://example.com/app/apps/)\n',
    'openspec/changes/live/tasks.md': '- [ ] 1.1 Edit [it](../../../app/apps/hello/index.ts).\n',
    'openspec/changes/archive/2026-01-01-old/tasks.md': '- [x] 1.1 Edit [it](../../../../app/apps/hello/index.ts).\n',
    'app/apps/hello/index.ts': '',
  });
  assert.deepEqual(backlinks(root, 'app/apps/hello/index.ts'), ['openspec/changes/live/tasks.md:1', 'wiki/stack/apps.md:3']);
  assert.deepEqual(backlinks(root, 'app/apps/'), ['openspec/changes/live/tasks.md:1', 'wiki/stack/apps.md:3']);
  assert.deepEqual(backlinks(root, join(root, 'app/apps/hello/index.ts')), ['openspec/changes/live/tasks.md:1', 'wiki/stack/apps.md:3']);
  assert.deepEqual(backlinks(root, 'app/api'), []);
});

// A wiki whose voice.md holds the given text, checked.
const withVoice = (t, body, extra = {}) => checkWiki(repo(t, { ...WIKI, 'wiki/voice.md': body, ...extra }));

test('a section link must land on a heading: a renamed heading fails, naming the page, line, and link', t => {
  const voice = '# Voice\n\nUp: [the wiki](README.md).\n\n## Keep it short\n';
  const apps = '# Apps\n\nUp: [stack](README.md).\nSee [tone](../voice.md#hand-it-over) and [short](../voice.md#keep-it-short).\n';
  const problems = checkWiki(repo(t, { ...WIKI, 'wiki/voice.md': voice, 'wiki/stack/apps.md': apps }));
  assert.deepEqual(problems, ['wiki/stack/apps.md:4: links to ../voice.md#hand-it-over, but wiki/voice.md has no heading #hand-it-over']);
  const run = check(repo(t, { ...WIKI, 'wiki/voice.md': voice, 'wiki/stack/apps.md': apps }));
  assert.equal(run.status, 1);
});

test('a same-page section link is read against its own page', t => {
  assert.deepEqual(withVoice(t, '# Voice\n\nUp: [the wiki](README.md). See [below](#tone).\n\n## Tone\n'), []);
  assert.deepEqual(withVoice(t, '# Voice\n\nUp: [the wiki](README.md). See [below](#mood).\n\n## Tone\n'),
    ['wiki/voice.md:3: links to #mood, but wiki/voice.md has no heading #mood']);
});

test('a folder\'s section link reads its README.md', t => {
  const stack = '# Stack\nThe stack.\n- [Apps](apps.md)\n\n## Hosting\n';
  assert.deepEqual(withVoice(t, '# Voice\n\nUp: [the wiki](README.md). [Hosting](stack/#hosting).\n', { 'wiki/stack/README.md': stack }), []);
  assert.deepEqual(withVoice(t, '# Voice\n\nUp: [the wiki](README.md). [Deploys](stack/#deploys).\n', { 'wiki/stack/README.md': stack }),
    ['wiki/voice.md:3: links to stack/#deploys, but wiki/stack/README.md has no heading #deploys']);
});

test('a repeated heading\'s second anchor gets -1, and a heading inside fenced code does not count', t => {
  const body = links => `# Voice\n\nUp: [the wiki](README.md). ${links}\n\n## Notes\n\n## Notes\n\n\`\`\`md\n## Hidden\n\`\`\`\n`;
  assert.deepEqual(withVoice(t, body('[a](#notes) [b](#notes-1)')), []);
  assert.deepEqual(withVoice(t, body('[c](#notes-2) [d](#hidden)')), [
    'wiki/voice.md:3: links to #notes-2, but wiki/voice.md has no heading #notes-2',
    'wiki/voice.md:3: links to #hidden, but wiki/voice.md has no heading #hidden',
  ]);
});

test(`a page over ${WIKI_PAGE_WORDS} words fails, naming its count and the cap; one at the cap passes`, t => {
  const page = words => `# Voice\n\nUp: [the wiki](README.md).\n${'word '.repeat(words - 5)}\n`;
  assert.deepEqual(withVoice(t, page(3000)), []);
  assert.deepEqual(withVoice(t, page(3001)), ['wiki/voice.md: 3,001 words, over the 3,000-word cap; split it by its sections into pages beside it']);
});

test('a page must open with one # title, and a # line inside fenced code is not one', t => {
  assert.deepEqual(withVoice(t, 'Voice rules.\n\nUp: [the wiki](README.md).\n'), ['wiki/voice.md: has no # title on its first line']);
  assert.deepEqual(withVoice(t, '```sh\n# Voice\n```\n\nUp: [the wiki](README.md).\n'), ['wiki/voice.md: has no # title on its first line']);
  assert.deepEqual(withVoice(t, '# Voice\n\nUp: [the wiki](README.md).\n\n# Tone\n'), ['wiki/voice.md: has 2 # titles']);
  assert.deepEqual(withVoice(t, '# Voice\n\nUp: [the wiki](README.md).\n\n```sh\n# a comment\n```\n'), []);
});

test('a list or a heading straight after the title fails: the page opens with a sentence', t => {
  assert.deepEqual(withVoice(t, '# Voice\n\n- [up](README.md)\n'), ['wiki/voice.md: opens with a list, not a sentence saying what the page is']);
  assert.deepEqual(withVoice(t, '# Voice\n\n## Tone\n\n[up](README.md)\n'), ['wiki/voice.md: opens with a heading, not a sentence saying what the page is']);
  const bare = repo(t, { ...WIKI, 'wiki/README.md': '# Wiki\nStart here.\n- [Voice](voice.md)\n- [Stack](stack/)\n- [Empty](empty.md)\n', 'wiki/empty.md': '# Empty\n' });
  assert.deepEqual(checkWiki(bare), ['wiki/empty.md: has no sentence after its # title saying what the page is']);
});
