// The reply link's inbox path: the live app holds the page and each tap, and this computer delivers taps to the chat.
// A fake app client and a fake wake stand in for the company helper and Paseo.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { checkin, closeItem, companyFor, listLink, probe, tapResult, upload } from '../../.agents/skills/hand-over/scripts/lib/inbox.mjs';
import { closeInboxItem, inboxTick, openInboxItem, openReplyLink, startInbox } from '../../.agents/skills/hand-over/scripts/reply-link.mjs';

const ORIGIN = 'https://app.example.com';
const BUILD = 'Build it now: run /apply for the plan example.';
const HEADER = 'Notes on the plan example from the review page.';
const CHAT = { agentId: 'chat-1', cwd: '/w/chat', paseoHome: null, paseoHost: null };
const ID = /^[0-9a-f]{32}$/;
// The review kit's first line: only a page that starts with it goes to the inbox.
const MARK = '<!-- wong-review:3 -->\n';
const sha = text => createHash('sha256').update(text).digest('hex');

// The live app's inbox routes, kept in memory; `status` answers every call with that code, and `down` throws. A
// check-in hands out the taps on the items it names, once, as the app does.
function fakeApp() {
  const app = { calls: [], items: new Map(), taps: [], status: 200, down: false, reports: true };
  const answer = (route, body) => {
    if (route === 'items') return { items: [...app.items.values()], computerOnline: true };
    if (route === 'item') { app.items.set(body.id, body); return { id: body.id, version: body.version }; }
    if (route === 'item-close') { app.items.delete(body.id); return { id: body.id }; }
    if (route === 'checkin') {
      const taken = app.taps.filter(tap => body.items.includes(tap.item));
      app.taps = app.taps.filter(tap => !taken.includes(tap));
      return { taps: taken };
    }
    return app.reports ? { id: body.id, state: body.state } : null;
  };
  app.client = {
    target: () => ORIGIN,
    http: async (path, init) => {
      if (app.down) throw new Error('fetch failed');
      const route = path.replace('/apps/inbox/api/', '');
      const body = init.body ? JSON.parse(init.body) : null;
      app.calls.push({ route, method: init.method, body });
      const value = app.status === 200 ? answer(route, body) : null;
      return { value, status: value ? app.status : 500 };
    },
  };
  return app;
}

function home(t) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'wong-test-inbox-')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const reply = join(dir, '.wong-stack', 'reply-link');
  return { dir, env: { HOME: dir }, state: { items: join(reply, 'items'), inbox: join(reply, 'inbox.json') } };
}

/** Opens `file` as a plan through the fake app, and returns its id and the open count `start` saw. */
async function openPlan(at, app, file, actions = { build: BUILD }) {
  let started = 0;
  const item = await openInboxItem({ file, kind: 'plan', header: HEADER, actions, hours: 24, target: CHAT, cwd: '/w/lousy-dingo' },
    { env: at.env, clientFor: async () => app.client, start: () => { started += 1; } });
  return { ...item, started };
}

function waker(answer = 'notified') {
  const woken = [];
  const wake = async (target, message) => { woken.push({ agentId: target.agentId, message }); return typeof answer === 'function' ? answer() : answer; };
  return { woken, wake };
}

const tick = (at, app, options = {}) => inboxTick(at.state, { client: app.client, chats: async () => new Set(['chat-1']), wait: async () => {}, ...options });
const reported = app => app.calls.filter(call => call.route === 'tap-result').map(call => call.body.state);

test('the company client counts only once it names an app, and each call answers null unless it succeeded', async () => {
  const app = fakeApp();
  assert.equal(await companyFor(async () => ({ companyClient: () => app.client })), app.client);
  assert.equal(await companyFor(async () => ({ companyClient: () => ({ target: () => { throw new Error('Connect first'); } }) })), null);
  assert.equal(await companyFor(async () => { throw new Error('no helper in this copy'); }), null);
  assert.equal(await probe(app.client), ORIGIN);
  assert.deepEqual(app.calls[0], { route: 'items', method: 'GET', body: null });
  for (const broken of [{ status: 404 }, { status: 403 }, { down: true }]) {
    Object.assign(app, { status: 200, down: false }, broken);
    assert.equal(await probe(app.client), null);
    assert.equal(await upload(app.client, { id: 'x' }), null);
    assert.equal(await closeItem(app.client, 'x'), null);
    assert.equal(await checkin(app.client, ['x']), null);
    assert.equal(await tapResult(app.client, 't', 'sent'), null);
  }
});

test('an inbox that answers takes the plan, and the link is the app address: no tunnel starts', async t => {
  const at = home(t);
  const app = fakeApp();
  const file = join(at.dir, 'review.html');
  writeFileSync(file, `${MARK}<!doctype html><title>Review · example &amp; more</title><p>Plan</p>`);
  const env = { ...at.env, PASEO_AGENT_ID: 'chat-1', HANDOVER_PASEO_BIN: process.execPath, PATH: '' };
  let started = 0;
  const link = await openReplyLink({ file, header: HEADER, actions: { build: BUILD }, env, cwd: at.dir,
    inbox: { clientFor: async () => app.client, start: () => { started += 1; } } });
  const [, id] = new RegExp(`^${ORIGIN}/apps/inbox/\\?item=([0-9a-f]{32})$`).exec(link) ?? [];
  assert.ok(id, link);
  assert.equal(started, 1);
  assert.equal(existsSync(join(at.dir, '.wong-stack', 'reply-link', 'server.json')), false, 'no tunnel server');
  const sent = app.items.get(id);
  assert.deepEqual(Object.keys(sent).sort(), ['actions', 'body', 'closesAt', 'id', 'kind', 'title', 'version', 'workspace']);
  assert.deepEqual([sent.kind, sent.title, sent.actions, sent.version], ['plan', 'Review · example & more', ['build'], sha(readFileSync(file, 'utf8'))]);
  assert.ok(Math.abs(sent.closesAt - Date.now() - 24 * 3_600_000) < 60_000, 'open for 24 hours');
  assert.doesNotMatch(JSON.stringify(sent), /chat-1|Notes on the plan|run \/apply/, 'the app never holds the chat or its messages');
  const kept = JSON.parse(readFileSync(join(at.state.items, `${id}.json`), 'utf8'));
  assert.deepEqual([kept.target.agentId, kept.header, kept.actions], ['chat-1', HEADER, { build: BUILD }]);
  assert.equal((await openPlan(at, app, file)).id, id, 'opening the file again keeps its item');
});

test('a 404, a refused sign-in, a network error or no connection opens nothing in the inbox, so the tunnel is tried', async t => {
  const at = home(t);
  const file = join(at.dir, 'review.html');
  writeFileSync(file, `${MARK}<title>One</title>`);
  for (const broken of [{ status: 404 }, { status: 403 }, { down: true }]) {
    const app = Object.assign(fakeApp(), broken);
    assert.equal((await openPlan(at, app, file)).id, undefined);
  }
  const upTo = Object.assign(fakeApp(), { status: 200 });
  upTo.client.http = async (path, init) => ({ value: init.method === 'GET' ? { items: [] } : null, status: init.method === 'GET' ? 200 : 500 });
  assert.equal((await openPlan(at, upTo, file)).id, undefined, 'an upload the app refused');
  assert.equal(await openInboxItem({ file, kind: 'plan', header: HEADER, actions: {}, hours: 1, target: CHAT, cwd: at.dir },
    { env: at.env, clientFor: async () => null }), null);
  const other = join(at.dir, 'intake.html');
  writeFileSync(other, '<!doctype html><title>Intake</title><script>fetch("send")</script>');
  let asked = 0;
  const found = fakeApp();
  assert.equal(await openInboxItem({ file: other, kind: 'plan', header: HEADER, actions: {}, hours: 1, target: CHAT, cwd: at.dir },
    { env: at.env, clientFor: async () => { asked += 1; return found.client; } }), null, 'a page that is not a plan keeps its tunnel');
  assert.equal(asked, 0);
  assert.equal(existsSync(at.state.items) ? readdirSync(at.state.items).length : 0, 0, 'nothing kept open here');
});

test('a tap on an old version is changed, a failed wake can be tried again, and a delivered tap closes the plan', async t => {
  const at = home(t);
  const app = fakeApp();
  const file = join(at.dir, 'review.html');
  writeFileSync(file, `${MARK}<title>One</title>`);
  const { id } = await openPlan(at, app, file);
  const version = sha(`${MARK}<title>One</title>`);
  const tap = (n, extra) => ({ id: `t${n}`, item: id, action: 'build', text: '', version, ...extra });
  let answer = 'unconfirmed';
  const { woken, wake } = waker(() => answer);
  app.taps.push(tap(1));
  assert.equal(await tick(at, app, { wake }), 1);
  answer = 'notified';
  app.taps.push(tap(4, { version: 'old' }), tap(6, { action: 'send', text: '  ' }), tap(7, { action: 'merge' }),
    tap(2, { text: '- Why: shorter' }), tap(3), tap(5, { action: 'send', text: 'Hello' }), tap(8, { item: 'f'.repeat(32) }));
  assert.equal(await tick(at, app, { wake }), 0, 'the build tap answered the plan');
  assert.deepEqual(reported(app), ['failed', 'changed', 'failed', 'failed', 'sent', 'expired', 'expired']);
  assert.deepEqual(app.taps.map(waiting => waiting.id), ['t8'], 'a tap on an item made elsewhere is left for its own computer');
  assert.deepEqual(app.calls.filter(call => call.route === 'checkin').at(-1).body, { items: [id] });
  assert.deepEqual(woken.map(w => w.message), [BUILD, `${BUILD}\n- Why: shorter`]);
  assert.ok(woken.every(w => w.agentId === 'chat-1'));
  assert.equal(app.items.has(id), false, 'closed in the app');
});

test('an action this computer already woke the chat with, before a crash, is sent without a second wake', async t => {
  const at = home(t);
  const app = fakeApp();
  const file = join(at.dir, 'review.html');
  writeFileSync(file, `${MARK}<title>One</title>`);
  const { id } = await openPlan(at, app, file);
  const version = sha(`${MARK}<title>One</title>`);
  const kept = join(at.state.items, `${id}.json`);
  writeFileSync(kept, JSON.stringify({ ...JSON.parse(readFileSync(kept, 'utf8')), done: { version, names: ['build'] } }));
  const { woken, wake } = waker();
  app.taps.push({ id: 't1', item: id, action: 'build', text: '', version });
  assert.equal(await tick(at, app, { wake }), 0, 'the plan closed');
  assert.deepEqual(reported(app), ['sent']);
  assert.deepEqual(woken, []);
});

const approvalOf = (at, app, title, start = () => {}) => openInboxItem({ kind: 'approval', title, body: JSON.stringify({ text: `${title}?` }),
  header: 'Inbox answer:', actions: { approve: `Inbox answer: ${title}: Approve`, decline: `Inbox answer: ${title}: Decline` }, hours: 10,
  target: CHAT, cwd: at.dir }, { env: at.env, clientFor: async () => app.client, start });
const versionOf = title => sha(JSON.stringify({ text: `${title}?` }));

test('a lost report is sent again next round and never wakes twice; an answered approval closes at once', async t => {
  const at = home(t);
  const app = fakeApp();
  const { woken, wake } = waker();
  const item = await approvalOf(at, app, 'Send the invoice');
  assert.match(item.id, ID);
  const memory = { reported: new Map() };
  app.reports = false;
  const tap = { id: 't1', item: item.id, action: 'send', text: 'Yes, today', version: versionOf('Send the invoice') };
  app.taps.push(tap);
  assert.equal(await tick(at, app, { wake, ...memory }), 0, 'answered, so nothing is open');
  assert.equal(app.items.has(item.id), false, 'closed in the app');
  app.reports = true;
  assert.equal(await tick(at, app, { wake, ...memory }), 0);
  assert.deepEqual(reported(app), ['sent', 'sent'], 'the lost report, then the one the app took');
  assert.equal(await tick(at, app, { wake, ...memory }), 0);
  assert.deepEqual(reported(app), ['sent', 'sent'], 'a report the app took is not sent again');
  assert.deepEqual(woken.map(w => w.message), ['Inbox answer:\nYes, today']);
  assert.equal(await closeInboxItem(item.id, { env: at.env, clientFor: async () => app.client }), false, 'and closed here');
});

test('a tap the app hands out again is reported again without a second wake', async t => {
  const at = home(t);
  const app = fakeApp();
  const file = join(at.dir, 'review.html');
  writeFileSync(file, `${MARK}<title>One</title>`);
  const { id } = await openPlan(at, app, file);
  const { woken, wake } = waker('unconfirmed');
  const memory = { reported: new Map() };
  const tap = { id: 't1', item: id, action: 'send', text: 'A note', version: sha(`${MARK}<title>One</title>`) };
  app.taps.push(tap);
  await tick(at, app, { wake, ...memory });
  app.taps.push(tap);
  await tick(at, app, { wake, ...memory });
  assert.equal(woken.length, 1);
  assert.deepEqual(reported(app), ['failed', 'failed']);
});

test('two taps on one approval in one check-in wake once; the second is expired, and the other approval stays open', async t => {
  const at = home(t);
  const app = fakeApp();
  const { woken, wake } = waker();
  const quote = await approvalOf(at, app, 'Send the quote');
  const van = await approvalOf(at, app, 'Book the van');
  app.taps.push({ id: 't1', item: quote.id, action: 'approve', text: '', version: versionOf('Send the quote') },
    { id: 't2', item: quote.id, action: 'decline', text: '', version: versionOf('Send the quote') });
  assert.equal(await tick(at, app, { wake }), 1);
  assert.deepEqual(woken.map(w => w.message), ['Inbox answer: Send the quote: Approve']);
  assert.deepEqual(reported(app), ['sent', 'expired']);
  assert.equal(existsSync(join(at.state.items, `${quote.id}.json`)), false, 'a closed item is never written back');
  assert.deepEqual(readdirSync(at.state.items), [`${van.id}.json`]);
});

test('an item written during a round keeps the server going', async t => {
  const at = home(t);
  const app = fakeApp();
  const quote = await approvalOf(at, app, 'Send the quote');
  let added = null;
  const wake = async () => { added = await approvalOf(at, app, 'Book the van'); return 'notified'; };
  app.taps.push({ id: 't1', item: quote.id, action: 'approve', text: '', version: versionOf('Send the quote') });
  assert.equal(await tick(at, app, { wake }), 1, 'the answered approval closed, and the new one is open');
  assert.deepEqual(readdirSync(at.state.items), [`${added.id}.json`]);
});

test('an inbox helper from older code is replaced by the next start; a current one is left running', async t => {
  const at = home(t);
  mkdirSync(join(at.dir, '.wong-stack', 'reply-link'), { recursive: true });
  const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
  // A stand-in whose command line reads like the real helper's: `reply-link.mjs serve-inbox`.
  const script = join(at.dir, 'reply-link.mjs');
  writeFileSync(script, 'setInterval(() => {}, 1e6);\n');
  const old = spawn(process.execPath, [script, 'serve-inbox'], { detached: true, stdio: 'ignore' });
  const pids = [old.pid];
  t.after(() => { for (const pid of pids) try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ } });
  const record = () => JSON.parse(readFileSync(at.state.inbox, 'utf8'));
  writeFileSync(at.state.inbox, JSON.stringify({ pid: old.pid }));
  await startInbox(at.state, at.env);
  const started = record();
  pids.push(started.pid);
  assert.notEqual(started.pid, old.pid);
  assert.equal(started.protocol, 5);
  assert.equal(alive(old.pid), false, 'the older helper ended');

  const current = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1e6)'], { detached: true, stdio: 'ignore' });
  pids.push(current.pid);
  writeFileSync(at.state.inbox, JSON.stringify({ pid: current.pid, protocol: 5 }));
  await startInbox(at.state, at.env);
  assert.deepEqual(record(), { pid: current.pid, protocol: 5 }, 'no second helper starts');
  assert.ok(alive(current.pid));
});

test('a recorded pid that is not the inbox helper is a stale record: a new helper starts and it is never signalled', async t => {
  const at = home(t);
  mkdirSync(join(at.dir, '.wong-stack', 'reply-link'), { recursive: true });
  const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
  const other = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1e6)'], { detached: true, stdio: 'ignore' });
  const pids = [other.pid];
  t.after(() => { for (const pid of pids) try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ } });
  writeFileSync(at.state.inbox, JSON.stringify({ pid: other.pid }));
  await startInbox(at.state, at.env);
  const started = JSON.parse(readFileSync(at.state.inbox, 'utf8'));
  pids.push(started.pid);
  assert.notEqual(started.pid, other.pid);
  assert.equal(started.protocol, 5);
  assert.ok(alive(other.pid), 'the other program is left running');
});

test('one wake per item every 5 seconds, and a tap held too long is failed, not woken', async t => {
  const at = home(t);
  const app = fakeApp();
  const file = join(at.dir, 'review.html');
  writeFileSync(file, `${MARK}<title>One</title>`);
  const { id } = await openPlan(at, app, file);
  const version = sha(`${MARK}<title>One</title>`);
  const realNow = Date.now;
  let offset = 0;
  Date.now = () => realNow() + offset;
  t.after(() => { Date.now = realNow; });
  const waits = [];
  let slow = 0;
  const wait = async ms => { waits.push(ms); offset += ms + slow; };
  // Unanswered wakes keep the plan open, so its later taps are paced too.
  const { woken, wake } = waker('unconfirmed');
  const lastWake = new Map();
  app.taps.push({ id: 't1', item: id, action: 'send', text: 'One', version }, { id: 't2', item: id, action: 'build', text: '', version });
  await tick(at, app, { wake, wait, lastWake });
  assert.deepEqual(woken.map(w => w.message), [`${HEADER}\nOne`, BUILD]);
  assert.equal(waits.length, 1);
  assert.ok(waits[0] > 4900 && waits[0] <= 5000, `waited ${waits[0]} ms`);
  // The pace holds across rounds too; a wait that ran past the app's limit sends nothing.
  slow = 100_000;
  app.taps.push({ id: 't3', item: id, action: 'send', text: 'Two', version });
  await tick(at, app, { wake, wait, lastWake });
  assert.equal(waits.length, 2);
  assert.equal(woken.length, 2);
  assert.deepEqual(reported(app), ['failed', 'failed', 'failed']);
});

test('a rebuilt plan uploads its new version first; a refused upload holds its taps back', async t => {
  const at = home(t);
  const app = fakeApp();
  const file = join(at.dir, 'review.html');
  writeFileSync(file, `${MARK}<title>One</title>`);
  const { id } = await openPlan(at, app, file);
  writeFileSync(file, `${MARK}<title>One</title><p>Rebuilt`);
  const fresh = sha(`${MARK}<title>One</title><p>Rebuilt`);
  app.status = 500;
  await tick(at, app);
  assert.equal(app.calls.filter(call => call.route === 'checkin').length, 0, 'no check-in while no item is ready');
  app.status = 200;
  const { wake } = waker();
  app.taps.push({ id: 't1', item: id, action: 'build', text: '', version: fresh });
  await tick(at, app, { wake });
  assert.equal(app.calls.filter(call => call.route === 'item').at(-1).body.version, fresh);
  assert.deepEqual(reported(app), ['sent']);
});

test('notes on a plan close it once the chat has them, a failed send keeps it, and the rebuilt plan comes back as a new item', async t => {
  const at = home(t);
  const app = fakeApp();
  const file = join(at.dir, 'review.html');
  writeFileSync(file, `${MARK}<title>One</title>`);
  const { id } = await openPlan(at, app, file);
  const version = sha(`${MARK}<title>One</title>`);
  let answer = 'unconfirmed';
  const { woken, wake } = waker(() => answer);
  app.taps.push({ id: 't1', item: id, action: 'send', text: 'Shorter, please', version });
  assert.equal(await tick(at, app, { wake }), 1, 'a send the chat did not get keeps the plan');
  assert.ok(app.items.has(id));
  answer = 'notified';
  app.taps.push({ id: 't2', item: id, action: 'send', text: 'Shorter, please', version });
  assert.equal(await tick(at, app, { wake }), 0);
  assert.deepEqual(reported(app), ['failed', 'sent']);
  assert.equal(app.items.has(id), false, 'closed in the app');
  assert.equal(existsSync(join(at.state.items, `${id}.json`)), false, 'and here');
  assert.deepEqual(woken.map(w => w.message), [`${HEADER}\nShorter, please`, `${HEADER}\nShorter, please`]);
  writeFileSync(file, `${MARK}<title>One</title><p>Shorter`);
  const back = await openPlan(at, app, file);
  assert.match(back.id, ID);
  assert.notEqual(back.id, id, 'a new item, at a new address');
  assert.equal(back.started, 1);
  assert.equal(app.items.get(back.id).version, sha(`${MARK}<title>One</title><p>Shorter`));
});

test('an item whose time ran out, whose file is gone, or whose chat closed ends; then the server stops', async t => {
  const at = home(t);
  const app = fakeApp();
  const files = ['a', 'b', 'c'].map(name => { const file = join(at.dir, `${name}.html`); writeFileSync(file, `${MARK}<title>${name}</title>`); return file; });
  const ids = [];
  for (const file of files) ids.push((await openPlan(at, app, file)).id);
  assert.equal(await tick(at, app, { now: Date.now() + 25 * 3_600_000 }), 0, 'all ran out');
  assert.equal(app.items.size, 0);
  for (const file of files) ids.push((await openPlan(at, app, file)).id);
  rmSync(files[0]);
  assert.equal(await tick(at, app), 2);
  assert.equal(await tick(at, app, { chats: async () => new Set(['another-chat']) }), 0, 'their chat closed');
  assert.equal(await tick(at, app, { chats: async () => null }), 0, 'nothing open: the server stops');
  assert.equal(readdirSync(at.state.items).length, 0);
  assert.equal(await closeInboxItem('0'.repeat(32), { env: at.env, clientFor: async () => null }), false);
});

test('a link is listed by its address and title alone, and a listing or close the app never answers gives up in 3 s', async () => {
  const app = fakeApp();
  const link = { id: 'd'.repeat(32), what: 'key', title: 'Maps API key', url: 'https://quiet-fox-lamp.trycloudflare.com/#key=k', closesAt: 5, workspace: 'desk' };
  assert.deepEqual(await listLink(app.client, link), { id: link.id, version: 'link' });
  assert.deepEqual(app.calls, [{ route: 'item', method: 'PUT', body: { id: link.id, kind: 'link', title: 'Maps API key', workspace: 'desk',
    body: JSON.stringify({ what: 'key', url: link.url }), actions: [], version: 'link', closesAt: 5 } }]);
  const hung = { target: () => ORIGIN, http: () => new Promise(() => {}) };
  const started = Date.now();
  assert.deepEqual(await Promise.all([listLink(hung, link), closeItem(hung, link.id)]), [null, null]);
  assert.ok(Date.now() - started < 4000);
});
