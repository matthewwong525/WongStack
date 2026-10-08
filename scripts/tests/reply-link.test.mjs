import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { LIMITS, openReplyLink } from '../../.agents/skills/hand-over/scripts/reply-link.mjs';
import { canWake, chatTarget, wakeChat } from '../../.agents/skills/hand-over/scripts/lib/wake.mjs';
import { fakePaseo, fakeTunnel, ORIGIN, TUNNEL_ENV } from './fixtures/fake-tunnel.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, '.agents/skills/hand-over/scripts/reply-link.mjs');
const handOver = join(repo, '.agents/skills/hand-over/scripts/hand-over.mjs');
const LINK = new RegExp(`^REPLY_LINK=${ORIGIN}/p/([0-9a-f]{32})/#key=([0-9a-f]{64})$`, 'm');
const HEADER = 'Notes on the plan example from the review page. Don\'t build yet.';
const AGENT = 'a-full-workspace-id';
const sleep = ms => new Promise(done => setTimeout(done, ms));
const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };

// A HOME of its own, with a fake cloudflared and paseo first on PATH. The public-address check asks the
// server's own loopback port, so no test needs the network; the test asks that port too.
function fixture(t, { cloudflared = true, silent = false, paseo = 'ok', agentId = AGENT, env: extra = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-reply-link-'));
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const calls = join(root, 'calls.log');
  const sentFile = join(root, 'sent.jsonl');
  if (cloudflared) fakeTunnel(bin, calls, { silent });
  else for (const tool of ['cat', 'rm', 'sleep']) symlinkSync(spawnSync('sh', ['-c', `command -v ${tool}`], { encoding: 'utf8' }).stdout.trim(), join(bin, tool));
  if (paseo) fakePaseo(bin, sentFile, paseo);
  const env = { ...process.env, ...TUNNEL_ENV, REPLY_LINK: '', PASEO_AGENT_ID: agentId, PASEO_HOME: '', PASEO_HOST: '', HANDOVER_PASEO_BIN: '', HOME: root, PATH: cloudflared ? `${bin}:/usr/bin:/bin` : bin, REPLY_LINK_POLL_MS: '100', REPLY_LINK_SEND_GAP_MS: '1', HANDOVER_POLL_MS: '50', ...extra };
  const state = join(root, '.wong-stack/reply-link');
  const server = () => { try { return JSON.parse(readFileSync(join(state, 'server.json'), 'utf8')); } catch { return null; } };
  const run = (file, ...args) => spawnSync(process.execPath, [file, ...args], { cwd: root, env, encoding: 'utf8', timeout: 30_000 });
  const page = (name, text = `<!doctype html><title>${name}</title>`) => { writeFileSync(join(root, name), text); return join(root, name); };
  let started = null;
  /** Opens a link for `file` and returns its id, key, and the port its server listens on. */
  const open = (file, ...args) => {
    const out = run(script, 'open', file, '--header', HEADER, ...args);
    const [, id, key] = LINK.exec(out.stdout) ?? [];
    assert.ok(id, `${out.stdout}${out.stderr}`);
    started = server();
    return { id, key, port: started.port, link: out.stdout.trim().slice('REPLY_LINK='.length) };
  };
  t.after(async () => {
    run(handOver, 'close');
    for (const record of [started, server()]) {
      if (!record) continue;
      try { process.kill(record.pid, 'SIGTERM'); } catch { /* gone */ }
      for (let i = 0; i < 40 && alive(record.pid); i++) await sleep(50);
      for (const pid of [record.pid, record.tunnelPid]) try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ }
    }
    rmSync(root, { recursive: true, force: true });
  });
  return {
    root, env, state, run, open, page, server,
    reply: (...args) => run(script, ...args),
    registration: id => JSON.parse(readFileSync(join(state, 'pages', `${id}.json`), 'utf8')),
    expire: id => {
      const file = join(state, 'pages', `${id}.json`);
      writeFileSync(file, JSON.stringify({ ...JSON.parse(readFileSync(file, 'utf8')), deadline: Date.now() - 1 }));
    },
    sent: () => (existsSync(sentFile) ? readFileSync(sentFile, 'utf8').trim().split('\n').map(JSON.parse) : []),
    tunnels: () => (existsSync(calls) ? readFileSync(calls, 'utf8').split('\n').filter(line => line.startsWith('cloudflared tunnel')).length : 0),
  };
}

/** Asks the server on `port`, as the page would through the tunnel. */
async function ask({ port, id, key }, action = '', { method = action === 'send' ? 'POST' : 'GET', body, path = `/p/${id}/${action}` } = {}) {
  const options = { method, headers: { ...(key && { 'x-reply-key': key }) } };
  if (body !== undefined) Object.assign(options, { body: typeof body === 'string' ? body : JSON.stringify(body) }).headers['content-type'] = 'application/json';
  const response = await fetch(`http://127.0.0.1:${port}${path}`, options);
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* a page or an empty answer */ }
  return { status: response.status, text, json, headers: response.headers };
}

async function until(done, message, ms = 5000) {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(25)) if (await done()) return;
  assert.fail(message);
}

// ---------------------------------------------------------------------------
// Waking a chat

test('waking a chat is notified only when the host confirms that chat got the message', async t => {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-wake-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const sent = join(root, 'sent.jsonl');
  const env = kind => {
    const bin = join(root, kind);
    mkdirSync(bin);
    if (kind !== 'none') fakePaseo(bin, sent, kind);
    return { PATH: bin };
  };
  const target = { agentId: AGENT, cwd: root, paseoHome: null, paseoHost: null };
  assert.equal(await wakeChat(target, 'Hello\nthere', env('ok')), 'notified');
  assert.deepEqual(JSON.parse(readFileSync(sent, 'utf8')), ['send', AGENT, 'Hello\nthere', '--no-wait', '--json']);
  assert.equal(await wakeChat({ ...target, paseoHost: 'box:1' }, 'x', env('invalid')), 'unconfirmed', 'an answer that names no chat');
  assert.deepEqual(JSON.parse(readFileSync(sent, 'utf8').trim().split('\n')[1]).slice(-2), ['--host', 'box:1']);
  assert.equal(await wakeChat({ ...target, paseoHome: '/h' }, 'x', env('fail')), 'unconfirmed', 'a send that failed');
  assert.deepEqual(JSON.parse(readFileSync(sent, 'utf8').trim().split('\n')[2]).slice(-2), ['--home', '/h']);
  const none = env('none');
  assert.equal(await wakeChat(target, 'x', none), 'unavailable', 'no way to wake a chat');
  assert.equal(await wakeChat({ ...target, agentId: null }, 'x', { PATH: join(root, 'ok') }), 'unavailable', 'no chat');
  assert.equal(await wakeChat(null, 'x', { PATH: join(root, 'ok') }), 'unavailable');
  assert.equal(readFileSync(sent, 'utf8').trim().split('\n').length, 3, 'nothing is sent when unavailable');
  assert.equal(canWake(target, { PATH: join(root, 'ok') }), true);
  assert.equal(canWake(target, none), false);
  assert.equal(canWake({ ...target, agentId: null }, { PATH: join(root, 'ok') }), false);
  assert.deepEqual(chatTarget({ PASEO_AGENT_ID: ` ${AGENT} `, PASEO_HOME: '/h', PASEO_HOST: '' }, '/w'), { agentId: AGENT, cwd: '/w', paseoHome: '/h', paseoHost: null });
  assert.equal(chatTarget({}, '/w').agentId, null);
});

// ---------------------------------------------------------------------------
// Opening

test('every page shares one tunnel, and opening a file again keeps its link and moves its deadline', async t => {
  const f = fixture(t);
  const first = f.open(f.page('one.html'));
  const second = f.open(f.page('two.html'));
  assert.equal(f.tunnels(), 1, 'the second page starts no second tunnel');
  assert.notEqual(second.id, first.id);
  assert.notEqual(second.key, first.key);
  assert.equal(second.port, first.port);
  const before = f.registration(first.id).deadline;
  assert.ok(Math.abs(before - Date.now() - 8 * 3_600_000) < 60_000, 'a link stays open for 8 hours');
  const again = f.open(f.page('one.html'), '--hours', '9');
  assert.equal(again.link, first.link);
  assert.ok(f.registration(first.id).deadline > before);
  assert.equal(f.tunnels(), 1);
  assert.equal(readdirSync(join(f.state, 'pages')).length, 2);
  assert.match((await ask(first)).text, /<title>one\.html<\/title>/);
  assert.match((await ask(second)).text, /<title>two\.html<\/title>/);
  const listed = f.reply('list').stdout;
  assert.match(listed, /one\.html\tcloses \d{4}-/);
  assert.match(listed, /two\.html\tcloses \d{4}-/);
  assert.ok(!listed.includes(first.key) && !listed.includes(second.key), 'list never prints a key');
  assert.doesNotMatch(readFileSync(join(f.state, 'server.json'), 'utf8'), new RegExp(first.key));
});

test('a server that died is replaced by the next open, and the page keeps its id and key', async t => {
  const f = fixture(t);
  const first = f.open(f.page('one.html'));
  const old = f.server();
  process.kill(old.pid, 'SIGKILL');
  await until(() => !alive(old.pid), 'the server is still running');
  const again = f.open(f.page('one.html'));
  assert.equal(again.link, first.link, 'the fake tunnel gives the same address, so the link is the same');
  assert.notEqual(f.server().pid, old.pid);
  assert.equal(f.tunnels(), 2);
  await until(() => !alive(old.tunnelPid), 'the dead server\'s tunnel is still running');
  assert.equal((await ask(again, 'alive')).status, 200);
});

for (const [reason, options] of [
  ['off', { env: { REPLY_LINK: 'off' } }],
  ['no-chat', { agentId: '' }],
  ['no-chat', { paseo: null }],
  ['no-cloudflared', { cloudflared: false }],
]) {
  test(`no link opens and nothing is asked for: ${reason}${options.paseo === null ? ' (no way to wake a chat)' : ''}`, async t => {
    const f = fixture(t, options);
    const file = f.page('one.html');
    const started = Date.now();
    const out = f.reply('open', file, '--header', HEADER);
    const took = Date.now() - started;
    assert.equal(out.status, 0, out.stderr);
    assert.equal(out.stdout, `REPLY_LINK=none\nREPLY_REASON=${reason}\n`);
    assert.equal(out.stderr, '', 'no request to install anything');
    assert.ok(took < 1000, `took ${took} ms`);
    assert.equal(f.tunnels(), 0);
    assert.deepEqual(existsSync(join(f.state, 'pages')) ? readdirSync(join(f.state, 'pages')) : [], [], 'no page stays registered');
    // In this process the tunnel tool would be looked up on the test's own PATH, so only the earlier answers are asked here.
    if (reason !== 'no-cloudflared') assert.equal(await openReplyLink({ file, header: HEADER, env: f.env, cwd: f.root }), null);
  });
}

test('a tunnel that never comes up ends with no link, within its wait', t => {
  const f = fixture(t, { silent: true, env: { REPLY_LINK_TUNNEL_WAIT_MS: '300' } });
  const out = f.reply('open', f.page('one.html'), '--header', HEADER);
  assert.equal(out.status, 0, out.stderr);
  assert.equal(out.stdout, 'REPLY_LINK=none\nREPLY_REASON=tunnel-down\n');
  assert.deepEqual(readdirSync(join(f.state, 'pages')), []);
  assert.equal(f.server(), null);
  assert.equal(existsSync(join(f.state, 'starting.lock')), false);
});

test('a missing file and bad arguments are refused before anything opens', t => {
  const f = fixture(t);
  const missing = f.reply('open', join(f.root, 'nope.html'), '--header', HEADER);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /No such file/);
  for (const args of [['open', f.page('one.html')], ['open', f.page('one.html'), '--header', 'two\nlines'], ['open', f.page('one.html'), '--header', 'x'.repeat(LIMITS.header + 1)],
    ['open', f.page('one.html'), '--header', HEADER, '--hours', '0'], ['close', f.page('one.html'), '--header', HEADER], ['list', 'extra'], ['nope'], []]) {
    const out = f.reply(...args);
    assert.equal(out.status, 2, `${args.join(' ')}: ${out.stdout}${out.stderr}`);
    assert.match(out.stderr, /usage: reply-link\.mjs/);
  }
  assert.equal(f.tunnels(), 0);
  assert.equal(f.reply('close', f.page('one.html')).stdout, 'REPLY_CLOSED=no\n');
  assert.equal(f.reply('list').stdout, '');
});

// ---------------------------------------------------------------------------
// The server's routes

test('a send with the key wakes the chat that opened the link, under the fixed header', async t => {
  const f = fixture(t);
  const link = f.open(f.page('one.html'));
  const page = await ask(link);
  assert.equal(page.status, 200);
  assert.equal(page.headers.get('cache-control'), 'no-store');
  assert.equal(page.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(page.headers.get('x-frame-options'), 'DENY');
  assert.equal(page.headers.get('content-security-policy'), "frame-ancestors 'none'");
  const state = await ask(link, 'alive');
  assert.deepEqual(state.json, { closesAt: f.registration(link.id).deadline });
  const text = '- Change #2 ("Item two"): Name the reason.\n- Decision #1 ("Asked"): Why?';
  const sent = await ask(link, 'send', { body: { text: `  ${text}\n` } });
  assert.equal(sent.status, 200);
  assert.deepEqual(sent.json, { sent: true });
  assert.deepEqual(f.sent(), [['send', AGENT, `${HEADER}\n${text}`, '--no-wait', '--json']]);
  // The page can not choose the header or the chat.
  await sleep(5);
  assert.equal((await ask(link, 'send', { body: { text: 'more', header: 'Build it now.', target: { agentId: 'another' }, agentId: 'another' } })).status, 200);
  assert.deepEqual(f.sent()[1], ['send', AGENT, `${HEADER}\nmore`, '--no-wait', '--json']);
  f.page('one.html', '<!doctype html><title>rebuilt</title>');
  assert.match((await ask(link)).text, /<title>rebuilt<\/title>/, 'a rebuilt page shows at the same address');
  assert.equal(readdirSync(f.state).some(name => name.endsWith('.log') && readFileSync(join(f.state, name), 'utf8').includes(link.key)), false, 'the key is in no log');
});

test('a send without the key, too large, malformed, or by the wrong method reaches no chat', async t => {
  const f = fixture(t);
  const link = f.open(f.page('one.html'));
  assert.equal((await ask({ ...link, key: null }, 'send', { body: { text: 'x' } })).status, 403);
  assert.equal((await ask({ ...link, key: 'f'.repeat(64) }, 'send', { body: { text: 'x' } })).status, 403);
  assert.equal((await ask({ ...link, key: null }, 'alive')).status, 403);
  assert.equal((await ask(link, 'send', { method: 'GET' })).status, 405);
  assert.equal((await ask(link, 'alive', { method: 'POST', body: {} })).status, 405);
  assert.equal((await ask(link, '', { method: 'POST', body: {} })).status, 405);
  assert.equal((await ask(link, '', { path: '/', method: 'POST', body: {} })).status, 405);
  assert.equal((await ask(link, '', { path: '/' })).status, 204, 'the outside probe gets an empty answer');
  for (const path of ['/p/', `/p/${link.id}`, `/p/${link.id}/other`, '/page.mjs']) assert.equal((await ask(link, '', { path })).status, 404, path);
  for (const body of [{ text: 'x'.repeat(LIMITS.text + 1) }, { text: 'x'.repeat(LIMITS.body) }, { text: '   ' }, { text: 7 }, {}, 'not json', '[]', 'null']) {
    await sleep(5);
    const out = await ask(link, 'send', { body });
    assert.equal(out.status, 400, JSON.stringify(body).slice(0, 40));
    assert.deepEqual(out.json, { sent: false });
  }
  await sleep(5);
  assert.equal((await ask(link, 'send', { body: { text: 'x'.repeat(LIMITS.text) } })).status, 200, 'the limit itself is allowed');
  assert.equal(f.sent().length, 1);
});

test('a second send inside five seconds is refused', async t => {
  const f = fixture(t, { env: { REPLY_LINK_SEND_GAP_MS: '' } });
  const one = f.open(f.page('one.html'));
  const two = f.open(f.page('two.html'));
  assert.equal((await ask(one, 'send', { body: { text: 'first' } })).status, 200);
  const soon = await ask(one, 'send', { body: { text: 'second' } });
  assert.equal(soon.status, 429);
  assert.deepEqual(soon.json, { sent: false });
  assert.equal((await ask(two, 'send', { body: { text: 'another page' } })).status, 200, 'the bound is per page');
  assert.deepEqual(f.sent().map(args => args[2].split('\n')[1]), ['first', 'another page']);
});

for (const paseo of ['fail', 'invalid']) {
  test(`a wake that is not confirmed (${paseo}) answers 502, never sent`, async t => {
    const f = fixture(t, { paseo });
    const link = f.open(f.page('one.html'));
    const out = await ask(link, 'send', { body: { text: 'x' } });
    assert.equal(out.status, 502);
    assert.deepEqual(out.json, { sent: false });
  });
}

test('an expired, closed, or unknown page answers 410 and wakes nothing', async t => {
  const f = fixture(t);
  const file = f.page('one.html');
  const link = f.open(file);
  const kept = f.open(f.page('kept.html'));
  const unknown = { ...link, id: '0'.repeat(32) };
  for (const gone of [unknown, link]) {
    if (gone === link) f.expire(link.id);
    const page = await ask(gone);
    assert.equal(page.status, 410);
    assert.match(page.text, /This link has closed/);
    assert.doesNotMatch(page.text, /one\.html/);
    assert.equal((await ask(gone, 'alive')).status, 410);
    const send = await ask(gone, 'send', { body: { text: 'x' } });
    assert.equal(send.status, 410);
    assert.deepEqual(send.json, { closed: true });
  }
  assert.deepEqual(f.sent(), []);
  await until(() => !existsSync(join(f.state, 'pages', `${link.id}.json`)), 'the expired registration was not swept');
  // An expired page opened again is a new link with a new key.
  const fresh = f.open(file);
  assert.notEqual(fresh.id, link.id);
  assert.notEqual(fresh.key, link.key);
  assert.equal(f.reply('close', file).stdout, 'REPLY_CLOSED=yes\n');
  assert.equal((await ask(fresh, 'send', { body: { text: 'x' } })).status, 410);
  assert.equal(f.reply('close', file).stdout, 'REPLY_CLOSED=no\n');
  // A page whose file is gone has closed too, and its link still closes.
  rmSync(join(f.root, 'kept.html'));
  assert.equal((await ask(kept)).status, 410);
  assert.equal(f.reply('close', join(f.root, 'kept.html')).stdout, 'REPLY_CLOSED=yes\n');
  assert.deepEqual(f.sent(), []);
});

test('the server exits and kills its tunnel once no page is open', async t => {
  const f = fixture(t);
  const file = f.page('one.html');
  f.open(file);
  const { pid, tunnelPid } = f.server();
  assert.ok(alive(pid) && alive(tunnelPid));
  f.reply('close', file);
  await until(() => !alive(pid) && !alive(tunnelPid), 'the server or its tunnel is still running');
  await until(() => f.server() === null, 'the server left its record');
  assert.deepEqual(readdirSync(f.state).sort(), ['pages']);
});

test('the server exits when its tunnel dies, and keeps the pages for the next open', async t => {
  const f = fixture(t);
  const link = f.open(f.page('one.html'));
  const { pid, tunnelPid } = f.server();
  process.kill(-tunnelPid, 'SIGKILL');
  await until(() => !alive(pid), 'the server outlived its tunnel');
  assert.equal(f.registration(link.id).key, link.key);
});

// ---------------------------------------------------------------------------
// Apart from private links

test('a reply link and a private link open while the other is open, and share no state', async t => {
  const f = fixture(t);
  const link = f.open(f.page('one.html'));
  const privateLink = f.run(handOver, 'open', '--passwords');
  assert.equal(privateLink.status, 0, privateLink.stderr);
  assert.match(privateLink.stdout, /^HANDOVER_LINK=/m);
  const handOverState = join(f.root, '.wong-stack/hand-over');
  const handOverFiles = () => readdirSync(handOverState).map(name => readFileSync(join(handOverState, name), 'utf8')).join('\n');
  assert.ok(!handOverFiles().includes(link.key) && !handOverFiles().includes(link.id), 'hand-over holds nothing of the reply link');
  const privateKey = JSON.parse(readFileSync(join(handOverState, 'state.json'), 'utf8')).key;
  const replyFiles = () => [...readdirSync(f.state).filter(name => name !== 'pages').map(name => join(f.state, name)), ...readdirSync(join(f.state, 'pages')).map(name => join(f.state, 'pages', name))].map(file => readFileSync(file, 'utf8')).join('\n');
  assert.ok(!replyFiles().includes(privateKey), 'the reply link holds nothing of the private link');
  assert.equal(f.tunnels(), 2, 'each has its own tunnel');
  // The reply link still sends with the private link open, and a second page opens beside both.
  assert.equal((await ask(link, 'send', { body: { text: 'during a key link' } })).status, 200);
  const second = f.open(f.page('two.html'));
  assert.equal(f.tunnels(), 2);
  // Closing the private link leaves the reply link serving, and its result names nothing sent.
  const closed = f.run(handOver, 'close');
  assert.match(closed.stdout, /^HANDOVER_RESULT=closed$/m);
  assert.equal((await ask(link, 'alive')).status, 200);
  assert.equal((await ask(second, 'alive')).status, 200);
  assert.deepEqual(f.sent().map(args => args[2]), [`${HEADER}\nduring a key link`], 'only the reply link woke the chat');
});

test('a private link opens first and a reply link opens beside it', async t => {
  const f = fixture(t);
  assert.equal(f.run(handOver, 'open', '--passwords').status, 0);
  const link = f.open(f.page('one.html'));
  assert.equal((await ask(link, 'alive')).status, 200);
  assert.equal(existsSync(join(f.root, '.wong-stack/hand-over/watcher.pid')), true, 'the private link is still open');
  f.reply('close', join(f.root, 'one.html'));
  await until(() => f.server() === null, 'the reply server did not exit');
  assert.equal(existsSync(join(f.root, '.wong-stack/hand-over/watcher.pid')), true, 'closing the reply link leaves the private link open');
  assert.match(f.run(handOver, 'close').stdout, /^HANDOVER_RESULT=closed$/m);
});
