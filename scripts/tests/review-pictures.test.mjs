// Mermaid pictures beside text drawings on a built review page.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { buildReview, unsafeSvg } from '../../.agents/skills/plan/scripts/build-review.mjs';
import { needs } from './fixtures/needs.mjs';

let JSDOM, VirtualConsole;
try { ({ JSDOM, VirtualConsole } = await import('jsdom')); } catch { /* reported by needsDom */ }
const needsDom = needs(!JSDOM, 'jsdom cannot be resolved — run `npm ci` in scripts/tests/ to run the review page checks');

const builder = resolve(import.meta.dirname, '../../.claude/skills/plan/scripts/build-review.mjs');
const fence = '```';
// Item 1 holds a flow; item 2 a text drawing. The flow's second line is proposal line 12.
const proposal = `# Demo

## Why

A reviewer sees flows.

## What Changes

- **One gate.** Saving runs one check.
  ${fence}mermaid
  flowchart LR
    A[apply] --> B[save]
  ${fence}
- **Escapes markup.** A bullet may quote </script> as text.
  ${fence}text
  /apply ──▶ /save
  ${fence}

## Decision log

- **2026-10-17** — Assumed: pictures draw at build time.
`;
const textOnly = proposal.replace(`${fence}mermaid\n  flowchart LR\n    A[apply] --> B[save]`, `${fence}text\n  /apply ──▶ /save`);

function fixture(fn, source = proposal) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-pictures-'));
  const root = join(dir, 'demo');
  mkdirSync(root);
  writeFileSync(join(root, 'proposal.md'), source);
  try { return fn(root); } finally { rmSync(dir, { recursive: true, force: true }); }
}
const page = root => readFileSync(join(root, 'review.html'), 'utf8');
const build = root => spawnSync(process.execPath, [builder, root, '--require-current'], { encoding: 'utf8' });
const withFlow = flow => proposal.replace('    A[apply] --> B[save]', flow.split('\n').map(line => `    ${line}`).join('\n'));

test('a Mermaid fence becomes an inline SVG picture with its note id, adding no script', () => fixture(root => {
  assert.deepEqual(buildReview(root, { requireCurrent: true }).warnings, []);
  const html = page(root);
  assert.match(html, /<div class="art pic" data-note="item-1-picture-1" tabindex="0" style="width:[\d.]+em"><svg [^>]*class="pele pele-flowchart"/);
  assert.match(html, />apply<\/text>[\s\S]*>save<\/text>/);
  assert.equal((html.match(/<script\b/gi) || []).length, 2, 'still the kit\'s one script, and the switch');
  assert.doesNotMatch(html, /item-1-line-/, 'a picture takes no line numbers');
  assert.match(html, /data-note="item-2-line-1"/, 'the text drawing keeps its lines');
}));

test('a second build of a Mermaid proposal changes no bytes', () => fixture(root => {
  buildReview(root, { requireCurrent: true });
  const first = page(root);
  assert.deepEqual(buildReview(root, { requireCurrent: true }), { kind: 'current', changed: false, warnings: [] });
  assert.equal(page(root), first);
}));

test('a proposal with only text fences builds its drawings exactly as before pictures', () => fixture(root => {
  buildReview(root, { requireCurrent: true });
  const html = page(root);
  const fold = line => '<details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary>'
    + `<div class="frame"><pre class="art">\n${line}</pre></div></details></li>\n`;
  assert.ok(html.includes('<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>One gate.</b> Saving runs one check.</div></div>'
    + fold('<span class="ln" data-note="item-1-line-1" tabindex="0">/apply ──▶ /save</span>')
    + '<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Escapes markup.</b> A bullet may quote &lt;/script&gt; as text.</div></div>'
    + fold('<span class="ln" data-note="item-2-line-1" tabindex="0">/apply ──▶ /save</span>')));
  assert.doesNotMatch(html, /<svg\b|class="art pic"/);
}, textOnly));

test('a Mermaid mistake exits on one line naming the item and line, and keeps the previous page', () => fixture(root => {
  buildReview(root, { requireCurrent: true });
  const good = page(root);
  writeFileSync(join(root, 'proposal.md'), withFlow('A[apply] --> B[[['));
  const result = build(root);
  assert.equal(result.status, 1);
  // Pele's message runs four lines (message, source, caret, expected tokens); the report keeps the first.
  assert.equal(result.stderr, 'review: proposal.md line 12: item 1, picture 1: Parse error on line 2\n');
  assert.equal(page(root), good);
}));

test('a wide picture warns with its item and still writes', () => fixture(root => {
  const row = Array.from({ length: 9 }, (_, i) => `S${i}[step number ${i}]`).join(' --> ');
  writeFileSync(join(root, 'proposal.md'), withFlow(row));
  const result = build(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /^review: warning: proposal\.md line 10: item 1, picture 1 is \d+ px wide; keep pictures under 640: fewer boxes in a row, or shorter labels\n/);
  assert.match(page(root), /data-note="item-1-picture-1"/);
}));

test('two pictures and two text drawings in one item keep separate counts, in order', () => fixture(root => {
  writeFileSync(join(root, 'proposal.md'), proposal.replace(`  ${fence}mermaid\n  flowchart LR\n    A[apply] --> B[save]\n  ${fence}\n`, [
    `${fence}text`, 'first screen', fence, `${fence}mermaid`, 'flowchart LR', '  A[one] --> B[two]', fence,
    `${fence}text`, 'second screen', 'more screen', fence, `${fence}Mermaid`, 'stateDiagram-v2', '  [*] --> Draft', fence, '',
  ].map(line => line && `  ${line}`).join('\n')));
  buildReview(root, { requireCurrent: true });
  const html = page(root);
  // Text lines number across the item, skipping pictures; pictures count 1, 2 per item;
  // the fence name matches in any case.
  assert.deepEqual([...html.matchAll(/data-note="(item-1-(?:line|picture)-\d+)"/g)].map(m => m[1]),
    ['item-1-line-1', 'item-1-picture-1', 'item-1-line-2', 'item-1-line-3', 'item-1-picture-2']);
  assert.match(html, /data-note="item-1-picture-2"[^>]*><svg [^>]*pele-state/);
}));

test('a picture wrapper is as wide in em at 13px as its SVG is in px', () => fixture(root => {
  buildReview(root, { requireCurrent: true });
  const m = /style="width:([\d.]+)em"><svg [^>]*\bwidth="([\d.]+)"/.exec(page(root));
  assert.ok(m, 'wrapper width and svg width');
  assert.ok(Math.abs(Number(m[1]) * 13 - Number(m[2])) < 0.01, `${m[1]}em × 13 ≈ ${m[2]}px`);
}));

test('picture labels stay text: markup is escaped, a click line draws no link, and a label naming src= or url( draws', () => fixture(root => {
  writeFileSync(join(root, 'proposal.md'), withFlow('A["a < b & c"] --> B["<script>alert(1)</script>"]\nC[src=x] --> D["url(x)"] --> E["href=y"]\nclick A "https://example.com" "go"'));
  assert.deepEqual(buildReview(root, { requireCurrent: true }).warnings, []);
  const html = page(root);
  assert.match(html, />a &lt; b &amp; c<\/text>/);
  assert.match(html, />src=x<\/text>[\s\S]*>url\(x\)<\/text>[\s\S]*>href=y<\/text>/);
  assert.equal((html.match(/<script\b/gi) || []).length, 2, 'only the kit\'s one script, and the switch');
  assert.doesNotMatch(/<svg [\s\S]*?<\/svg>/.exec(html)[0], /\shref=|<a\b/);
}));

test('the safety check refuses unsafe markup, not label text', () => {
  assert.equal(unsafeSvg('<svg><text>src=x url(y) href=z &lt;script&gt;</text><title>&lt;style&gt;</title></svg>'), undefined);
  assert.equal(unsafeSvg('<svg><image href="https://x.test/a.png"/></svg>'), 'href=');
  assert.equal(unsafeSvg('<svg><rect style="fill:url(https://x.test)"/></svg>'), 'url(');
  assert.equal(unsafeSvg('<svg><img src=x></svg>'), 'src=');
  assert.equal(unsafeSvg('<svg><script>alert(1)</script></svg>'), '<script');
  assert.equal(unsafeSvg('<svg><foreignObject><div/></foreignObject></svg>'), '<foreignObject');
});

test('a picture takes a whole-picture note named Change #1, picture 1', needsDom, () => fixture(root => {
  buildReview(root, { requireCurrent: true });
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));
  // jsdom has no clipboard command; the page falls back to it on save.
  const beforeParse = w => { w.document.execCommand = () => true; };
  const { window } = new JSDOM(page(root), { url: 'https://review.test/', runScripts: 'dangerously', virtualConsole, beforeParse });
  const { document } = window;
  try {
    assert.deepEqual(errors, []);
    const pic = document.querySelector('[data-note="item-1-picture-1"]');
    assert.ok(pic.classList.contains('art') && pic.classList.contains('pic'));
    assert.ok(pic.querySelector('svg'), 'the picture is inline SVG');
    assert.equal(pic.querySelector('.add'), null, 'a picture gets no inline + Note button');
    pic.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    assert.equal(document.getElementById('chip').hidden, false);
    document.getElementById('chip').click();
    assert.equal(document.getElementById('editor-where').textContent, '#/1 · picture 1 "apply save"');
    const box = document.querySelector('#editor textarea');
    box.value = 'Add a check step.';
    box.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.querySelector('#editor [data-act="save"]').click();
    assert.ok(pic.querySelector(':scope > .pin'), 'the note pins to the picture wrapper');
    assert.match(document.getElementById('copybuf').value, /^- Change #1, picture 1 \("apply save"\): Add a check step\.$/m);
    assert.equal(document.querySelector('#viewer .vhint').textContent, 'Drag to move · pinch or + to zoom · tap a line or picture to note it');
    assert.deepEqual(errors, []);
  } finally { window.close(); }
}));
