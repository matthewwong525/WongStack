// Mermaid pictures, sketches, screens, and picture files beside text drawings on a built review page.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { buildReview, chatCopy, unsafeSvg } from '../../.agents/skills/plan/scripts/build-review.mjs';
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

// ── hand-drawn `svg` sketches: allowlisted, re-serialized, and framed like a Mermaid picture ──
const sketchSource = [
  '<svg viewBox="0 0 160 96">',
  '  <rect x="0" y="0" width="160" height="96" rx="8" fill="card" stroke="line"/>',
  '  <rect x="8" y="8" width="144" height="16" fill="muted"/>',
  '  <text x="16" y="56">Notes &amp; drafts</text>',
  '  <title>a notes screen</title>',
  '</svg>',
];
// The sketch replaces item 1's flow; its first line is proposal line 11, so line k of the sketch is line 10 + k.
const withSketch = (lines = sketchSource) => proposal.replace(`${fence}mermaid\n  flowchart LR\n    A[apply] --> B[save]`,
  `${fence}svg\n${lines.map(line => `  ${line}`).join('\n')}`);

test('an svg fence becomes a sketch picture with named colours as classes and its labels escaped', () => fixture(root => {
  assert.deepEqual(buildReview(root, { requireCurrent: true }).warnings, []);
  const html = page(root);
  const pic = /<div class="art pic sketch" data-note="item-1-picture-1" tabindex="0" style="width:([\d.]+)em">(<svg[\s\S]*?<\/svg>)<\/div>/.exec(html);
  assert.ok(pic, 'the sketch sits in the picture wrapper');
  assert.ok(Math.abs(Number(pic[1]) * 13 - 160) < 0.01, 'its width in em is the viewBox width over 13 px');
  assert.match(pic[2], /^<svg viewBox="0 0 160 96">/);
  assert.match(pic[2], /<rect class="f-card s-line" x="0" y="0" width="160" height="96" rx="8"\/>/);
  assert.match(pic[2], /<rect class="f-muted" [^>]*\/>/);
  assert.match(pic[2], /<text x="16" y="56">Notes &amp; drafts<\/text>/);
  assert.doesNotMatch(pic[2], /fill=|stroke=/, 'a named colour leaves no paint attribute');
  assert.equal((html.match(/<script\b/gi) || []).length, 2, 'still the kit\'s one script, and the switch');
}, withSketch()));

test('a sketch with a fixed colour warns that it will not follow dark mode, and still builds', () => fixture(root => {
  const result = build(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /^review: warning: proposal\.md line 10: item 1, picture 1 paints #ffffff, which will not follow dark mode; use bg, fg, muted, subtle, line, card, danger\n/);
  assert.match(page(root), /<rect fill="#ffffff" x="0"/);
}, withSketch(['<svg viewBox="0 0 80 40">', '<rect fill="#ffffff" x="0" y="0" width="80" height="40"/>', '</svg>'])));

test('a sketch wider than 640 px warns with its item and picture, and still builds', () => fixture(root => {
  const result = build(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /^review: warning: proposal\.md line 10: item 1, picture 1 is 700 px wide; keep pictures under 640: draw it narrower, or stack its parts\n/);
}, withSketch(['<svg viewBox="0 0 700 40">', '<rect x="0" y="0" width="700" height="40" fill="muted"/>', '</svg>'])));

test('Mermaid and svg pictures in one item share one count, in order', () => fixture(root => {
  buildReview(root, { requireCurrent: true });
  const html = page(root);
  assert.deepEqual([...html.matchAll(/class="art (pic(?: sketch)?)" data-note="(item-1-picture-\d+)"/g)].map(m => `${m[2]} ${m[1]}`),
    ['item-1-picture-1 pic', 'item-1-picture-2 pic sketch', 'item-1-picture-3 pic']);
}, proposal.replace(`  ${fence}\n- **Escapes`, [
  `  ${fence}`, `  ${fence}svg`, '  <svg viewBox="0 0 40 20"><rect x="0" y="0" width="40" height="20"/></svg>', `  ${fence}`,
  `  ${fence}mermaid`, '  flowchart LR', '    C --> D', `  ${fence}`, '- **Escapes'].join('\n'))));

// Each refused sketch: the source lines inside the fence, the proposal line it names, and the refused name.
const refused = [
  ['an event handler', ['<svg viewBox="0 0 10 10">', '<rect onclick="alert(1)" width="10" height="10"/>', '</svg>'], 12, 'onclick='],
  ['a link', ['<svg viewBox="0 0 10 10">', '<a><text>x</text></a>', '</svg>'], 12, '<a>'],
  ['an outside image', ['<svg viewBox="0 0 10 10">', '<image width="10" height="10"/>', '</svg>'], 12, '<image>'],
  ['a style attribute', ['<svg viewBox="0 0 10 10">', '<rect style="fill:red" width="10" height="10"/>', '</svg>'], 12, 'style='],
  ['a style element', ['<svg viewBox="0 0 10 10">', '<style>rect{}</style>', '</svg>'], 12, '<style>'],
  ['a DOCTYPE', ['<!DOCTYPE svg>', '<svg viewBox="0 0 10 10"></svg>'], 11, '<!DOCTYPE>'],
  ['a url( in a value', ['<svg viewBox="0 0 10 10">', '<rect fill="url(#g)" width="10" height="10"/>', '</svg>'], 12, 'url('],
  ['an unknown entity', ['<svg viewBox="0 0 10 10">', '<text>a&nbsp;b</text>', '</svg>'], 12, '&nbsp;'],
  ['a root without a viewBox', ['<svg width="10" height="10">', '</svg>'], 11, '<svg> without a viewBox of four numbers'],
  ['a closing tag out of order', ['<svg viewBox="0 0 10 10">', '<g>', '</svg>'], 13, '</svg> while <g> is open'],
  ['a missing end tag', ['<svg viewBox="0 0 10 10">', '<g>'], 12, '<g>, which never closes'],
  ['CDATA', ['<svg viewBox="0 0 10 10">', '<text><![CDATA[x]]></text>', '</svg>'], 12, '<![CDATA['],
];
for (const [what, lines, line, name] of refused) {
  test(`a sketch holding ${what} stops the build on one line, and the previous page stays`, () => fixture(root => {
    buildReview(root, { requireCurrent: true });
    const good = page(root);
    writeFileSync(join(root, 'proposal.md'), withSketch(lines));
    const result = build(root);
    assert.equal(result.status, 1);
    assert.equal(result.stderr, `review: proposal.md line ${line}: item 1, picture 1: a sketch can not hold ${name}; draw with shapes, text, and named colors only\n`);
    assert.equal(page(root), good);
  }));
}

// ── `screen` sketches: the look's parts as allowlisted HTML, re-serialized inside an inert box ──
const screenSource = [
  '<div class="card col gap phone">',
  '  <div class="row gap"><h3>Notes &amp; drafts</h3><span class="tag">3</span></div>',
  '  <div class="bar"></div>',
  '  <input type="text" placeholder="A question or a change">',
  '  <label><input type="checkbox" checked> Send now</label>',
  '  <div class="row gap"><span class="grow"/><button class="btn-ghost">Cancel</button><button class=\'btn-primary\'>Save</button></div>',
  '</div>',
];
const withScreen = (lines = screenSource) => withSketch(lines).replace(`${fence}svg`, `${fence}screen`);

test('a screen fence becomes a phone-wide sketch of the look\'s parts, written out again inside an inert box', () => fixture(root => {
  assert.deepEqual(buildReview(root, { requireCurrent: true }).warnings, []);
  const html = page(root);
  const pic = /<div class="art pic screen" data-note="item-1-picture-1" tabindex="0" style="width:([\d.]+)em"><div class="sk" inert>([\s\S]*?)<\/div><\/div><\/details>/.exec(html);
  assert.ok(pic, 'the screen sits in the picture wrapper with an inert box');
  assert.ok(Math.abs(Number(pic[1]) * 13 - 360) < 0.01, 'a phone screen is 360 px in em');
  assert.match(pic[2], /^<div class="card col gap phone">\s*<div class="row gap"><h3>Notes &amp; drafts<\/h3><span class="tag">3<\/span><\/div>/);
  assert.match(pic[2], /<div class="sk-bar"><\/div>/, 'the gray bar is renamed apart from the page\'s footer');
  assert.match(pic[2], /<input type="text" placeholder="A question or a change">/);
  assert.match(pic[2], /<input type="checkbox" checked> Send now<\/label>/);
  assert.match(pic[2], /<span class="grow"><\/span><button class="btn-ghost">Cancel<\/button><button class="btn-primary">Save<\/button>/);
  assert.equal((html.match(/<script\b/gi) || []).length, 2, 'still the kit\'s one script, and the switch');
}, withScreen()));

test('a screen with no phone class fills the frame, with no width set', () => fixture(root => {
  assert.deepEqual(buildReview(root, { requireCurrent: true }).warnings, []);
  assert.match(page(root), /<div class="art pic screen" data-note="item-1-picture-1" tabindex="0"><div class="sk" inert><div class="card"><p>Wide<\/p><\/div><\/div>/);
}, withScreen(['<div class="card"><p>Wide</p></div>'])));

test('Mermaid, svg, and screen pictures in one item share one count, in order', () => fixture(root => {
  buildReview(root, { requireCurrent: true });
  assert.deepEqual([...page(root).matchAll(/class="art (pic(?: \w+)?)" data-note="(item-1-picture-\d+)"/g)].map(m => `${m[2]} ${m[1]}`),
    ['item-1-picture-1 pic', 'item-1-picture-2 pic screen', 'item-1-picture-3 pic sketch']);
}, proposal.replace(`  ${fence}\n- **Escapes`, [
  `  ${fence}`, `  ${fence}screen`, '  <div class="card">x</div>', `  ${fence}`,
  `  ${fence}svg`, '  <svg viewBox="0 0 40 20"><rect x="0" y="0" width="40" height="20"/></svg>', `  ${fence}`, '- **Escapes'].join('\n'))));

const refusedScreens = [
  ['a style attribute', ['<div class="card">', '<p style="color:red">x</p>', '</div>'], 12, 'style='],
  ['an event handler', ['<div class="card">', '<button onclick="alert(1)">Go</button>', '</div>'], 12, 'onclick='],
  ['a bare event handler', ['<div class="card">', '<button onclick>Go</button>', '</div>'], 12, 'onclick='],
  ['a link', ['<div class="card">', '<a>Open</a>', '</div>'], 12, '<a>'],
  ['an image', ['<div class="card">', '<img>', '</div>'], 12, '<img>'],
  ['an unknown class', ['<div class="card">', '<button class="btn-primray">Save</button>', '</div>'], 12, 'class "btn-primray"'],
  ['a nested svg', ['<div class="card">', '<svg viewBox="0 0 10 10"></svg>', '</div>'], 12, '<svg>'],
  ['an id', ['<div id="x" class="card"></div>'], 11, 'id='],
  ['a file input', ['<input type="file">'], 11, 'type='],
  ['a url( in a value', ['<input placeholder="url(x)">'], 11, 'url('],
  ['an end tag on an empty element', ['<div><input></input></div>'], 11, '</input>'],
  ['a missing end tag', ['<div class="card">', '<p>x'], 12, '<p>, which never closes'],
];
for (const [what, lines, line, name] of refusedScreens) {
  test(`a screen holding ${what} stops the build on one line, and the previous page stays`, () => fixture(root => {
    buildReview(root, { requireCurrent: true });
    const good = page(root);
    writeFileSync(join(root, 'proposal.md'), withScreen(lines));
    const result = build(root);
    assert.equal(result.status, 1);
    assert.equal(result.stderr, `review: proposal.md line ${line}: item 1, picture 1: a screen can not hold ${name}; build it from the look's parts and layout classes only\n`);
    assert.equal(page(root), good);
  }));
}

// ── `picture` fences: files from the change's own folder, carried inside the page ──
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const png = (size = 64) => Buffer.concat([PNG, Buffer.alloc(size - PNG.length, 1)]);
// The fence replaces item 1's flow; its first line is proposal line 11.
const withPictures = lines => proposal.replace(`${fence}mermaid\n  flowchart LR\n    A[apply] --> B[save]`, `${fence}picture\n${lines.map(line => `  ${line}`).join('\n')}`);
const pictured = (fn, lines, files) => fixture(root => {
  mkdirSync(join(root, 'pictures'));
  for (const [name, bytes] of Object.entries(files)) writeFileSync(join(root, name), bytes);
  return fn(root);
}, withPictures(lines));

test('a labelled pair becomes two open figures with data URIs, in one picture frame with its note id', () => pictured(root => {
  assert.deepEqual(buildReview(root, { requireCurrent: true }).warnings, []);
  const html = page(root);
  const frame = /<details class="drawing" open><summary>[\s\S]*?<\/summary><div class="frame"><div class="art photo" data-note="item-1-picture-1" tabindex="0">([\s\S]*?)<\/div><\/div><\/details>/.exec(html);
  assert.ok(frame, 'the pictures sit open in one frame');
  assert.equal(frame[1], `<figure><img src="data:image/png;base64,${png().toString('base64')}" alt="Before"><figcaption>Before</figcaption></figure>`
    + `<figure><img src="data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0]).toString('base64')}" alt="After &amp; more"><figcaption>After &amp; more</figcaption></figure>`
    + `<figure><img src="data:image/webp;base64,${Buffer.from('RIFF\0\0\0\0WEBPVP8 ').toString('base64')}" alt="plain"></figure>`);
  assert.equal((html.match(/<script\b/gi) || []).length, 2, 'still the kit\'s one script, and the switch');
  assert.match(chatCopy('demo', readFileSync(join(root, 'proposal.md'), 'utf8')), /^1\. \*\*One gate\.\*\* Saving runs one check\.\n\n {3}_\(picture on the review page\)_$/m);
}, ['Before: pictures/before.png', '', 'After & more: pictures/after.jpg', 'pictures/plain.webp'],
{ 'pictures/before.png': png(), 'pictures/after.jpg': Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 'pictures/plain.webp': Buffer.from('RIFF\0\0\0\0WEBPVP8 ') }));

test('a picture fence shares the picture count with Mermaid', () => fixture(root => {
  writeFileSync(join(root, 'x.png'), png());
  buildReview(root, { requireCurrent: true });
  assert.deepEqual([...page(root).matchAll(/class="art (pic|photo)" data-note="(item-1-picture-\d+)"/g)].map(m => `${m[2]} ${m[1]}`),
    ['item-1-picture-1 pic', 'item-1-picture-2 photo']);
}, proposal.replace(`  ${fence}\n- **Escapes`, [`  ${fence}`, `  ${fence}picture`, '  x.png', `  ${fence}`, '- **Escapes'].join('\n'))));

const KB = 1024;
const SMALLER = 'take only the visible part at phone width';
test('a picture over 150 KB warns with its item, picture, and line, and still builds', () => pictured(root => {
  const result = build(root);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, `review: warning: proposal.md line 12: item 1, picture 1: big.png is 151 KB; keep pictures under 150 KB: ${SMALLER}\n`);
}, ['Small: small.png', 'big.png'], { 'small.png': png(), 'big.png': png(150 * KB + 1) }));

test('a picture of 300 KB still builds: its page stays under 500 KB', () => pictured(root => {
  const result = build(root);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(Buffer.byteLength(page(root)) <= 500 * KB);
}, ['edge.png'], { 'edge.png': png(300 * KB) }));

// Base64 makes each picture a third larger, so two 190 KB pictures make a page past the Inbox's limit.
test('a built page over 500 KB stops the build, and the previous page stays', () => pictured(root => {
  writeFileSync(join(root, 'proposal.md'), proposal);
  buildReview(root, { requireCurrent: true });
  const good = page(root);
  writeFileSync(join(root, 'proposal.md'), withPictures(['a.png', 'b.png']));
  const result = build(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, new RegExp(`^review: the page is (\\d+) KB; keep a page under 500 KB so the Inbox takes it: show fewer pictures, or ${SMALLER}\n$`));
  assert.ok(Number(/is (\d+) KB/.exec(result.stderr)[1]) > 500);
  assert.equal(page(root), good);
}, ['a.png', 'b.png'], { 'a.png': png(190 * KB), 'b.png': png(190 * KB) }));

// Each refused picture: the fence's lines, the files beside the proposal, the proposal line, and the reason.
const refusedPictures = [
  ['a web address', ['Before: https://example.com/a.png'], {}, 11, 'https://example.com/a.png is a web address; save the picture in the change\'s folder'],
  ['a data address', ['data:image/png;base64,AAAA'], {}, 11, 'data:image/png;base64,AAAA is a web address; save the picture in the change\'s folder'],
  ['a path out of the folder', ['ok.png', '../outside.png'], { 'ok.png': png() }, 12, '../outside.png is outside the change\'s folder'],
  ['an absolute path', ['/etc/hostname'], {}, 11, '/etc/hostname is outside the change\'s folder'],
  ['a missing file', ['Before: pictures/none.png'], {}, 11, 'no picture at pictures/none.png'],
  ['a text file named .png', ['notes.png'], { 'notes.png': 'not a picture' }, 11, 'notes.png is not a PNG, JPEG, or WebP picture'],
  ['a RIFF file that is not WebP', ['sound.webp'], { 'sound.webp': 'RIFF\0\0\0\0WAVEfmt ' }, 11, 'sound.webp is not a PNG, JPEG, or WebP picture'],
  ['a picture over 300 KB', ['huge.png'], { 'huge.png': png(300 * KB + 1) }, 11, `huge.png is 301 KB; keep a picture under 300 KB: ${SMALLER}`],
];
for (const [what, lines, files, line, why] of refusedPictures) {
  test(`${what} stops the build on one line naming the item and picture, and the previous page stays`, () => pictured(root => {
    writeFileSync(join(root, 'proposal.md'), proposal);
    buildReview(root, { requireCurrent: true });
    const good = page(root);
    writeFileSync(join(root, 'proposal.md'), withPictures(lines));
    const result = build(root);
    assert.equal(result.status, 1);
    assert.equal(result.stderr, `review: proposal.md line ${line}: item 1, picture 1: ${why}\n`);
    assert.equal(page(root), good);
  }, lines, files));
}

test('a link that leads out of the folder is refused like a path that does', () => pictured(root => {
  const outside = join(root, '..', 'secret.png');
  writeFileSync(outside, png());
  symlinkSync(outside, join(root, 'pictures', 'linked.png'));
  const result = build(root);
  assert.equal(result.status, 1);
  assert.equal(result.stderr, 'review: proposal.md line 11: item 1, picture 1: pictures/linked.png is outside the change\'s folder\n');
}, ['pictures/linked.png'], {}));

test('a note on a picture frame names its picture and its labels', needsDom, () => pictured(root => {
  buildReview(root, { requireCurrent: true });
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));
  const beforeParse = w => { w.document.execCommand = () => true; };
  const { window } = new JSDOM(page(root), { url: 'https://review.test/', runScripts: 'dangerously', virtualConsole, beforeParse });
  const { document } = window;
  try {
    const photo = document.querySelector('[data-note="item-1-picture-1"]');
    assert.ok(photo.classList.contains('photo'));
    assert.equal(photo.closest('details').open, true, 'pictures show at the start');
    assert.equal(photo.querySelector('.add'), null, 'a picture gets no inline + Note button');
    photo.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    document.getElementById('chip').click();
    assert.equal(document.getElementById('editor-where').textContent, '#/1 · picture 1 "Live now · Preview"');
    const box = document.querySelector('#editor textarea');
    box.value = 'This button is too small.';
    box.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.querySelector('#editor [data-act="save"]').click();
    assert.ok(photo.querySelector(':scope > .pin'), 'the note pins to the picture frame');
    assert.match(document.getElementById('copybuf').value, /^- Change #1, picture 1 \("Live now · Preview"\): This button is too small\.$/m);
    assert.deepEqual(errors, []);
  } finally { window.close(); }
}, ['Live now: live.png', 'Preview: preview.png'], { 'live.png': png(), 'preview.png': png() }));
