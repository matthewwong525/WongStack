// The preview page after a build: each changed screen's pictures copied into .scratch/, built as a preview review page.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { PREVIEW_IN_CHAT, writePreview } from '../../.agents/skills/apply/scripts/preview-review.mjs';

const script = resolve(import.meta.dirname, '../../.claude/skills/apply/scripts/preview-review.mjs');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

// A checkout with three screenshots in a folder of its own, outside the page's folder.
function checkout(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-preview-'));
  try {
    spawnSync('git', ['init', '-q', dir]);
    mkdirSync(join(dir, 'shots'));
    for (const name of ['inbox-live.png', 'inbox-preview.png', 'new.png']) writeFileSync(join(dir, 'shots', name), PNG);
    return fn(dir);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
const run = (cwd, args) => spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' });

test('pairs and a new screen build a preview page in .scratch/, and print its file without --link', () => checkout(dir => {
  const result = run(dir, ['demo', '--pair', 'Inbox|shots/inbox-live.png|shots/inbox-preview.png', '--pair', 'New page||shots/new.png', '--note', 'Phone width only.']);
  assert.equal(result.status, 0, result.stderr);
  const folder = join(dir, '.scratch', 'demo-preview'), page = join(folder, 'review.html');
  assert.equal(result.stdout, `Click here to see the preview: [review.html](${page})\n\n${PREVIEW_IN_CHAT}\n`);
  assert.deepEqual(readdirSync(join(folder, 'pictures')).sort(), ['1-live.png', '1-preview.png', '2-preview.png']);
  assert.equal(readFileSync(join(folder, 'proposal.md'), 'utf8'), [
    '# Preview of demo', '', '## Why', '',
    'Built: demo. Look at each changed screen, live now and in the preview, then publish or send notes.', '', 'Phone width only.', '',
    '## What Changes', '',
    '- **Inbox**', '  ```picture', '  Live now: pictures/1-live.png', '  Preview: pictures/1-preview.png', '  ```',
    '- **New page**', '  ```picture', '  Preview: pictures/2-preview.png', '  ```', ''].join('\n'));
  const html = readFileSync(page, 'utf8');
  assert.match(html, /<body data-kind="preview" data-change="demo-preview">/);
  assert.equal((html.match(/<img src="data:image\/png;base64,/g) || []).length, 3);
  assert.match(html, /alt="Live now"><figcaption>Live now<\/figcaption><\/figure><figure><img [^>]*alt="Preview">/);
  assert.doesNotMatch(html, /id="decisions"/);
  // Git takes none of it, and a second run with fewer screens leaves no old picture behind.
  assert.equal(spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: dir, encoding: 'utf8' }).stdout, '?? shots/inbox-live.png\n?? shots/inbox-preview.png\n?? shots/new.png\n');
  assert.equal(run(dir, ['demo', '--pair', 'Inbox|shots/inbox-live.png|shots/inbox-preview.png']).status, 0);
  assert.deepEqual(readdirSync(join(folder, 'pictures')).sort(), ['1-live.png', '1-preview.png']);
}));

test('a bad pair, a missing picture, a bad name, or no checkout stops with one line', () => checkout(dir => {
  for (const [args, line] of [
    [['demo', '--pair', 'Inbox|shots/new.png'], 'preview: --pair takes "<title>|<live picture>|<preview picture>": Inbox|shots/new.png\n'],
    [['demo', '--pair', 'Inbox|shots/none.png|shots/new.png'], 'preview: no picture at shots/none.png\n'],
    [['de mo', '--pair', 'Inbox||shots/new.png'], 'preview: a change name is letters, digits, - and _, up to 92: de mo\n'],
  ]) {
    const result = run(dir, args);
    assert.equal(result.status, 1, result.stdout);
    assert.equal(result.stderr, line);
  }
  assert.equal(run(dir, ['demo']).status, 2, 'no pair is a usage error');
  assert.throws(() => writePreview(dir, 'demo', []), /name at least one --pair/);
  const outside = mkdtempSync(join(tmpdir(), 'wong-preview-bare-'));
  try {
    const result = run(outside, ['demo', '--pair', `Inbox||${join(dir, 'shots', 'new.png')}`]);
    assert.equal(result.stderr, 'preview: run it inside the change\'s checkout\n');
    assert.equal(existsSync(join(outside, '.scratch')), false);
  } finally { rmSync(outside, { recursive: true, force: true }); }
}));
