// Mermaid pictures, sketches, screens, and picture files beside text drawings on a built review page.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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

test('a proposal with only text fences builds each drawing as one labelled Drawing part beside its words', () => fixture(root => {
  buildReview(root, { requireCurrent: true });
  const html = page(root);
  const item = (n, words) => `<li class="item card has-view" id="item-${n}"><div class="words"><span class="num">${n}</span><div class="body">`
    + `<div class="text" data-note="item-${n}" tabindex="0">${words}</div></div></div>`
    + '<div class="view"><div class="stage"><figure class="part" data-kind="draw"><div class="clip">'
    + `<pre class="art">\n<span class="ln" data-note="item-${n}-line-1" tabindex="0">/apply ──▶ /save</span></pre></div><figcaption>Drawing</figcaption></figure></div></div></li>\n`;
  assert.ok(html.includes(item(1, '<b>One gate.</b> Saving runs one check.') + item(2, '<b>Escapes markup.</b> A bullet may quote &lt;/script&gt; as text.')));
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
    pic.closest('.part').click();
    assert.equal(document.querySelector('#viewer').hidden, false, 'a click on the part opens it full screen');
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
const withSketch = (lines = sketchSource, why = ' No real picture: the app has no page yet.') => proposal
  .replace(`${fence}mermaid\n  flowchart LR\n    A[apply] --> B[save]`, `${fence}svg\n${lines.map(line => `  ${line}`).join('\n')}`)
  .replace('runs one check.', `runs one check.${why}`);

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
const withScreen = (lines = screenSource, why) => withSketch(lines, why).replace(`${fence}svg`, `${fence}screen`);

test('a screen fence becomes a phone-wide sketch of the look\'s parts, written out again inside an inert box', () => fixture(root => {
  assert.deepEqual(buildReview(root, { requireCurrent: true }).warnings, []);
  const html = page(root);
  const pic = /<div class="art pic screen" data-note="item-1-picture-1" tabindex="0" style="width:([\d.]+)em"><div class="sk" inert>([\s\S]*?)<\/div><\/div><\/div><figcaption>/.exec(html);
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

test('labelled pictures become a part each, in their order, with data URIs and a note id each', () => pictured(root => {
  assert.deepEqual(buildReview(root, { requireCurrent: true }).warnings, []);
  const html = page(root);
  const shown = (n, label, src) => `<figure class="part" data-kind="photo"><div class="clip"><div class="art photo" data-note="item-1-picture-${n}" data-label="${label}" tabindex="0">`
    + `<img src="${src}" alt="${label}"></div></div><figcaption>${label}</figcaption></figure>`;
  assert.ok(html.includes('<div class="view"><div class="stage">' + shown(1, 'Before', `data:image/png;base64,${png().toString('base64')}`)
    + shown(2, 'After &amp; more', `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0]).toString('base64')}`)
    + shown(3, 'plain', `data:image/webp;base64,${Buffer.from('RIFF\0\0\0\0WEBPVP8 ').toString('base64')}`) + '</div></div>'), 'a part per picture, the file name for one with no label');
  assert.doesNotMatch(html, /class="tabs"|data-compare|view-tools/);
  assert.equal((html.match(/<script\b/gi) || []).length, 2, 'still the kit\'s one script, and the switch');
  assert.match(chatCopy('demo', readFileSync(join(root, 'proposal.md'), 'utf8')), /^1\. \*\*One gate\.\*\* Saving runs one check\.\n\n {3}_\(picture on the review page\)_$/m);
}, ['Before: pictures/before.png', '', 'After & more: pictures/after.jpg', 'pictures/plain.webp'],
{ 'pictures/before.png': png(), 'pictures/after.jpg': Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 'pictures/plain.webp': Buffer.from('RIFF\0\0\0\0WEBPVP8 ') }));

test('a picture fence shares the picture count with Mermaid', () => fixture(root => {
  writeFileSync(join(root, 'x.png'), png());
  buildReview(root, { requireCurrent: true });
  assert.deepEqual([...page(root).matchAll(/class="art (pic|photo)" data-note="(item-1-picture-\d+)"/g)].map(m => `${m[2]} ${m[1]}`),
    ['item-1-picture-1 pic', 'item-1-picture-2 photo']);
  assert.deepEqual([...page(root).matchAll(/data-note="(item-2-[a-z]+-\d+)"/g)].map(m => m[1]).slice(0, 1), ['item-2-line-1'], 'the next item numbers again');
}, proposal.replace(`  ${fence}\n- **Escapes`, [`  ${fence}`, `  ${fence}picture`, '  x.png', `  ${fence}`, '- **Escapes'].join('\n'))));

const KB = 1024;
const SMALLER = 'take only the visible part at phone width';
test('a picture over 150 KB warns with its item, picture, and line, and still builds', () => pictured(root => {
  const result = build(root);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, `review: warning: proposal.md line 12: item 1, picture 1: big.png is 151 KB; keep pictures under 150 KB: ${SMALLER}\n`);
}, ['Small: small.png', 'big.png'], { 'small.png': png(), 'big.png': png(150 * KB + 1) }));

test('a picture of 300 KB still builds: its page stays under 800 KB, so it gives no page warning', () => pictured(root => {
  const result = build(root);
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stderr, /the page is/);
  assert.ok(Buffer.byteLength(page(root)) <= 800 * KB);
}, ['edge.png'], { 'edge.png': png(300 * KB) }));

test('a page over 800 KB builds with a warning: it is slow on a phone', () => pictured(root => {
  const result = build(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, new RegExp(`review: warning: the page is \\d+ KB; a page over 800 KB is slow on a phone: show fewer pictures, or ${SMALLER}\n$`));
}, ['a.png', 'b.png'], { 'a.png': png(300 * KB), 'b.png': png(300 * KB) }));

// Base64 makes each picture a third larger, so four 300 KB pictures make a page past the Inbox's limit.
test('a built page over 1.5 MB stops the build, and the previous page stays', () => pictured(root => {
  writeFileSync(join(root, 'proposal.md'), proposal);
  buildReview(root, { requireCurrent: true });
  const good = page(root);
  writeFileSync(join(root, 'proposal.md'), withPictures(['a.png', 'b.png', 'c.png', 'd.png']));
  const result = build(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, new RegExp(`^review: the page is (\\d+) KB; keep a page under 1.5 MB so the Inbox takes it: show fewer pictures, or ${SMALLER}\n$`));
  assert.ok(Number(/is (\d+) KB/.exec(result.stderr)[1]) > 1536);
  assert.equal(page(root), good);
}, ['a.png'], Object.fromEntries(['a', 'b', 'c', 'd'].map(name => [`${name}.png`, png(300 * KB)]))));

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

test('a note on a picture names its picture and its label', needsDom, () => pictured(root => {
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
    assert.deepEqual([...photo.closest('.view').querySelectorAll('figcaption')].map(cap => cap.firstChild.textContent), ['Live now', 'Preview'], 'both pictures show, in order');
    assert.equal(photo.querySelector('.add'), null, 'a picture gets no inline + Note button');
    photo.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    document.getElementById('chip').click();
    assert.equal(document.getElementById('editor-where').textContent, '#/1 · picture 1 "Live now"');
    const box = document.querySelector('#editor textarea');
    box.value = 'This button is too small.';
    box.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.querySelector('#editor [data-act="save"]').click();
    assert.ok(photo.querySelector(':scope > .pin'), 'the note pins to the picture');
    assert.equal(photo.closest('.part').querySelector('figcaption').textContent, 'Live now · 1', 'the label counts the note');
    assert.match(document.getElementById('copybuf').value, /^- Change #1, picture 1 \("Live now"\): This button is too small\.$/m);
    assert.deepEqual(errors, []);
  } finally { window.close(); }
}, ['Live now: live.png', 'Preview: preview.png'], { 'live.png': png(), 'preview.png': png() }));

// ── an ad: the card a feed or story shows, from the change's own picture ──
const feedAd = ['placement: feed', 'account: Corner Shop', 'picture: feed.png', 'text: Spring sale on <b>all</b> plants.', 'headline: Spring sale', 'button: Shop now'];
const storyAd = ['placement: story', 'account: Corner Shop', 'picture: story.png', 'headline: Swipe up'];
// The ads replace item 1's flow; the first ad's first line is proposal line 11.
const withAds = (...ads) => proposal.replace(`${fence}mermaid\n  flowchart LR\n    A[apply] --> B[save]`,
  ads.map(lines => `${fence}ad\n${lines.map(line => `  ${line}`).join('\n')}`).join(`\n  ${fence}\n  `));
const advertised = (fn, ads, files = { 'feed.png': png(), 'story.png': png() }) => fixture(root => {
  for (const [name, bytes] of Object.entries(files)) writeFileSync(join(root, name), bytes);
  return fn(root);
}, withAds(...ads));

test('ad fences in one bullet draw a feed and a story card, a labelled part each, their words escaped and no link', () => advertised(root => {
  assert.deepEqual(buildReview(root, { requireCurrent: true }).warnings, []);
  const html = page(root);
  const stage = /<div class="view"><div class="stage">([\s\S]*?)<\/div><\/div><\/li>/.exec(html);
  assert.ok(stage, 'the ads sit in the item\'s view');
  assert.equal(stage[1], '<figure class="part" data-kind="photo"><div class="clip"><div class="art ad feed" data-note="item-1-picture-1" data-label="Feed" tabindex="0">'
    + '<p class="ad-account"><b>Corner Shop</b> <span>Sponsored</span></p>'
    + `<img src="data:image/png;base64,${png().toString('base64')}" alt="Spring sale">`
    + '<div class="ad-words"><p class="ad-text">Spring sale on &lt;b&gt;all&lt;/b&gt; plants.</p><b class="ad-headline">Spring sale</b><span class="ad-button">Shop now</span></div></div>'
    + '</div><figcaption>Feed</figcaption></figure>'
    + '<figure class="part" data-kind="photo"><div class="clip"><div class="art ad story" data-note="item-1-picture-2" data-label="Story" tabindex="0">'
    + '<p class="ad-account"><b>Corner Shop</b> <span>Sponsored</span></p>'
    + `<img src="data:image/png;base64,${png().toString('base64')}" alt="Swipe up">`
    + '<div class="ad-words"><b class="ad-headline">Swipe up</b></div></div></div><figcaption>Story</figcaption></figure>');
  assert.doesNotMatch(stage[1], /<a\b/);
  assert.doesNotMatch(html, /data-all|>All</);
}, [feedAd, storyAd]));

const refusedAds = [
  ['a web address picture', [feedAd.map(line => line.replace('feed.png', 'https://example.com/a.png'))], 13, 'https://example.com/a.png is a web address; save the picture in the change\'s folder'],
  ['an unknown placement', [feedAd.map(line => line.replace('feed', 'reel'))], 11, 'placement is feed or story, not reel'],
  ['no picture line', [feedAd.filter(line => !line.startsWith('picture'))], 10, 'an ad needs a picture: line'],
  ['an unknown line', [[...feedAd, 'price: 3']], 17, 'an ad takes one line each of placement, account, picture, text, headline, button'],
  ['a line given twice', [[...feedAd, 'button: Buy']], 17, 'an ad takes one line each of placement, account, picture, text, headline, button'],
];
for (const [what, ads, line, why] of refusedAds) {
  test(`an ad with ${what} stops the build on one line naming the item and line`, () => advertised(root => {
    const result = build(root);
    assert.equal(result.status, 1);
    assert.equal(result.stderr, `review: proposal.md line ${line}: item 1, picture 1: ${why}\n`);
  }, ads));
}

test('a Try it line gives the view its address, for the full screen\'s Try it link', () => pictured(root => {
  buildReview(root, { requireCurrent: true });
  assert.match(page(root), /<div class="view" data-try="https:\/\/demo\.example\.dev\/inbox\?state=empty"><div class="stage"><figure class="part" data-kind="photo">/);
}, ['After: after.png', 'Try it: https://demo.example.dev/inbox?state=empty'], { 'after.png': png() }));

test('a second picture fence\'s Try it line is dropped with a warning naming the item and the line', () => pictured(root => {
  assert.deepEqual(buildReview(root, { requireCurrent: true }).warnings,
    ['proposal.md line 16: item 1, picture 2: a card takes one Try it; dropped https://b.example.dev/']);
  assert.match(page(root), /<div class="view" data-try="https:\/\/a\.example\.dev\/">/);
}, ['After: after.png', 'Try it: https://a.example.dev/', fence, `${fence}picture`, 'Phone: after.png', 'Try it: https://b.example.dev/'], { 'after.png': png() }));

for (const [what, address] of [['an http address', 'http://demo.example.dev/'], ['a script', 'javascript:alert(1)'], ['a second link', 'https://a.example.dev/\n  Try it: https://b.example.dev/']]) {
  test(`a Try it line with ${what} stops the build`, () => pictured(root => {
    const result = build(root);
    assert.equal(result.status, 1);
    const shown = what === 'a second link' ? 'https://b.example.dev/' : address;
    assert.equal(result.stderr, `review: proposal.md line ${what === 'a second link' ? 13 : 12}: item 1, picture 1: Try it takes one https:// address, not ${shown}\n`);
  }, ['After: after.png', `Try it: ${address}`], { 'after.png': png() }));
}

// ── `live` fences: the chat's own page from a folder, its files carried inside one sealed frame ──
// The fence replaces item 1's flow; it opens on proposal line 10, where a card-wide refusal points.
const withLive = (lines = ['folder: site']) => proposal.replace(`${fence}mermaid\n  flowchart LR\n    A[apply] --> B[save]`, `${fence}live\n${lines.map(line => `  ${line}`).join('\n')}`);
const site = { 'site/index.html': '<!doctype html><html><head><link rel="stylesheet" href="style.css"></head><body><img src="logo.png" alt="Logo">'
  + '<a href="#top">Top</a><a href="mailto:hi@example.com">Mail</a><script src="app.js"></script></body></html>',
'site/style.css': 'body { background: url("logo.png"); }', 'site/app.js': 'review.answer("Blue"); const end = "</script>";', 'site/logo.png': png() };
const lived = (fn, files = site, lines) => fixture(root => {
  mkdirSync(join(root, 'site'));
  for (const [name, bytes] of Object.entries(files)) writeFileSync(join(root, name), bytes);
  return fn(root);
}, withLive(lines));
const srcdoc = html => /<iframe sandbox="allow-scripts" title="Live card 1" srcdoc="([^"]*)"><\/iframe>/.exec(html)[1]
  .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

test('a live fence carries its page, styles, script, and pictures inside one sealed frame', () => lived(root => {
  assert.deepEqual(buildReview(root, { requireCurrent: true }).warnings, []);
  const html = page(root), doc = srcdoc(html), uri = `data:image/png;base64,${png().toString('base64')}`;
  assert.match(html, /<figure class="part" data-kind="live"><div class="clip"><div class="live" data-live="item-1-live-1" data-height="640"><iframe sandbox="allow-scripts" /);
  assert.match(doc, /^<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline';[^"]*connect-src 'none'[^"]*"><script>window\.review=\{answer:function\(\)\{\}\};<\/script>/, 'a sample that calls review.answer gets a stub that sends nothing');
  assert.ok(doc.includes(`<style>body { background: url("${uri}"); }</style>`), 'the stylesheet and its picture are inside');
  assert.ok(doc.includes(`<img src="${uri}" alt="Logo">`));
  assert.ok(doc.includes('<script>review.answer("Blue"); const end = "<\\/script>";</script>'), 'the script is inside, its end tag escaped');
  assert.ok(doc.includes('<a href="#top">Top</a><a href="mailto:hi@example.com">Mail</a>'), 'a link in the page or to mail stays');
  assert.equal((html.match(/<script\b/gi) || []).length, 2, 'the card\'s scripts sit only inside its frame');
  assert.match(chatCopy('demo', readFileSync(join(root, 'proposal.md'), 'utf8')), /^1\. \*\*One gate\.\*\* Saving runs one check\.\n\n {3}_\(live page on the review page\)_$/m);
}));

// Each refused live card: its files, the fence's lines, the proposal line, and the reason.
const refusedLive = [
  ['a web picture', { 'site/index.html': '<img src="https://example.com/a.png">' }, undefined, 10, 'https://example.com/a.png is a web address; a live card loads nothing from the web: copy it into the folder'],
  ['a script from another site', { 'site/index.html': '<script src="//cdn.example.com/a.js"></script>' }, undefined, 10, '//cdn.example.com/a.js is a web address; a live card loads nothing from the web: copy it into the folder'],
  ['a link to a web page', { 'site/index.html': '<a href="https://example.com/">Shop</a>' }, undefined, 10, 'https://example.com/ is a web address; a live card loads nothing from the web: copy it into the folder'],
  ['a stylesheet import', { 'site/index.html': '<style>@import "more.css";</style>' }, undefined, 10, 'a stylesheet @import; put the styles in one file'],
  ['a path out of the folder', { 'site/index.html': '<img src="../../outside.png">' }, undefined, 10, '../../outside.png is outside the change\'s folder'],
  ['a folder out of the change', {}, ['folder: ../elsewhere'], 10, '../elsewhere/index.html is outside the change\'s folder'],
  ['no index page', {}, undefined, 10, 'no index.html in site'],
  ['a file that is not what its name says', { 'site/index.html': '<img src="logo.gif">', 'site/logo.gif': 'not a picture' }, undefined, 10, 'logo.gif is not the GIF file its name says'],
  ['an unknown line', site, ['folder: site', 'width: 300'], 12, 'a live card takes one folder: line and one height: line'],
  ['a height out of range', site, ['folder: site', 'height: 9000'], 10, 'height is a number of pixels from 200 to 4000, not 9000'],
  ['a card over 800 KB', { 'site/index.html': `<script>${'x'.repeat(801 * KB)}</script>` }, undefined, 10, /^the live card is \d+ KB; keep a live card under 800 KB: use smaller pictures$/],
];
for (const [what, files, lines, line, why] of refusedLive) {
  test(`a live card with ${what} stops the build on one line naming the item and card`, () => lived(root => {
    const result = build(root);
    assert.equal(result.status, 1);
    const said = /^review: proposal\.md line (\d+): item 1, live card 1: (.*)\n$/.exec(result.stderr);
    assert.ok(said, result.stderr);
    assert.equal(Number(said[1]), line);
    if (why instanceof RegExp) assert.match(said[2], why); else assert.equal(said[2], why);
  }, files, lines));
}

test('a live card carries an SVG, a GIF, and a font, each checked by its own bytes', () => lived(root => {
  buildReview(root, { requireCurrent: true });
  const doc = srcdoc(page(root));
  assert.ok(doc.includes(`src="data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64')}"`));
  assert.ok(doc.includes('src="data:image/gif;base64,R0lGODlh"'));
  assert.ok(doc.includes('url("data:font/woff2;base64,d09GMg==")'));
}, { 'site/index.html': '<style>@font-face { font-family: a; src: url(a.woff2); }</style><img src="a.svg"><img src="a.gif">',
  'site/a.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>', 'site/a.gif': 'GIF89a', 'site/a.woff2': 'wOF2' }));

// ── the card view: one labelled part per picture, drawing, page version, or live card, in order ──
const partsOf = html => [...html.matchAll(/<figure class="part" data-kind="(\w+)">[\s\S]*?<figcaption>([^<]*)<\/figcaption>/g)].map(m => `${m[2]} ${m[1]}`);

test('each fence in an item is a part named by its info text or its kind, in order, and a repeated name gets a number', () => fixture(root => {
  assert.deepEqual(buildReview(root, { requireCurrent: true }).warnings, []);
  const html = page(root);
  assert.deepEqual(partsOf(html.slice(html.indexOf('id="item-1"'), html.indexOf('id="item-2"'))), ['Flow draw', 'Drawing draw', 'After the change draw', 'Drawing 2 draw']);
  assert.equal((html.match(/class="view"/g) || []).length, 2, 'one view a card');
  assert.doesNotMatch(html.slice(0, html.indexOf('<script')), /class="tabs"|role="tab"|data-compare|data-all|view-tools/);
}, proposal.replace(`  ${fence}\n- **Escapes`, [
  `  ${fence}`, `  ${fence}text`, '  first', `  ${fence}`, `  ${fence}text After the change`, '  second', `  ${fence}`,
  `  ${fence}text`, '  third', `  ${fence}`, '- **Escapes'].join('\n'))));

test('a phone and a computer picture of one screen are two labelled parts', () => pictured(root => {
  buildReview(root, { requireCurrent: true });
  assert.deepEqual(partsOf(page(root)).slice(0, 3), ['Inbox, phone photo', 'Inbox, computer photo', 'After photo']);
}, ['Inbox, phone: p.png', 'Inbox, computer: c.png', 'After: a.png'], { 'p.png': png(), 'c.png': png(), 'a.png': png() }));

test('a live After card beside a Before picture gives two labelled parts', () => fixture(root => {
  mkdirSync(join(root, 'site'));
  for (const [name, bytes] of Object.entries({ ...site, 'before.png': png() })) writeFileSync(join(root, name), bytes);
  assert.deepEqual(buildReview(root, { requireCurrent: true }).warnings, []);
  assert.deepEqual(partsOf(page(root)).slice(0, 2), ['Before photo', 'After live']);
}, proposal.replace(`${fence}mermaid\n  flowchart LR\n    A[apply] --> B[save]`, `${fence}picture\n  Before: before.png\n  ${fence}\n  ${fence}live After\n  folder: site`)));

test('a screen sketch with no real picture and no reason warns, and builds', () => fixture(root => {
  assert.deepEqual(buildReview(root, { requireCurrent: true }).warnings, ['proposal.md line 10: item 1: a screen sketch with no real picture: '
    + 'run the prototype with sample data, or add a line "No real picture: <the step that failed>"']);
}, withScreen(['<div class="card"><p>Wide</p></div>'], '')));

test('a screen sketch beside a real picture gives no warning', () => fixture(root => {
  writeFileSync(join(root, 'a.png'), png());
  assert.deepEqual(buildReview(root, { requireCurrent: true }).warnings, []);
}, withScreen(['<div class="card"><p>Wide</p></div>'], '').replace(`  ${fence}\n- **Escapes`, `  ${fence}\n  ${fence}picture\n  After: a.png\n  ${fence}\n- **Escapes`)));

// ── `page` fences: a whole page, such as an email, a part a version; it runs nothing and its links go nowhere ──
const email = '<!doctype html><html><head><style>body { background: url("top.png"); }</style></head>'
  + '<body><img src="top.png" alt="Top"><a href="https://shop.example.com/sale">Shop the sale</a></body></html>';
const withPage = (lines = ['A: a.html', 'B: b.html']) => proposal.replace(`${fence}mermaid\n  flowchart LR\n    A[apply] --> B[save]`, `${fence}page\n${lines.map(line => `  ${line}`).join('\n')}`);
const paged = (fn, files = { 'a.html': email, 'b.html': email.replace('Shop', 'See').replace('<body>', '<body background="top.png">'), 'top.png': png() }, lines) => fixture(root => {
  for (const [name, bytes] of Object.entries(files)) writeFileSync(join(root, name), bytes);
  return fn(root);
}, withPage(lines));
const docs = html => [...html.matchAll(/<iframe sandbox="allow-scripts" tabindex="-1" title="[^"]*" srcdoc="([^"]*)"><\/iframe>/g)]
  .map(m => m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));

test('a page fence draws each version in a frame that runs nothing, a labelled part each, its links kept but inert', () => paged(root => {
  assert.deepEqual(buildReview(root, { requireCurrent: true }).warnings, []);
  const html = page(root), uri = `data:image/png;base64,${png().toString('base64')}`;
  assert.deepEqual(partsOf(html.slice(0, html.indexOf('id="item-2"'))), ['A page', 'B page']);
  assert.match(html, /<div class="page" data-note="item-1-picture-1" data-label="A" tabindex="0"><iframe /);
  assert.match(html, /<div class="page" data-note="item-1-picture-2" data-label="B" tabindex="0"><iframe /);
  const [a, b] = docs(html);
  const scripts = [...a.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  assert.equal(scripts.length, 1, 'a page holds only the kit\'s script');
  assert.match(scripts[0], /type:"review:page",h:document\.documentElement\.scrollHeight/);
  const hash = createHash('sha256').update(scripts[0]).digest('base64');
  assert.ok(a.startsWith(`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${hash}'; `
    + "style-src 'unsafe-inline'; img-src data:;"), 'only the kit\'s script may run, by its hash');
  assert.ok(a.includes(`<img src="${uri}" alt="Top">`) && a.includes(`url("${uri}")`), 'its pictures are inside');
  assert.ok(a.includes('<a data-href="https://shop.example.com/sale" title="https://shop.example.com/sale">Shop the sale</a>'), 'a link keeps its look, not its address');
  assert.ok(b.includes('>See the sale</a>'));
  assert.ok(b.includes(`<body background="${uri}">`), 'a background picture is carried too');
  assert.equal((html.match(/<script\b/gi) || []).length, 2, 'a page adds no script');
  assert.match(chatCopy('demo', readFileSync(join(root, 'proposal.md'), 'utf8')), /^ {3}_\(page on the review page\)_$/m);
}));

// Each refused page: its files, the proposal line, and the reason.
const refusedPages = [
  ['a script', { 'a.html': '<p>Hi</p><script>alert(1)</script>' }, 'a.html: it holds a <script>; a page runs nothing, so a page that needs a script is a live card'],
  ['an on… attribute', { 'a.html': '<img src="x.png" onerror="alert(1)">' }, 'a.html: it holds an on… attribute; a page runs nothing'],
  ['a javascript: link', { 'a.html': '<a href="javascript:alert(1)">Go</a>' }, 'a.html: it holds a javascript: address; a page runs nothing'],
  ['a web picture', { 'a.html': '<img src="https://example.com/a.png">' }, 'a.html: https://example.com/a.png is a web address; a page card loads nothing from the web: copy it into the folder'],
  ['a web background picture', { 'a.html': '<table><tr><td background="https://example.com/bg.png">Hi</td></tr></table>' },
    'a.html: https://example.com/bg.png is a web address; a page card loads nothing from the web: copy it into the folder'],
  ['a file out of the folder', {}, '../a.html is outside the change\'s folder', ['A: ../a.html']],
  ['a file over 300 KB', { 'a.html': `<p>${'x'.repeat(300 * KB)}</p>` }, 'a.html: 301 KB; keep a page file under 300 KB'],
  ['a line with no label', { 'a.html': '<p>Hi</p>' }, 'a page takes one "<label>: <file>.html" line a version', ['a.html']],
];
for (const [what, files, why, lines = ['A: a.html']] of refusedPages) {
  test(`a page with ${what} stops the build on one line naming the item and picture`, () => paged(root => {
    const result = build(root);
    assert.equal(result.status, 1);
    assert.equal(result.stderr, `review: proposal.md line 11: item 1, picture 1: ${why}\n`);
  }, files, lines));
}

// ── a `pictures:` question: a pick between pictures is asked in the chat, never on the page ──
const withPicks = files => proposal.replace(`  ${fence}\n- **Escapes`, `  ${fence}\n  ${fence}form\n  pictures: Top picture | ${files}\n  ${fence}\n- **Escapes`);
test('a pictures question in a card stops the build and says to ask it in the chat', () => fixture(root => {
  for (const name of ['a.png', 'b.png']) writeFileSync(join(root, name), png());
  const result = build(root);
  assert.equal(result.status, 1);
  assert.equal(result.stderr, 'review: proposal.md line 14: item 1: a review page asks no questions; ask "Top picture" in the chat as a question card\n');
}, withPicks('a.png, b.png')));
