import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { linksOpenOwnTab as inApp } from '../../app/worker/apps/inbox/sealed.ts';
import { buildPage, linksOpenOwnTab, main, putPage } from '../../.agents/skills/page/scripts/page.mjs';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const ORIGIN = 'https://business.example.com';

/** A page folder holding `files`, by name, removed when the test ends. */
function folder(t, files) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-page-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
  return dir;
}

/** A company client that records each call and answers as the inbox does; `refuse` makes it answer 403. */
function client(refuse = false) {
  const sent = [];
  return { sent, target: () => ORIGIN, http: async (path, init) => {
    const body = JSON.parse(init.body ?? '{}');
    sent.push({ path, body });
    return refuse ? { status: 403, value: null } : { status: 200, value: path.endsWith('share') ? { token: 'k7Qm2xW9' } : { id: body.id } };
  } };
}

test('a page carries its own style, script and picture inside it, and keeps a link to another site', t => {
  const dir = folder(t, {
    'index.html': '<html><head><link rel="stylesheet" href="look.css"></head><body><img src="bar.png">'
      + '<a href="https://shop.example.com/">Shop</a><script src="chart.js"></script></body></html>',
    'look.css': 'body { color: red }', 'chart.js': 'window.drawn = 1;', 'bar.png': PNG,
  });
  const { html, warnings } = buildPage(dir);
  assert.match(html, /<style>body \{ color: red \}<\/style>/);
  assert.match(html, /<script>window\.drawn = 1;<\/script>/);
  assert.match(html, /src="data:image\/png;base64,/);
  assert.match(html, /href="https:\/\/shop\.example\.com\/"/);
  assert.match(html, /^<html><head><base target="_blank"><style>/);
  assert.deepEqual(warnings, []);
});

test('a page that loads a script, a style, a picture or a font from the web is refused, naming the address', t => {
  for (const [page, address] of [['<script src="https://cdn.example.com/chart.js"></script>', 'https://cdn.example.com/chart.js'],
    ['<link rel="stylesheet" href="//fonts.example.com/a.css">', '//fonts.example.com/a.css'],
    ['<img src="http://example.com/a.png">', 'http://example.com/a.png'],
    ['<style>@font-face { src: url(https://example.com/a.woff2) }</style>', 'https://example.com/a.woff2']]) {
    assert.throws(() => buildPage(folder(t, { 'index.html': page })), new RegExp(`${address.replace(/[./]/g, '\\$&')} is a web address`));
  }
  assert.throws(() => buildPage(folder(t, { 'index.html': '<style>@import "more.css";</style>' })), /@import/);
  assert.throws(() => buildPage(folder(t, {})), /no index\.html/);
});

test('a page over 1.5 MB stops, and one over 800 KB warns', t => {
  assert.throws(() => buildPage(folder(t, { 'index.html': `<p>${'x'.repeat(1536 * 1024)}</p>` })), /keep a page under 1\.5 MB/);
  assert.match(buildPage(folder(t, { 'index.html': `<p>${'x'.repeat(900 * 1024)}</p>` })).warnings[0], /over 800 KB/);
});

test('--share puts a plain page, shares it, and prints the inbox and team links', async () => {
  const shop = client();
  const id = 'a'.repeat(32);
  const lines = await putPage(shop, { html: '<p>Chart</p>', title: 'Kit sales', id, share: true, workspace: 'dull-blobfish', chat: 'agent-1' });
  assert.deepEqual(lines, [`page: ${ORIGIN}/apps/inbox/?item=${id}`, `id: ${id} (pass --id ${id} to replace it)`,
    `team link: ${ORIGIN}/apps/inbox/?shared=k7Qm2xW9`]);
  assert.deepEqual(shop.sent.map(call => call.path), ['/apps/inbox/api/item', '/apps/inbox/api/share']);
  const [put, share] = shop.sent.map(call => call.body);
  assert.deepEqual([put.plain, put.kind, put.actions, put.chat, share], [true, 'plan', [], 'agent-1', { id }]);
  // Without --share it prints no team link; a refused put says to sign in, and a refused share says what to tap.
  assert.equal((await putPage(shop, { html: '<p>Chart</p>', title: 'Kit sales', id, workspace: 'desk' })).length, 2);
  await assert.rejects(putPage(client(true), { html: '<p/>', title: 't', workspace: 'w' }), /sign in with node scripts\/company-api\.mjs login/);
  const halfway = client();
  const http = halfway.http;
  halfway.http = async (path, init) => path.endsWith('share') ? { status: 500, value: null } : http(path, init);
  await assert.rejects(putPage(halfway, { html: '<p/>', title: 't', workspace: 'w', share: true }), /tap Share with team/);
});

test("a # link with no target stays in the page, and the app's twin of linksOpenOwnTab gives the same page", () => {
  const pages = [
    '<!doctype html><html><head><title>t</title></head><body><a href="#q3">Q3</a> <a href="https://x.test">x</a></body></html>',
    '<a class="c" href=\'#top\'>Top</a><a target="_top" href="#keep">k</a>',
    '<!DOCTYPE html><header>x</header>',
    '<HEAD lang="en"><title>t</title>',
    // A page with its own <base> is left as written.
    '<head><base href="."></head><a href="#b">b</a>',
  ];
  for (const page of pages) assert.equal(linksOpenOwnTab(page), inApp(page));
  assert.match(linksOpenOwnTab(pages[0]), /<a target="_self" href="#q3">Q3<\/a> <a href="https:\/\/x\.test">/);
  assert.match(linksOpenOwnTab(pages[1]), /<a target="_top" href="#keep">/);
  assert.equal(linksOpenOwnTab(pages[2]), '<!DOCTYPE html><base target="_blank"><header>x</header>');
  assert.equal(linksOpenOwnTab('<p>Chart</p>'), '<base target="_blank"><p>Chart</p>');
});

test('the command takes one folder and a title, and says to sign in when it has no connection', async t => {
  const said = t.mock.method(console, 'error', () => {});
  const printed = t.mock.method(console, 'log', () => {});
  const dir = folder(t, { 'index.html': `<p>${'x'.repeat(900 * 1024)}</p>` });
  assert.equal(await main([dir]), 2);
  assert.equal(await main([dir, '--title', 'T', '--id', 'nope']), 2);
  assert.equal(await main([dir, '--title', 'T'], async () => null), 1);
  assert.match(said.mock.calls.map(call => call.arguments[0]).join('\n'), /over 800 KB[\s\S]*not signed in to the app; run node scripts\/company-api\.mjs login/);
  assert.equal(await main([dir, '--title', ' Kit sales ', '--share'], async () => client()), 0);
  assert.match(printed.mock.calls[0].arguments[0], /team link: https:\/\/business\.example\.com\/apps\/inbox\/\?shared=k7Qm2xW9$/);
});
