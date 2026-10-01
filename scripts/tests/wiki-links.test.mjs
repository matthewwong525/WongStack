// The wiki link check and backlinks: dead links, lost pages, hubs that skip a page, and what a link counts as.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { backlinks, checkWiki } from '../../.agents/skills/memory/scripts/lib/links.mjs';

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

// A whole, linked wiki: the root hub, a page, and a section with its own hub.
const WIKI = {
  'wiki/README.md': '# Wiki\n\n- [Voice](voice.md)\n- [Stack](stack/)\n',
  'wiki/voice.md': '# Voice\n\nUp: [the wiki](README.md).\n',
  'wiki/stack/README.md': '# Stack\n\n- [Apps](apps.md)\n',
  'wiki/stack/apps.md': '# Apps\n\nUp: [stack](README.md). See [the skill](../../.agents/skills/x/SKILL.md#run).\n',
  '.agents/skills/x/SKILL.md': '# X\n',
};
const check = root => spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' });

test('a whole wiki passes, and the script says so', t => {
  const root = repo(t, WIKI);
  assert.deepEqual(checkWiki(root), []);
  const run = check(root);
  assert.equal(run.status, 0, run.stdout);
  assert.equal(run.stdout.trim(), 'Wiki links: 4 pages, all linked.');
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
    'wiki/README.md': '# Wiki\n\n- [Voice](voice.md)\n- [Apps](stack/apps.md)\n',
    'wiki/stack/README.md': '# Stack\n\nUp: [the wiki](../README.md).\n',
    'wiki/assets/shot.png': 'png',
  });
  assert.deepEqual(checkWiki(root), ['wiki/stack/README.md: does not link apps.md']);
  const missing = repo(t, { ...WIKI, 'wiki/README.md': '# Wiki\n\n- [Voice](voice.md)\n', 'wiki/voice.md': '# Voice\n\n[Stack](stack/README.md)\n' });
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
