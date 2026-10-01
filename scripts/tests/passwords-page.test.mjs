import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { needs } from './fixtures/needs.mjs';

// The password page in jsdom: the HTML with its module inlined as a classic script (jsdom runs no
// module scripts), a fake `fetch` for `save`, `done`, and `page.mjs`, and the DOM driven by hand.
const scripts = resolve(dirname(fileURLToPath(import.meta.url)), '../../.agents/skills/hand-over/scripts');
const html = readFileSync(resolve(scripts, 'passwords-page.html'), 'utf8');
const source = readFileSync(resolve(scripts, 'passwords-page.mjs'), 'utf8').replace(/^export /gm, '');
// jsdom comes from scripts/tests/node_modules (`npm ci` there).
let JSDOM, VirtualConsole;
try { ({ JSDOM, VirtualConsole } = await import('jsdom')); } catch { /* reported by needsDom */ }
const needsDom = needs(!JSDOM, 'jsdom cannot be resolved — run `npm ci` in scripts/tests/ to run the password page checks');

const CHROME = 'name,url,username,password,note\n'
  + 'Netflix,https://www.netflix.com/login,me@x.com,pw-netflix,\n'
  + 'Costco,https://costco.com/,me@x.com,pw-costco,\n'
  + 'Amazon,https://amazon.com/,me@x.com,pw-amazon,\n';
const SECOND = 'name,url,username,password\n'
  + 'Netflix,https://netflix.com/,me@x.com,pw-other,\n'
  + 'Target,https://target.com/,me@x.com,pw-target,\n';

/**
 * The page with a fake server. `reply(body)` answers each `/save`: a `{saved, failed}` result by
 * default, from the hosts sent; `open` says whether `page.mjs` still loads (a closed link's 403).
 */
function page({ reply, open = true, hash = 'key=abc' } = {}) {
  const calls = [];
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));
  const answer = (status, body) => ({ ok: status === 200, status, json: async () => body });
  const fetch = async (path, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ path, body, key: init.headers?.['x-hand-over-key'] });
    if (path === 'page.mjs') return answer(open ? 200 : 404);
    if (path === 'done') return answer(200, { ok: true });
    if (reply) return reply(body, answer);
    const hostOf = url => new URL(url).hostname.replace(/^www\./, '');
    return answer(200, { saved: body.logins.map(login => ({ name: hostOf(login.url), host: hostOf(login.url) })), failed: [] });
  };
  const markup = html.replace('<script type="module" src="page.mjs"></script>', () => `<script>${source}</script>`);
  const { window } = new JSDOM(markup, {
    url: `https://pw.test/#${hash}`,
    runScripts: 'dangerously',
    virtualConsole,
    beforeParse(win) { win.fetch = fetch; },
  });
  const { document } = window;
  const $ = selector => document.querySelector(selector);
  const rows = () => [...document.querySelectorAll('#logins li')].map(item => ({
    host: item.querySelector('.host').textContent,
    user: item.querySelector('.user').textContent,
    ticked: item.querySelector('input').checked,
    saved: item.querySelector('input').disabled,
  }));
  const file = text => new window.File([text], 'export.csv', { type: 'text/csv' });
  const pick = async text => {
    Object.defineProperty($('#file'), 'files', { configurable: true, value: [file(text)] });
    $('#file').dispatchEvent(new window.Event('change'));
    await settle();
  };
  const drop = async (target, text) => {
    const event = new window.Event('drop', { bubbles: true, cancelable: true });
    event.dataTransfer = { types: ['Files'], files: [file(text)] };
    target.dispatchEvent(event);
    await settle();
    return event;
  };
  const type = (site, username, password) => {
    $('#site').value = site;
    $('#username').value = username;
    $('#password').value = password;
    $('#add-form').dispatchEvent(new window.Event('input', { bubbles: true }));
  };
  const add = (...fields) => {
    type(...fields);
    $('#add-form').dispatchEvent(new window.Event('submit', { cancelable: true }));
  };
  const tick = host => {
    const box = [...document.querySelectorAll('#logins li')].find(item => item.querySelector('.host').textContent === host).querySelector('input');
    box.checked = !box.checked;
    box.dispatchEvent(new window.Event('change'));
  };
  const click = async selector => { $(selector).click(); await settle(); };
  const saves = () => calls.filter(call => call.path === 'continue').map(call => call.body.logins);
  return { window, document, $, rows, pick, drop, type, add, tick, click, saves, calls, errors };
}

async function settle() {
  for (let i = 0; i < 10; i++) await new Promise(done => setTimeout(done, 0));
}

test('the page opens on one screen with the list hidden and Save off', needsDom, () => {
  const p = page();
  assert.equal(p.$('#page').hidden, false);
  assert.equal(p.$('#closed').hidden, true);
  assert.equal(p.$('#list').hidden, true);
  assert.equal(p.$('#save').disabled, true);
  assert.equal(p.$('#save').textContent, 'Save and continue');
  assert.equal(p.window.location.hash, '', 'the key leaves the address bar');
  assert.deepEqual(p.errors, []);
});

test('a picked file lists its logins, none ticked', needsDom, async () => {
  const p = page();
  await p.pick(CHROME);
  assert.equal(p.$('#list').hidden, false);
  assert.equal(p.$('#list-title').textContent, '3 logins');
  assert.deepEqual(p.rows().map(row => [row.host, row.ticked]), [['amazon.com', false], ['costco.com', false], ['netflix.com', false]]);
  assert.equal(p.$('#search').hidden, true, 'search hides at eight rows or fewer');
  assert.equal(p.$('#save').disabled, true);
});

test('an unreadable file says so under the drop box', needsDom, async () => {
  const p = page();
  await p.pick('{"items": []}');
  assert.match(p.$('#file-error').textContent, /Export as CSV/);
  assert.equal(p.$('#list').hidden, true);
});

test('a dropped file lists the same, and a drop outside the box is taken, not navigated', needsDom, async () => {
  const p = page();
  const onBox = await p.drop(p.$('#drop'), CHROME);
  assert.equal(onBox.defaultPrevented, true);
  assert.equal(p.rows().length, 3);
  assert.ok(p.rows().every(row => !row.ticked));

  const q = page();
  const over = new q.window.Event('dragover', { bubbles: true, cancelable: true });
  over.dataTransfer = { types: ['Files'] };
  q.$('h1').dispatchEvent(over);
  assert.equal(over.defaultPrevented, true);
  assert.ok(q.$('#drop').classList.contains('over'), 'the box lights up while a file is over the page');
  const outside = await q.drop(q.$('#add-form'), CHROME);
  assert.equal(outside.defaultPrevented, true, 'the tab never opens the file');
  assert.equal(q.$('#drop').classList.contains('over'), false);
  assert.equal(q.rows().length, 3);
});

test('a second file merges without repeats and keeps ticks', needsDom, async () => {
  const p = page();
  await p.pick(CHROME);
  p.tick('costco.com');
  await p.pick(SECOND);
  assert.deepEqual(p.rows().map(row => [row.host, row.ticked]), [
    ['amazon.com', false], ['costco.com', true], ['netflix.com', false], ['target.com', false],
  ]);
});

test('search shows past eight rows and filters by site', needsDom, async () => {
  const p = page();
  const many = Array.from({ length: 9 }, (_, i) => `Site ${i},https://site${i}.com/,me,pw${i}`).join('\n');
  await p.pick(`name,url,username,password\n${many}\n`);
  assert.equal(p.$('#search').hidden, false);
  p.$('#search').value = 'site3';
  p.$('#search').dispatchEvent(new p.window.Event('input'));
  const shown = [...p.document.querySelectorAll('#logins li')].filter(item => !item.hidden);
  assert.deepEqual(shown.map(item => item.querySelector('.host').textContent), ['site3.com']);
});

test('Add appends a ticked row, and replaces a same-site-and-username row', needsDom, async () => {
  const p = page();
  await p.pick(CHROME);
  p.add('hulu.com', 'me@x.com', 'pw-hulu');
  assert.deepEqual(p.rows().find(row => row.host === 'hulu.com'), { host: 'hulu.com', user: 'me@x.com', ticked: true, saved: false });
  assert.equal(p.$('#site').value, '', 'the form clears');
  assert.equal(p.$('#save').textContent, 'Save and continue');

  p.add('www.netflix.com', 'me@x.com', 'pw-new');
  assert.equal(p.rows().filter(row => row.host === 'netflix.com').length, 1);
  assert.equal(p.rows().find(row => row.host === 'netflix.com').ticked, true);
  await p.click('#save');
  const sent = p.saves()[0];
  assert.deepEqual(sent.find(login => login.url.includes('netflix')), { url: 'https://www.netflix.com', username: 'me@x.com', password: 'pw-new' });
});

test('Add refuses a site that is not a website', needsDom, () => {
  const p = page();
  p.add('not a site', 'me', 'pw');
  assert.match(p.$('#add-error').textContent, /Enter the website/);
  assert.equal(p.$('#list').hidden, true);
});

test('Save takes a filled form and sends only ticked rows\' url, username, and password', needsDom, async () => {
  const p = page();
  await p.pick(CHROME);
  p.tick('costco.com');
  p.type('hulu.com', 'me@x.com', 'pw-hulu');
  assert.equal(p.$('#save').textContent, 'Save and continue', 'the count includes a filled form');
  await p.click('#save');
  assert.deepEqual(p.saves(), [[
    { url: 'https://costco.com/', username: 'me@x.com', password: 'pw-costco' },
    { url: 'https://hulu.com', username: 'me@x.com', password: 'pw-hulu' },
  ]]);
  assert.equal(p.calls.find(call => call.path === 'continue').key, 'abc');
  assert.deepEqual(p.rows().filter(row => row.saved).map(row => row.host), ['costco.com', 'hulu.com']);
  assert.ok(p.rows().every(row => !row.ticked));
  assert.equal(p.$('#status').textContent, 'Saved: costco.com, hulu.com');
  assert.equal(p.$('#delete-file').hidden, false, 'a saved file row reminds you to delete the export');
  assert.equal(p.$('#save').disabled, false);
});

test('one typed login is one Save, with no delete-the-file hint', needsDom, async () => {
  const p = page();
  p.type('netflix.com', 'me@x.com', 'pw');
  assert.equal(p.$('#save').disabled, false);
  await p.click('#save');
  assert.deepEqual(p.saves(), [[{ url: 'https://netflix.com', username: 'me@x.com', password: 'pw' }]]);
  assert.equal(p.$('#status').textContent, 'Saved: netflix.com');
  assert.equal(p.$('#delete-file').hidden, true);
});

test('a partial failure keeps the failed row ticked and names it', needsDom, async () => {
  const p = page({
    reply: (body, answer) => answer(200, { saved: [{ name: 'amazon-com', host: 'amazon.com' }], failed: [1] }),
  });
  await p.pick(CHROME);
  p.tick('amazon.com');
  p.tick('costco.com');
  await p.click('#save');
  assert.deepEqual(p.rows().map(row => [row.host, row.ticked, row.saved]), [
    ['amazon.com', false, true], ['costco.com', true, false], ['netflix.com', false, false],
  ]);
  assert.equal(p.$('#list-error').textContent, 'Couldn\'t save costco.com. Try again.');
  assert.equal(p.$('#save').textContent, 'Save and continue');
});

test('a 403 on a closed link shows the closed screen', needsDom, async () => {
  const p = page({ open: false, reply: (body, answer) => answer(403) });
  p.type('netflix.com', 'me@x.com', 'pw');
  await p.click('#save');
  assert.equal(p.$('#page').hidden, true);
  assert.equal(p.$('#closed').hidden, false);
  assert.equal(p.$('#password').value, '', 'the form is cleared');
});

test('Done with unsaved ticks needs two taps', needsDom, async () => {
  const p = page();
  await p.pick(CHROME);
  p.tick('costco.com');
  await p.click('#done');
  assert.equal(p.$('#done-note').textContent, '1 ticked login isn\'t saved. Tap Close without continuing again to leave without it.');
  assert.equal(p.calls.some(call => call.path === 'done'), false);
  p.tick('netflix.com');
  assert.equal(p.$('#done-note').hidden, true, 'a tick change disarms Done');
  await p.click('#done');
  assert.match(p.$('#done-note').textContent, /^2 ticked logins aren't saved/);
  await p.click('#done');
  assert.equal(p.calls.some(call => call.path === 'done'), true);
  assert.equal(p.$('#closed').hidden, false);
});

test('Done with nothing unsaved closes on one tap', needsDom, async () => {
  const p = page();
  await p.click('#done');
  assert.deepEqual(p.calls.map(call => call.path), ['done']);
  assert.equal(p.$('#closed').hidden, false);
});

for (const notification of ['notified','unconfirmed']) test(`password continue receipt reports ${notification} and clears private input`,needsDom,async()=>{
  const p=page({reply:(body,answer)=>answer(200,{saved:body.logins.map(_login=>({name:'netflix-com',host:'netflix.com'})),failed:[],ready:true,receipt:{notification}})});
  p.type('netflix.com','me','private');await p.click('#save');
  assert.equal(p.$('#page').hidden,true);assert.equal(p.$('#password').value,'');
  assert.match(p.$('#closed h1').textContent,notification==='notified'?/notified/:/return to your chat/);
});

test('an incomplete typed login blocks a selected export and saving blocks all competing actions',needsDom,async()=>{
  let finish;const p=page({reply:()=>new Promise(done=>{finish=done;})});
  await p.pick(CHROME);p.tick('netflix.com');p.type('hulu.com','','private');await p.click('#save');
  assert.equal(p.saves().length,0);assert.match(p.$('#add-error').textContent,/Complete/);
  p.type('','','');p.$('#save').click();await settle();assert.equal(p.$('#done').disabled,true);assert.equal(p.$('#add').disabled,true);assert.equal(p.$('#drop').disabled,true);
  p.$('#save').click();assert.equal(p.saves().length,1);
  finish({ok:true,status:200,json:async()=>({saved:[],failed:[0],ready:false})});await settle();assert.equal(p.$('#done').disabled,false);
});

test('a site and username in the link fill the form, title the page, and focus the first empty box', needsDom, () => {
  const p = page({ hash: 'key=abc&site=https%3A%2F%2Fwww.netflix.com%2Flogin' });
  assert.equal(p.$('#site').value, 'https://www.netflix.com/login');
  assert.equal(p.$('#username').value, '');
  assert.equal(p.$('h1').textContent, 'Save your netflix.com login');
  assert.equal(p.document.title, 'Save your netflix.com login');
  assert.equal(p.document.activeElement, p.$('#username'));
  assert.equal(p.$('#save').disabled, true, 'a site alone is not a login yet');

  const q = page({ hash: 'key=abc&site=netflix.com&user=me%2B1%40x.com' });
  assert.equal(q.$('#username').value, 'me+1@x.com');
  assert.equal(q.document.activeElement, q.$('#password'), 'a rejected login needs only the new password');
  assert.deepEqual(q.errors, []);
});

test('a link with no site or username leaves the page as it was', needsDom, () => {
  const p = page();
  assert.equal(p.$('h1').textContent, 'Save logins for your agent');
  assert.equal(p.$('#site').value, '');
  assert.notEqual(p.document.activeElement, p.$('#site'));
});

test('a pre-filled form is saved by Save and continue alone, and the fragment never reaches the server', needsDom, async () => {
  const p = page({ hash: 'key=abc&site=netflix.com&user=me%40x.com' });
  assert.equal(p.window.location.hash, '', 'the site and username leave the address bar with the key');
  assert.deepEqual(p.calls, [], 'nothing is sent on load');
  p.$('#password').value = 'pw-new';
  p.$('#add-form').dispatchEvent(new p.window.Event('input', { bubbles: true }));
  assert.equal(p.$('#save').disabled, false);
  await p.click('#save');
  assert.deepEqual(p.saves(), [[{ url: 'https://netflix.com', username: 'me@x.com', password: 'pw-new' }]]);
  assert.ok(p.calls.every(call => !/[#?]/.test(call.path)), 'no request carries the fragment');
});
