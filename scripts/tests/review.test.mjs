import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { buildReview } from '../../.agents/skills/plan/scripts/build-review.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const kit = readFileSync(resolve(here, '../../.agents/skills/plan/references/review-kit.html'), 'utf8');
const requireFromApp = createRequire(resolve(here, '../../app/package.json'));
// jsdom comes from app/node_modules. Without it the page checks skip and say why.
let JSDOM, VirtualConsole;
try { ({ JSDOM, VirtualConsole } = requireFromApp('jsdom')); } catch { /* reported by needsDom */ }
const needsDom = { skip: JSDOM ? false : 'jsdom cannot be resolved — run `npm ci` in app/ to run the review page checks' };

const fence = '```';
const proposal = `# Example

## Why

Reduce repeated work.

A second paragraph
that wraps.

## What Changes

- **First item** wraps
  onto an indented line
and an unindented one. (review.html#/list/empty)
- **Second item** carries a drawing.
  ${fence}text
  a ─→ b

  c ─→ d
  ${fence}
- **Third item** links [the wiki](../wiki/README.md) and \`code **not bold**\`.

**Non-goals:** anything else.

## Decision log

- **2026-09-26** — Asked how to draw → chose **text**.
- **2026-09-26** — Assumed: forty columns, because phones are narrow.
- **2026-09-26** — The user added a note.
`;

function fixture(fn, source = proposal) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-review-'));
  const root = join(dir, 'example');
  mkdirSync(root);
  writeFileSync(join(root, 'proposal.md'), source);
  try { return fn(root); } finally { rmSync(dir, { recursive: true, force: true }); }
}

function page(root) { return readFileSync(join(root, 'review.html'), 'utf8'); }

function dom(html) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));
  const window = new JSDOM(html, { url: 'https://review.test/', runScripts: 'dangerously', virtualConsole }).window;
  return { window, document: window.document, errors };
}

test('assembly writes the current format and is deterministic', () => fixture(root => {
  assert.deepEqual(buildReview(root, { requireCurrent: true }), { kind: 'current', changed: true, warnings: [] });
  const html = page(root);
  assert.ok(html.startsWith('<!-- wong-review:3 -->\n<!doctype html>'));
  assert.doesNotMatch(html, /CHANGE-NAME|<!-- review:content -->/);
  assert.match(html, /<title>Review · example<\/title>/);
  const before = statSync(join(root, 'review.html')).mtimeMs;
  assert.deepEqual(buildReview(root, { requireCurrent: true }), { kind: 'current', changed: false, warnings: [] });
  assert.equal(page(root), html);
  assert.equal(statSync(join(root, 'review.html')).mtimeMs, before);
}));

test('the page renders the proposal as static content', needsDom, () => fixture(root => {
  buildReview(root, { requireCurrent: true });
  const { window, document, errors } = dom(page(root));
  assert.deepEqual(errors, []);
  assert.equal(document.getElementById('script-error').hidden, true);
  assert.deepEqual([...document.querySelectorAll('#why [data-note]')].map(p => p.textContent), ['Reduce repeated work.', 'A second paragraph that wraps.']);
  const items = [...document.querySelectorAll('.item')];
  assert.deepEqual(items.map(li => li.id), ['item-1', 'item-2', 'item-3']);
  assert.equal(items[0].querySelector('[data-note="item-1"]').textContent, 'First item wraps onto an indented line and an unindented one.');
  const art = items[1].querySelector('pre.art');
  assert.equal(art.textContent, 'a ─→ b\n\nc ─→ d');
  assert.deepEqual([...art.querySelectorAll('[data-note]')].map(n => n.dataset.note), ['item-2-line-1', 'item-2-line-3']);
  assert.equal(items[2].querySelector('a').getAttribute('href'), '../wiki/README.md');
  assert.equal(items[2].querySelector('code').textContent, 'code **not bold**');
  assert.equal(document.querySelector('#changes p.aside').textContent, 'Non-goals: anything else.');
  const decisions = [...document.querySelectorAll('.decision')];
  assert.deepEqual(decisions.map(d => d.querySelector('.tag').textContent), ['asked', 'assumed', 'log']);
  assert.deepEqual(decisions.map(d => d.dataset.note), ['decision-1', 'decision-2', 'decision-3']);
  assert.match(decisions[0].textContent, /2026-09-26Asked how to draw → chose text\./);
  window.close();
}));

test('a proposal without a Decision log says no decision is recorded', () => fixture(root => {
  buildReview(root, { requireCurrent: true });
  assert.match(page(root), /No decision is recorded yet\./);
}, proposal.split('## Decision log')[0]));

test('drawings and text holding markup stay text', needsDom, () => fixture(root => {
  buildReview(root, { requireCurrent: true });
  const { window, document } = dom(page(root));
  assert.equal(window.injection, undefined);
  assert.equal(document.querySelector('[data-note="why-1"]').textContent, 'Show </script><script>window.injection=1</script> as text.');
  assert.equal(document.querySelector('#item-1 pre').textContent, '<b>not bold</b> </script><script>window.injection=2</script>');
  assert.equal(document.querySelector('#item-1 a'), null);
  window.close();
}, `## Why\n\nShow </script><script>window.injection=1</script> as text.\n\n## What Changes\n\n- [bad](javascript:alert(1)) item\n  ${fence}\n  <b>not bold</b> </script><script>window.injection=2</script>\n  ${fence}\n`));

test('invalid proposals report the item and line and keep the last page', () => fixture(root => {
  buildReview(root, { requireCurrent: true });
  const good = page(root);
  const cases = [
    [proposal.replace('**Non-goals:**', `${fence}text\nloose\n${fence}\n\n**Non-goals:**`), /proposal\.md line 23: a fence outside any bullet in ## What Changes/],
    [proposal.replace('  onto an indented line', `  onto\n\n  ${fence}text\n  after a blank line\n  ${fence}`), /proposal\.md line 15: a fence outside any bullet/],
    [proposal.replace(/  c ─→ d\n  ```\n/, '  c ─→ d\n'), /proposal\.md line 16: item 2 opens a fence that never closes/],
    [proposal.replace('## Why', '## Reason'), /missing ## Why/],
    [proposal.replace('## What Changes', '## Changes'), /missing ## What Changes/],
  ];
  for (const [source, error] of cases) {
    writeFileSync(join(root, 'proposal.md'), source);
    assert.throws(() => buildReview(root, { requireCurrent: true }), error);
    assert.equal(page(root), good);
  }
  rmSync(join(root, 'proposal.md'));
  assert.throws(() => buildReview(root), /missing .*proposal\.md/);
  assert.equal(page(root), good);
}));

test('a wide drawing line warns with its item and line and still writes', () => fixture(root => {
  const wide = 'x'.repeat(72);
  writeFileSync(join(root, 'proposal.md'), proposal.replace('  c ─→ d', `  ${wide}`));
  const result = buildReview(root, { requireCurrent: true });
  assert.equal(result.changed, true);
  assert.deepEqual(result.warnings, ['proposal.md line 19: item 2, drawing line 3 is 72 columns; keep drawings under 60, aim for 40']);
  assert.ok(page(root).includes(wide));
}));

test('a change without a page is reported and left untouched', () => fixture(root => {
  assert.deepEqual(buildReview(root), { kind: 'no-page', changed: false, warnings: [] });
  assert.equal(existsSync(join(root, 'review.html')), false);
}));

test('an older page gets a proposal-only refresh and keeps its viewer', () => fixture(root => {
  const old = '<!-- wong-review:2 -->\n<html><script type="text/markdown" id="proposal">\n<!-- proposal:start -->\nold\n<!-- proposal:end -->\n</script><script>viewer()</script></html>';
  writeFileSync(join(root, 'review.html'), old);
  writeFileSync(join(root, 'review-visuals.html'), '<section>unused</section>');
  assert.deepEqual(buildReview(root), { kind: 'proposal-only', changed: true, warnings: [] });
  const html = page(root);
  assert.ok(html.startsWith('<!-- wong-review:2 -->\n<html><script type="text/markdown" id="proposal">\n<!-- proposal:start -->\n## Why\n\nReduce repeated work.'));
  assert.ok(html.endsWith('<!-- proposal:end -->\n</script><script>viewer()</script></html>'));
  assert.match(html, /## What Changes\n\n- \*\*First item\*\*/);
  assert.doesNotMatch(html, /Decision log/);
  assert.deepEqual(buildReview(root, { requireCurrent: true }), { kind: 'proposal-only', changed: false, warnings: [] });
  writeFileSync(join(root, 'review.html'), '<html>no markers</html>');
  assert.throws(() => buildReview(root), /expected one <!-- proposal:start -->/);
  assert.equal(page(root), '<html>no markers</html>');
}));

test('the kit keeps one script, one style, its marker, and older-engine syntax', () => {
  assert.equal(kit.split('<!-- review:content -->').length, 2);
  assert.equal((kit.match(/<script\b/g) || []).length, 1);
  assert.equal((kit.match(/<style\b/g) || []).length, 1);
  assert.doesNotMatch(kit, /\?\.[\w([]|\?\?|catch\s*\{/, 'no optional chaining, nullish coalescing, or optional catch binding');
  assert.doesNotMatch(kit, /\b(?:src|href)\s*=\s*["']?(?:https?:)?\/\/|@import|url\(/i, 'no network loads');
});

test('both builder aliases run from the CLI and report failures', () => fixture(root => {
  for (const alias of ['.agents', '.claude']) {
    rmSync(join(root, 'review.html'), { force: true });
    const result = spawnSync(process.execPath, [resolve(here, `../../${alias}/skills/plan/scripts/build-review.mjs`), root, '--require-current'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'review: current, updated\n');
  }
  writeFileSync(join(root, 'proposal.md'), proposal.replace('  c ─→ d', `  ${'y'.repeat(61)}`));
  const warned = spawnSync(process.execPath, [resolve(here, '../../.claude/skills/plan/scripts/build-review.mjs'), root], { encoding: 'utf8' });
  assert.equal(warned.status, 0);
  assert.match(warned.stderr, /^review: warning: proposal\.md line 19: item 2, drawing line 3 is 61 columns/);
  rmSync(join(root, 'proposal.md'));
  const failure = spawnSync(process.execPath, [resolve(here, '../../.claude/skills/plan/scripts/build-review.mjs'), root, '--require-current'], { encoding: 'utf8' });
  assert.equal(failure.status, 1);
  assert.match(failure.stderr, /missing/);
}));
