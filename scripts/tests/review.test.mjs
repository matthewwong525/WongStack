import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { buildReview } from '../../.agents/skills/plan/scripts/build-review.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const requireFromApp = createRequire(resolve(here, '../../app/package.json'));
const { JSDOM } = requireFromApp('jsdom');
const checker = readFileSync(resolve(here, '../../.agents/skills/plan/scripts/check-review.js'), 'utf8');
const proposal = '## Why\n\nReduce repeated work.\n\n## What Changes\n\n- A new flow. (review.html#/flow/after/new)\n';
const fragment = '<section class="visual flow" id="flow" data-kind="flow" data-states="after today"><div class="frame"><div class="state state-after"><div class="flow-card" data-target-id="new" data-mark="new">New</div></div><div class="state state-today"><div class="flow-card">Old</div></div></div><div class="notes"><ol><li>Less work.</li></ol></div></section>\n';
const browserOptions = { url: 'https://review.test/', runScripts: 'dangerously', beforeParse(window) {
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  window.requestAnimationFrame = callback => callback();
  window.scrollTo = () => {};
} };

function fixture(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-review-'));
  const root = join(dir, 'example');
  mkdirSync(root);
  writeFileSync(join(root, 'proposal.md'), proposal);
  writeFileSync(join(root, 'review-visuals.html'), fragment);
  try { return fn(root); } finally { rmSync(dir, { recursive: true, force: true }); }
}

function inspect(html) {
  const dom = new JSDOM(html, browserOptions);
  const output = JSON.parse(runInNewContext(checker, { document: dom.window.document }));
  dom.window.close();
  return output;
}

test('assembly is portable, deterministic, and structurally valid', () => fixture(root => {
  const page = join(root, 'review.html');
  assert.deepEqual(buildReview(root, { requireCurrent: true }), { kind: 'current', changed: true });
  const html = readFileSync(page, 'utf8');
  assert.match(html, /wong-review:2/);
  assert.match(html, /Reduce repeated work/);
  assert.deepEqual(inspect(html), { ok: true, issues: [] });
  const before = statSync(page).mtimeMs;
  assert.deepEqual(buildReview(root, { requireCurrent: true }), { kind: 'current', changed: false });
  assert.equal(statSync(page).mtimeMs, before);
  rmSync(join(root, 'proposal.md'));
  rmSync(join(root, 'review-visuals.html'));
  assert.deepEqual(inspect(readFileSync(page, 'utf8')), { ok: true, issues: [] });
}));

test('proposal script delimiters remain visible text', () => fixture(root => {
  writeFileSync(join(root, 'proposal.md'), proposal.replace('Reduce repeated work.', 'Show </script><script>window.injection=1</script> as text.'));
  buildReview(root);
  const dom = new JSDOM(readFileSync(join(root, 'review.html'), 'utf8'), browserOptions);
  assert.equal(dom.window.injection, undefined);
  assert.match(dom.window.document.querySelector('#panel').textContent, /<\/script><script>window.injection=1<\/script>/);
  dom.window.close();
}));

test('invalid current inputs preserve the last valid page', () => fixture(root => {
  buildReview(root);
  const page = join(root, 'review.html');
  const good = readFileSync(page, 'utf8');
  writeFileSync(join(root, 'review-visuals.html'), fragment + '<script>bad()</script>');
  assert.throws(() => buildReview(root), /forbidden author markup/);
  assert.equal(readFileSync(page, 'utf8'), good);
  writeFileSync(join(root, 'review-visuals.html'), fragment + '<a href="javascript:bad()">Bad</a>');
  assert.throws(() => buildReview(root), /forbidden author markup/);
  assert.equal(readFileSync(page, 'utf8'), good);
  rmSync(join(root, 'review-visuals.html'));
  assert.throws(() => buildReview(root), /missing .*review-visuals/);
  assert.equal(readFileSync(page, 'utf8'), good);
}));

test('legacy refresh touches only proposal markers', () => fixture(root => {
  rmSync(join(root, 'review-visuals.html'));
  const page = join(root, 'review.html');
  writeFileSync(page, 'before<!-- proposal:start -->old<!-- proposal:end -->after');
  assert.deepEqual(buildReview(root), { kind: 'legacy', changed: true });
  const changed = readFileSync(page, 'utf8');
  assert.ok(changed.startsWith('before<!-- proposal:start -->'));
  assert.ok(changed.endsWith('<!-- proposal:end -->after'));
  assert.match(changed, /Reduce repeated work/);
  assert.deepEqual(buildReview(root), { kind: 'legacy', changed: false });
}));

test('diagnostics distinguish broken routes, state collisions, and valid links', () => fixture(root => {
  buildReview(root);
  const html = readFileSync(join(root, 'review.html'), 'utf8');
  assert.deepEqual(inspect(html.replace('data-mark="new"', 'data-mark="after"')).issues.map(x => x.code).sort(), ['dead-anchor', 'missing-mark', 'state-mark-collision', 'unreferenced-mark']);
  assert.deepEqual(inspect(html.replace('id="flow"', 'id="other"')).issues.map(x => x.code).sort(), ['dead-anchor', 'missing-visual', 'unreferenced-mark', 'unreferenced-visual']);
  assert.deepEqual(inspect(html.replace('New</div>', 'New <a href="https://example.test/">Help</a></div>')), { ok: true, issues: [] });
  assert.ok(inspect(html.replace('data-mark="new"', 'data-go="other" data-mark="new"')).issues.some(x => x.code === 'cross-item-navigation'));
  assert.ok(inspect(html.replace('data-mark="new"', 'data-local-state="missing" data-mark="new"')).issues.some(x => x.code === 'missing-local-state'));
}));

test('wrapped bullets, flow lanes, screen states, and shared actions', () => fixture(root => {
  writeFileSync(join(root, 'proposal.md'), proposal.replace('A new flow. (', 'A new flow\n  with detail. ('));
  buildReview(root);
  const html = readFileSync(join(root, 'review.html'), 'utf8');
  assert.deepEqual(inspect(html), { ok: true, issues: [] });
  assert.ok(inspect(html.replace('state-today', 'state-other')).issues.some(x => x.code === 'missing-today-lane'));
  const screen = '<section class="visual screen" id="flow" data-kind="screen" data-states="default empty"><div class="frame"><button class="btn primary">Shared</button><div class="state state-default">Ready</div><div class="state state-empty">Empty</div><span data-mark="new">Change</span></div></section>';
  writeFileSync(join(root, 'review-visuals.html'), screen);
  writeFileSync(join(root, 'proposal.md'), proposal.replace('/flow/after/new', '/flow/default/new'));
  buildReview(root);
  const page = readFileSync(join(root, 'review.html'), 'utf8');
  assert.deepEqual(inspect(page), { ok: true, issues: [] });
  assert.ok(inspect(page.replace('state-empty', 'state-else')).issues.some(x => x.code === 'empty-screen-state'));
  assert.ok(inspect(page.replace('Ready</div>', 'Ready<button class="btn primary">Extra</button></div>')).issues.some(x => x.code === 'multiple-primary-actions'));
}));
