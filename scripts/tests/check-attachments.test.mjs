import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkAttachments, shapeProblems } from '../check-attachments.mjs';
import { REPO_URL, parseAttachment } from '../../site/attachments/parse.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, 'scripts/check-attachments.mjs');

const ATTACHMENT = `---
title: You explain your business again every day
problem: Each new chat starts from zero.
fix: Each chat saves what it learned.
order: 1
checked: 2026-10-31
sources:
  - wiki/memory.md
  - .agents/skills/memory/SKILL.md
---
Add a memory system to my AI setup. Build it in this project and ask me before anything you can't undo:

> Keep short facts from each chat, one per line
> For more context, look at this repo: ${REPO_URL} (start at wiki/memory.md)
`;

const SOURCES = { 'wiki/memory.md': '# Memory\n', '.agents/skills/memory/SKILL.md': '# /memory\n' };

const git = (root, ...args) => {
  const result = spawnSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', ...args], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
};

function write(root, files) {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
}

// A throwaway repo whose default branch, also its origin/main, holds one attachment and its two sources.
function fixture(t, { origin = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-check-attachments-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  write(root, { 'site/attachments/memory.md': ATTACHMENT, ...SOURCES });
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'start');
  if (origin) git(root, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  const run = () => {
    const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
    return { status: result.status, out: `${result.stdout}${result.stderr}` };
  };
  const commit = files => {
    write(root, files);
    git(root, 'add', '-A');
    git(root, 'commit', '-q', '-m', 'edit');
  };
  return { root, run, commit };
}

const STALE = 'site/attachments/memory.md: wiki/memory.md changed. Rewrite it by wiki/maintaining/attachments.md, or set `checked:` to today if the fix is unchanged.';

test('an attachment with its sources unchanged passes', t => {
  const f = fixture(t);
  const result = f.run();
  assert.equal(result.status, 0, result.out);
  assert.match(result.out, /^attachments: 1 attachment\(s\) match their sources$/m);
});

test('a source changed on the branch alone fails, naming the attachment, the source and the fix', t => {
  const f = fixture(t);
  git(f.root, 'switch', '-q', '-c', 'edit');
  f.commit({ 'wiki/memory.md': '# Memory\n\nA new rule.\n' });
  const result = f.run();
  assert.equal(result.status, 1, result.out);
  assert.equal(result.out.trim(), STALE);
});

test('an uncommitted source edit counts too', t => {
  const f = fixture(t);
  write(f.root, { 'wiki/memory.md': '# Memory\n\nA scratch edit.\n' });
  const result = f.run();
  assert.equal(result.status, 1, result.out);
  assert.equal(result.out.trim(), STALE);
});

test('a source and its attachment changed together pass', t => {
  const f = fixture(t);
  git(f.root, 'switch', '-q', '-c', 'edit');
  f.commit({ 'wiki/memory.md': '# Memory\n\nA new rule.\n', 'site/attachments/memory.md': ATTACHMENT.replace('2026-10-31', '2026-11-01') });
  const result = f.run();
  assert.equal(result.status, 0, result.out);
});

test('on the default branch, after the merge, only the shape is checked', t => {
  const f = fixture(t);
  f.commit({ 'wiki/memory.md': '# Memory\n\nMerged.\n' });
  git(f.root, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  assert.equal(f.run().status, 0);
});

test('with no origin/main, only the shape is checked', t => {
  const f = fixture(t, { origin: false });
  f.commit({ 'wiki/memory.md': '# Memory\n\nNo base.\n' });
  const result = f.run();
  assert.equal(result.status, 0, result.out);
  assert.match(result.out, /no origin\/main to compare/);
});

test('a source that does not exist fails, naming it', t => {
  const f = fixture(t);
  rmSync(join(f.root, 'wiki/memory.md'));
  write(f.root, { 'site/attachments/memory.md': ATTACHMENT });
  const result = f.run();
  assert.equal(result.status, 1, result.out);
  assert.match(result.out, /^site\/attachments\/memory\.md: source wiki\/memory\.md does not exist\. Name the file it moved to/m);
});

test('each broken shape is named with the page that fixes it', () => {
  const problems = text => shapeProblems(parseAttachment(text));
  assert.deepEqual(problems(ATTACHMENT), []);
  assert.deepEqual(problems(ATTACHMENT.replace(/^title: .*\n/m, '')), ['`title:` is missing']);
  assert.deepEqual(problems(ATTACHMENT.replace('order: 1', 'order: first')), ['`order:` is missing or not a number']);
  assert.deepEqual(problems(ATTACHMENT.replace(/^title: .*$/m, 'title:')), ['`title:` is missing']);
  assert.deepEqual(problems(ATTACHMENT.replace('order: 1', 'order:')), ['`order:` is missing or not a number']);
  assert.deepEqual(problems(ATTACHMENT.replace(/sources:\n(  - .*\n)+/, 'sources:\n')), ['`sources:` lists no file']);
  assert.deepEqual(problems(ATTACHMENT.replace('> Keep short', 'Keep short')), ['body line 3 does not start with `> `']);
  assert.deepEqual(problems(ATTACHMENT.replace(` ${REPO_URL}`, '')), [`the last bullet does not link ${REPO_URL}`]);
  assert.deepEqual(problems(ATTACHMENT.replace('undo:\n\n', 'undo:\n')), ['the body is not one opening line, an empty line, then the bullets']);
  assert.deepEqual(problems('no frontmatter at all'), [
    '`title:` is missing', '`problem:` is missing', '`fix:` is missing', '`checked:` is missing',
    '`order:` is missing or not a number', '`sources:` lists no file',
    'the body is not one opening line, an empty line, then the bullets', `the last bullet does not link ${REPO_URL}`,
  ]);
});

test('a shape failure from the command names the file and the wiki page', t => {
  const f = fixture(t);
  write(f.root, { 'site/attachments/memory.md': ATTACHMENT.replace(/^fix: .*\n/m, '') });
  const result = f.run();
  assert.equal(result.status, 1, result.out);
  assert.match(result.out, /^site\/attachments\/memory\.md: `fix:` is missing\. Fix it by wiki\/maintaining\/attachments\.md\.$/m);
});

test("the repo's own attachments all pass their shape, and every source exists", () => {
  const { files, failures } = checkAttachments(repo, null);
  assert.deepEqual(failures, []);
  assert.equal(files.length, readdirSync(join(repo, 'site/attachments')).filter(name => name.endsWith('.md')).length);
  assert.ok(files.length >= 7);
  for (const name of files) {
    const { sources } = parseAttachment(readFileSync(join(repo, 'site/attachments', name), 'utf8'));
    assert.ok(sources.every(source => !source.startsWith('.claude/')), `${name}: name .agents/, the path git tracks`);
  }
});
