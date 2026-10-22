import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { assemble, buildReview, NEXT_STEP, notesHeader, planActions, planLink } from '../../.agents/skills/plan/scripts/build-review.mjs';
import { fakePaseo, fakeTunnel, ORIGIN, TUNNEL_ENV } from './fixtures/fake-tunnel.mjs';
import { needs } from './fixtures/needs.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const kit = readFileSync(resolve(here, '../../.agents/skills/plan/references/review-kit.html'), 'utf8');
// jsdom comes from scripts/tests/node_modules (`npm ci` there).
let JSDOM, VirtualConsole;
try { ({ JSDOM, VirtualConsole } = await import('jsdom')); } catch { /* reported by needsDom */ }
const needsDom = needs(!JSDOM, 'jsdom cannot be resolved — run `npm ci` in scripts/tests/ to run the review page checks');

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
- **2026-09-26** — Check: \`app/vitest.config.ts\` lowers a limit, because a reason.
`;

function fixture(fn, source = proposal) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-review-'));
  const root = join(dir, 'example');
  mkdirSync(root);
  writeFileSync(join(root, 'proposal.md'), source);
  try { return fn(root); } finally { rmSync(dir, { recursive: true, force: true }); }
}

function page(root) { return readFileSync(join(root, 'review.html'), 'utf8'); }
// An element's text without the Note button the script adds to it.
function text(el) {
  const copy = el.cloneNode(true);
  copy.querySelectorAll('.add').forEach(add => add.remove());
  return copy.textContent;
}

function dom(html) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));
  const window = new JSDOM(html, { url: 'https://review.test/', runScripts: 'dangerously', virtualConsole }).window;
  return { window, document: window.document, errors };
}
/** Waits for the page's load, when the inbox greets its frame and theme.js has drawn the switch. */
const loaded = window => window.document.readyState === 'complete' ? null : new Promise(done => window.addEventListener('load', done));

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
  assert.deepEqual([...document.querySelectorAll('#why [data-note]')].map(text), ['Reduce repeated work.', 'A second paragraph that wraps.']);
  const items = [...document.querySelectorAll('.item')];
  assert.deepEqual(items.map(li => li.id), ['item-1', 'item-2', 'item-3']);
  assert.equal(text(items[0].querySelector('[data-note="item-1"]')), 'First item wraps onto an indented line and an unindented one.');
  assert.deepEqual([...document.querySelectorAll('[data-note] > .add')].map(add => add.dataset.open),
    ['why-1', 'why-2', 'item-1', 'item-2', 'item-3', 'decision-1', 'decision-2', 'decision-3', 'decision-4'], 'every text target has a Note button');
  const art = items[1].querySelector('pre.art');
  assert.equal(art.textContent, 'a ─→ b\n\nc ─→ d');
  const fold = art.closest('details.drawing');
  assert.equal(fold.parentElement, items[1], 'the drawing spans the item, outside its text column');
  assert.equal(fold.open, false, 'the drawing starts folded');
  assert.equal(fold.querySelector('summary .show').textContent, 'Show drawing');
  assert.equal(art.querySelector('.add'), null, 'drawing lines get no Note button');
  assert.deepEqual([...art.querySelectorAll('[data-note]')].map(n => n.dataset.note), ['item-2-line-1', 'item-2-line-3']);
  assert.equal(items[2].querySelector('a').getAttribute('href'), '../wiki/README.md');
  assert.equal(items[2].querySelector('code').textContent, 'code **not bold**');
  assert.equal(document.querySelector('#changes p.aside').textContent, 'Non-goals: anything else.');
  const decisions = [...document.querySelectorAll('.decision')];
  assert.deepEqual(decisions.map(d => d.querySelector('.tag').textContent), ['asked', 'assumed', 'log', 'check']);
  assert.deepEqual(decisions.map(d => d.dataset.note), ['decision-1', 'decision-2', 'decision-3', 'decision-4']);
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
  assert.equal(text(document.querySelector('[data-note="why-1"]')), 'Show </script><script>window.injection=1</script> as text.');
  assert.equal(document.querySelector('#item-1 pre').textContent, '<b>not bold</b> </script><script>window.injection=2</script>');
  assert.equal(document.querySelector('#item-1 a'), null);
  window.close();
}, `## Why\n\nShow </script><script>window.injection=1</script> as text.\n\n## What Changes\n\n- [bad](javascript:alert(1)) item\n  ${fence}\n  <b>not bold</b> </script><script>window.injection=2</script>\n  ${fence}\n`));

// A bullet holding a table, then pipes with no separator row, which stay the bullet's text.
const tabled = `## Why\n\nCompare.\n\n## What Changes\n\n- **Two ways.** Pick one.
  | way | login |
  |:----|------:|
  | local | **none** </script><script>window.injection=3</script> |
  | sync \\| cloud | needed |
- **Stray pipes** read | a | b |
  | c | d |
`;

test('a Markdown table in a bullet becomes a page table with a note target per body row', needsDom, () => fixture(root => {
  assert.deepEqual(buildReview(root, { requireCurrent: true }).warnings, []);
  const html = page(root);
  assert.match(html, /<div class="table"><table class="tbl"><thead><tr><th>way<\/th><th>login<\/th><\/tr><\/thead><tbody><tr data-note="item-1-row-1" tabindex="0">/);
  const { window, document } = dom(html);
  assert.equal(window.injection, undefined, 'a cell holding </script> stays text');
  const rows = [...document.querySelectorAll('#item-1 tbody tr')];
  assert.deepEqual(rows.map(row => row.dataset.note), ['item-1-row-1', 'item-1-row-2']);
  assert.deepEqual(rows.map(row => [...row.cells].map(text)), [['local', 'none </script><script>window.injection=3</script>'], ['sync | cloud', 'needed']]);
  assert.equal(rows[0].querySelector('b').textContent, 'none', 'cells take inline formatting');
  assert.equal(rows[0].lastElementChild.lastElementChild.className, 'add', 'a row\'s Note button sits in its last cell');
  assert.equal(text(document.querySelector('[data-note="item-1"]')), 'Two ways. Pick one.');
  assert.equal(document.querySelector('#item-2 table'), null, 'pipes without a separator row stay text');
  assert.equal(text(document.querySelector('[data-note="item-2"]')), 'Stray pipes read | a | b | | c | d |');
  window.close();
}, tabled));

test('a row note names its change and row, with the row\'s cells', needsDom, () => fixture(root => {
  buildReview(root, { requireCurrent: true });
  const { window, document, errors } = dom(page(root));
  document.querySelector('.add[data-open="item-1-row-2"]').click();
  assert.equal(document.getElementById('editor-where').textContent, '#/1 · row 2 "sync | cloud · needed"');
  assert.deepEqual(errors, []);
  window.close();
}, tabled));

test('invalid proposals report the item and line and keep the last page', () => fixture(root => {
  buildReview(root, { requireCurrent: true });
  const good = page(root);
  const cases = [
    [proposal.replace('**Non-goals:**', `${fence}text\nloose\n${fence}\n\n**Non-goals:**`), /proposal\.md line 23: a fence outside any bullet in ## What Changes/],
    [proposal.replace('  onto an indented line', `  onto\n\n  ${fence}text\n  after a blank line\n  ${fence}`), /proposal\.md line 15: a fence outside any bullet/],
    [proposal.replace('  onto an indented line', '  onto\n\n  | a | b |\n  |-|-|\n  | c | d |'), /proposal\.md line 15: a table outside any bullet in ## What Changes \(a blank line ends a bullet\)/],
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
  assert.deepEqual(result.warnings, ['proposal.md line 19: item 2, drawing line 3 is 72 columns; keep drawings under 60: aim for 40, up to 56 side by side']);
  assert.ok(page(root).includes(wide));
}));

// Swap item 2's drawing (proposal lines 17-19) for these lines; the first lands on proposal line 17.
function withDrawing(lines) {
  return proposal.replace('  a ─→ b\n\n  c ─→ d', lines.map(line => `  ${line}`).join('\n'));
}
const boxWarnings = lines => fixture(root => {
  writeFileSync(join(root, 'proposal.md'), withDrawing(lines));
  const result = buildReview(root, { requireCurrent: true });
  assert.equal(result.changed, true);
  return result.warnings;
});

test('a box edge one column right of its corner warns once with the item and line', () => {
  assert.deepEqual(boxWarnings(['┌─────────────┐', '│ lined up    │', '│ one too far  │', '│ and again    │', '└─────────────┘']),
    ['proposal.md line 19: item 2, drawing line 3 has a box edge at column 16, but its corner is at column 15']);
});

test('a short bottom edge warns', () => {
  assert.deepEqual(boxWarnings(['┌──────┐', '│ box  │', '└─────┘']),
    ['proposal.md line 19: item 2, drawing line 3 has a box edge at column 7, but its corner is at column 8']);
});

test('lined-up nested, side-by-side, and split boxes do not warn', () => {
  assert.deepEqual(boxWarnings([
    '┌──────────────┐', '│ ┌──────────┐ │', '│ │  inside  │ │', '│ └──────────┘ │', '└──────────────┘',
    '┌──────┐  ┌──────┐', '│ one  │  │ two  │', '├──────┤  └──────┘', '│ more │', '└──────┘',
    '    ┌───┴───┐', '    ▼       ▼', ' cached   fresh',
  ]), []);
});

test('plain-text boxes and a 56-column line do not warn', () => {
  assert.deepEqual(boxWarnings(['+--------+', '| plain   |', '+-------+', 'x'.repeat(56)]), []);
});

// The base proposal holds one code span (item 3); these add spans to What Changes.
function withSpans(count, inDrawing = 0) {
  const spans = Array.from({ length: count }, (_, i) => `\`file-${i}.md\``).join(' ');
  const drawn = Array.from({ length: inDrawing }, (_, i) => `\`drawn-${i}\``).join(' ');
  return proposal.replace('- **Third item**', `- **Many files** ${spans}\n- **Third item**`).replace('  c ─→ d', `  c ─→ d ${drawn}`);
}

test('more than 12 code spans in Why and What Changes warn with the count and still write', () => fixture(root => {
  writeFileSync(join(root, 'proposal.md'), withSpans(12));
  const result = buildReview(root, { requireCurrent: true });
  assert.equal(result.changed, true);
  assert.deepEqual(result.warnings, ['Why and What Changes name 13 files or commands; move them to the design and tasks']);
  assert.ok(page(root).includes('file-11.md'));
}));

test('12 code spans, or spans inside a drawing, do not warn', () => fixture(root => {
  writeFileSync(join(root, 'proposal.md'), withSpans(11, 5));
  assert.deepEqual(buildReview(root, { requireCurrent: true }).warnings, []);
}));

test('a change without a page is reported and left untouched', () => fixture(root => {
  assert.deepEqual(buildReview(root), { kind: 'no-page', changed: false, warnings: [] });
  assert.equal(existsSync(join(root, 'review.html')), false);
  const cli = spawnSync(process.execPath, [resolve(here, '../../.claude/skills/plan/scripts/build-review.mjs'), root], { encoding: 'utf8' });
  assert.equal(cli.stdout, 'review: no-page, unchanged\n', 'no link or next-step line when there is no page');
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
  assert.ok(kit.indexOf('/* look */') > kit.indexOf('<style>') && kit.indexOf('/* look */') < kit.indexOf('</style>'), 'the look marker sits in the one style');
  assert.ok(kit.indexOf('<!-- theme -->') > kit.indexOf('</style>') && kit.indexOf('<!-- theme -->') < kit.indexOf('</head>'), 'the switch goes in <head>, before the first paint');
  assert.doesNotMatch(/<style>([\s\S]*?)<\/style>/.exec(kit)[1], /#[0-9a-f]{3,8}\b|rgba?\(|text-transform/i, 'every colour is the app\'s, and labels stay in sentence case');
});

test('the built page carries the app\'s colours and parts in its one style, and still fetches nothing', () => fixture(root => {
  buildReview(root, { requireCurrent: true });
  const html = page(root);
  const style = /<style>([\s\S]*?)<\/style>/.exec(html)[1];
  assert.equal((html.match(/<style\b/g) || []).length, 1);
  assert.doesNotMatch(style, /\/\* look \*\//, 'the marker is filled');
  const app = readFileSync(resolve(here, '../../app/src/index.css'), 'utf8');
  assert.ok(style.includes(`--primary: ${/\n:root \{[^}]*--primary:\s*([^;]+);/.exec(app)[1]};`), 'the app\'s light primary');
  assert.doesNotMatch(style, /prefers-color-scheme/, 'light to start on every device');
  assert.match(style, /color-scheme: light;/);
  const dark = /\n\.dark \{([^}]*)\}/.exec(app)[1];
  assert.ok(style.includes(`--background: ${/--background:\s*([^;]+);/.exec(dark)[1]};`), 'the app\'s dark set, under .dark');
  assert.ok(style.includes('.theme-toggle {'), 'the switch\'s look');
  // The switch: one script in <head>, ahead of the kit's own, so a saved dark choice paints dark from the start.
  const head = html.slice(0, html.indexOf('</head>'));
  assert.equal((html.match(/<script\b/g) || []).length, 2);
  assert.equal((head.match(/<script\b/g) || []).length, 1);
  assert.match(head, /localStorage\.getItem\(KEY\)[\s\S]*classList\.toggle\('dark'/);
  assert.doesNotMatch(html, /<!-- theme -->/, 'the marker is filled');
  assert.throws(() => assemble('x', '', kit.replace('<!-- theme -->', '')), /review kit: expected one <!-- theme -->/);
  for (const part of [':where(button, .btn)', ':where(.card)', ':where(.tag)']) assert.ok(style.includes(part), part);
  assert.ok(style.indexOf(':where(.card)') < style.indexOf('.bar {'), 'the look first, then the kit\'s own rules');
  assert.doesNotMatch(html, /\b(?:src|href)\s*=\s*["']?(?:https?:)?\/\/|@import|url\(/i, 'no network loads');
  assert.throws(() => assemble('x', '', kit.replace('/* look */', '')), /review kit: expected one \/\* look \*\//);
}));

test('both builder aliases run from the CLI and report failures', () => fixture(root => {
  for (const alias of ['.agents', '.claude']) {
    rmSync(join(root, 'review.html'), { force: true });
    const result = spawnSync(process.execPath, [resolve(here, `../../${alias}/skills/plan/scripts/build-review.mjs`), root, '--require-current'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, `review: current, updated\n${planLink(join(resolve(root), 'review.html'))}\n\n${NEXT_STEP}\n`, 'the link line, a blank line, then the next-step line, end the output');
  }
  writeFileSync(join(root, 'proposal.md'), proposal.replace('  c ─→ d', `  ${'y'.repeat(61)}`));
  const warned = spawnSync(process.execPath, [resolve(here, '../../.claude/skills/plan/scripts/build-review.mjs'), root], { encoding: 'utf8' });
  assert.equal(warned.status, 0);
  assert.match(warned.stderr, /^review: warning: proposal\.md line 19: item 2, drawing line 3 is 61 columns; keep drawings under 60: aim for 40, up to 56 side by side\n/);
  rmSync(join(root, 'proposal.md'));
  const failure = spawnSync(process.execPath, [resolve(here, '../../.claude/skills/plan/scripts/build-review.mjs'), root, '--require-current'], { encoding: 'utf8' });
  assert.equal(failure.status, 1);
  assert.match(failure.stderr, /missing/);
}));

const builder = resolve(here, '../../.claude/skills/plan/scripts/build-review.mjs');

test('--link prints the file where no reply link can open', () => fixture(root => {
  const file = `review: current, updated\n${planLink(join(resolve(root), 'review.html'))}\n\n${NEXT_STEP}\n`;
  const home = join(dirname(root), 'home');
  for (const env of [{ REPLY_LINK: 'off', PASEO_AGENT_ID: 'a-chat' }, { REPLY_LINK: '', PASEO_AGENT_ID: '' }]) {
    rmSync(join(root, 'review.html'), { force: true });
    const out = spawnSync(process.execPath, [builder, root, '--require-current', '--link'], { encoding: 'utf8', env: { ...process.env, HOME: home, ...env } });
    assert.equal(out.status, 0, out.stderr);
    assert.equal(out.stdout, file);
    assert.equal(out.stderr, '');
  }
  assert.equal(existsSync(join(home, '.wong-stack')), false, 'nothing was registered');
}));

// A fake tunnel and a fake way to wake the chat stand in for the real ones, as in reply-link.test.mjs.
test('--link prints the reply link in the same line, with the plan\'s header and its two actions', () => fixture(root => {
  const home = join(dirname(root), 'home');
  const bin = join(home, 'bin');
  mkdirSync(bin, { recursive: true });
  fakeTunnel(bin, join(home, 'calls.log'));
  fakePaseo(bin, join(home, 'sent.jsonl'));
  const env = { ...process.env, ...TUNNEL_ENV, REPLY_LINK: '', PASEO_AGENT_ID: 'a-chat', PASEO_HOME: '', PASEO_HOST: '', HANDOVER_PASEO_BIN: '', HOME: home, PATH: `${bin}:/usr/bin:/bin`, REPLY_LINK_POLL_MS: '100' };
  const state = join(home, '.wong-stack/reply-link');
  try {
    // Without --link the same setup prints the file and registers nothing.
    const plain = spawnSync(process.execPath, [builder, root, '--require-current'], { encoding: 'utf8', env, timeout: 30_000 });
    assert.equal(plain.stdout, `review: current, updated\n${planLink(join(resolve(root), 'review.html'))}\n\n${NEXT_STEP}\n`);
    assert.equal(existsSync(state), false, 'no link, no actions');
    rmSync(join(root, 'review.html'));
    const out = spawnSync(process.execPath, [builder, root, '--require-current', '--link'], { encoding: 'utf8', env, timeout: 30_000 });
    assert.equal(out.status, 0, out.stderr);
    const [, link] = /^Click here to see the plan: \[review\.html\]\((\S+)\)$/m.exec(out.stdout) ?? [];
    assert.match(link ?? out.stdout, new RegExp(`^${ORIGIN}/p/[0-9a-f]{32}/#key=[0-9a-f]{64}$`));
    assert.equal(out.stdout, `review: current, updated\n${planLink(link)}\n\n${NEXT_STEP}\n`);
    const [page] = readdirSync(join(state, 'pages')).map(name => JSON.parse(readFileSync(join(state, 'pages', name), 'utf8')));
    assert.equal(page.file, join(resolve(root), 'review.html'));
    assert.equal(page.header, notesHeader('example'));
    assert.equal(page.header, "Notes on the plan example from the review page. Don't build yet.");
    // Each button's message is fixed here, names the change, and reads as the choice made in the chat.
    assert.deepEqual(page.actions, planActions('example'));
    assert.deepEqual(page.actions, {
      build: 'Build it now: run /apply for the plan example. Chosen on its review page. Apply any attached review notes to this plan first, then continue without another build choice.',
      publish: 'Build and publish: run /ship for the plan example. Chosen on its review page. Apply any attached review notes to this plan first, then continue without another build choice.',
    });
    for (const name of ['build', 'publish']) assert.ok(kit.includes(`data-ready="${name}"`), `the kit offers ${name}`);
    assert.ok(kit.includes("'Notes on the plan ' + CHANGE + ' from the review page. Don\\'t build yet.'"), 'the kit copies notes under the same line');
    // A second run prints the same link, and an older page, which can not send, keeps its file.
    const again = spawnSync(process.execPath, [builder, root, '--link'], { encoding: 'utf8', env, timeout: 30_000 });
    assert.equal(again.stdout, `review: current, unchanged\n${planLink(link)}\n\n${NEXT_STEP}\n`, 'the same link while the tunnel lives');
    writeFileSync(join(root, 'review.html'), '<!-- wong-review:2 -->\n<html><!-- proposal:start -->\nold\n<!-- proposal:end --></html>');
    const older = spawnSync(process.execPath, [builder, root, '--link'], { encoding: 'utf8', env, timeout: 30_000 });
    assert.equal(older.stdout, `review: proposal-only, updated\n${planLink(join(resolve(root), 'review.html'))}\n\n${NEXT_STEP}\n`);
  } finally {
    let server = null;
    try { server = JSON.parse(readFileSync(join(state, 'server.json'), 'utf8')); } catch { /* none started */ }
    // Either process may already be gone.
    if (server) for (const [pid, sig] of [[server.pid, 'SIGTERM'], [server.tunnelPid, 'SIGKILL']]) try { process.kill(pid, sig); } catch { }
  }
}));

test('the next-step line names /apply in one fixed wording', () => {
  assert.equal(NEXT_STEP, "When you're ready, type `/apply` to build it.");
});

test('the link line wraps a path the Markdown link could not parse', () => {
  assert.equal(planLink('/w/a/review.html'), 'Click here to see the plan: [review.html](/w/a/review.html)');
  assert.equal(planLink('/w/my plans/review.html'), 'Click here to see the plan: [review.html](</w/my plans/review.html>)');
  assert.equal(planLink('/w/a(1)/review.html'), 'Click here to see the plan: [review.html](</w/a(1)/review.html>)');
});

test('a missing test dependency skips locally and fails in CI', () => {
  const ci = process.env.CI;
  try {
    delete process.env.CI;
    assert.deepEqual(needs(false, 'x'), {});
    assert.deepEqual(needs(true, 'no jsdom'), { skip: 'no jsdom' });
    process.env.CI = 'true';
    assert.throws(() => needs(true, 'no jsdom'), /no jsdom — CI must run these tests/);
  } finally {
    if (ci === undefined) delete process.env.CI; else process.env.CI = ci;
  }
});

test("in the inbox frame the page opens in the inbox's look", needsDom, () => fixture(async root => {
  buildReview(root, { requireCurrent: true });
  const { window, document, errors } = dom(page(root));
  const parent = { postMessage: () => {} };
  const port = { postMessage: () => {}, onmessage: null };
  Object.defineProperty(window, 'parent', { configurable: true, get: () => parent });
  await loaded(window);
  assert.ok(document.querySelector('.theme-toggle'));
  const event = new window.MessageEvent('message', { data: { type: 'inbox:hello', item: 'i1', version: 'v1', actions: [], theme: 'dark' } });
  Object.defineProperty(event, 'source', { value: parent });
  Object.defineProperty(event, 'ports', { value: [port] });
  window.dispatchEvent(event);
  assert.equal(document.documentElement.classList.contains('dark'), true);
  assert.equal(document.querySelector('.theme-toggle'), null);
  assert.deepEqual(errors, []);
  window.close();
}));

test('in the inbox frame the page talks only on the port its first greeting carries, never fetches, and opens links in their own tab', needsDom, () => fixture(async root => {
  buildReview(root, { requireCurrent: true });
  const { window, document, errors } = dom(page(root));
  // Each message is copied out of the page's realm, as a real postMessage would.
  const copy = message => JSON.parse(JSON.stringify(message));
  const parent = { posted: [], postMessage: message => parent.posted.push(copy(message)) };
  const port = { posted: [], postMessage: message => port.posted.push(copy(message)), onmessage: null };
  Object.defineProperty(window, 'parent', { configurable: true, get: () => parent });
  let fetched = 0;
  window.fetch = () => { fetched += 1; return Promise.reject(new Error('no fetch')); };
  const from = (data, { source = parent, ports = [port] } = {}) => {
    const event = new window.MessageEvent('message', { data });
    Object.defineProperty(event, 'source', { value: source });
    Object.defineProperty(event, 'ports', { value: ports });
    window.dispatchEvent(event);
  };
  const say = data => port.onmessage({ data });
  const tick = () => new Promise(done => setTimeout(done, 0));
  const hello = { type: 'inbox:hello', item: 'i1', version: 'v1', actions: ['build', 'publish'] };
  await loaded(window);
  from(hello, { source: window });
  from(hello, { ports: [] });
  assert.equal(port.onmessage, null, 'a greeting from anywhere but the parent, or with no port, is ignored');
  assert.ok(document.querySelector('.theme-toggle'), 'opened on its own, the page has its own switch');
  from(hello);
  // An older inbox sends no look: the page keeps the one it has, and the inbox's switch is the only one.
  assert.equal(document.querySelector('.theme-toggle'), null, 'in the inbox the page drops its own switch');
  assert.equal(document.documentElement.classList.contains('dark'), false);
  say({ type: 'inbox:theme', theme: 'dark' });
  assert.equal(document.documentElement.classList.contains('dark'), true, 'the inbox switches the page in place');
  say({ type: 'inbox:theme', theme: 'sepia' });
  say({ type: 'inbox:theme' });
  assert.equal(document.documentElement.classList.contains('dark'), true, 'an unknown look changes nothing');
  say({ type: 'inbox:theme', theme: 'light' });
  assert.equal(document.documentElement.classList.contains('dark'), false);
  assert.deepEqual(port.posted, [{ type: 'inbox:notes-get', key: 'wong-review3:example' }]);
  assert.equal(document.getElementById('ready').hidden, false);
  assert.equal(document.getElementById('copy-label').textContent, 'Send notes');
  // Once greeted, the window is deaf: answers come on the port alone.
  from({ type: 'inbox:notes', value: JSON.stringify({ notes: [{ id: 'why-1', label: 'p', text: 'From the window' }], drafts: {} }) });
  say({ type: 'inbox:notes', value: JSON.stringify({ notes: [{ id: 'why-1', label: 'paragraph 1 "Reduce repeated work."', text: 'Shorter' }], drafts: {} }) });
  document.getElementById('copy').click();
  assert.deepEqual(port.posted.at(-1), { type: 'inbox:tap', action: 'send', text: port.posted.at(-1).text });
  assert.match(port.posted.at(-1).text, /Shorter/);
  assert.doesNotMatch(port.posted.at(-1).text, /From the window/);
  from({ type: 'inbox:result', state: 'sent' });
  say({ type: 'inbox:result', state: 'sent' });
  await tick();
  assert.equal(port.posted.at(-1).type, 'inbox:notes-set', 'a sent note is saved through the parent');
  assert.equal(port.posted.at(-1).key, 'wong-review3:example');
  assert.match(document.getElementById('ready-message').textContent, /^Sent 1 note/);
  document.querySelector('[data-ready="build"]').click();
  assert.deepEqual(port.posted.at(-1), { type: 'inbox:tap', action: 'build', text: '' });
  say({ type: 'inbox:result', state: 'soon' });
  await tick();
  assert.equal(document.getElementById('ready-message').textContent, 'Wait a few seconds, then tap again.');
  document.querySelector('[data-ready="build"]').click();
  assert.equal(port.posted.filter(message => message.type === 'inbox:tap').length, 3);
  say({ type: 'inbox:result', state: 'changed' });
  await tick();
  assert.equal(document.getElementById('ready-message').textContent, 'The plan changed. Reload to read it first.');
  // A link leaves in a tab of its own; a jump within the page stays.
  window.addEventListener('click', event => event.preventDefault());
  const wiki = document.querySelector('a[href="../wiki/README.md"]');
  wiki.click();
  assert.deepEqual([wiki.target, wiki.rel], ['_blank', 'noopener noreferrer']);
  const jump = document.querySelector('a[href="#why"]');
  jump.click();
  assert.equal(jump.target, '');
  assert.deepEqual(parent.posted, [], 'nothing goes to the window');
  assert.equal(fetched, 0);
  assert.deepEqual(errors, []);
  window.close();
}));
