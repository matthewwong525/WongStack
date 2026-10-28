// Several private links: one per chat, one live view on the computer, and only its own chat reaches an older link.
// Each test has its own HOME, a fake cloudflared, and fake watchers: it never opens a real tunnel or a real link.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '../../.agents/skills/hand-over/scripts/hand-over.mjs');
const KEY = 'MAPS_API_KEY';

const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
const pause = ms => new Promise(done => setTimeout(done, ms));

/** A HOME of its own with a fake cloudflared first on PATH; `chat(name)` makes a checkout that chat runs in. */
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-links-'));
  const bin = join(root, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'cloudflared'), `#!/bin/sh
[ "$1" = "--version" ] && exit 0
echo "INF |  https://quiet-fox-lamp.trycloudflare.com  |" >&2
echo "INF Registered tunnel connection connIndex=0" >&2
exec sleep 600
`);
  chmodSync(join(bin, 'cloudflared'), 0o755);
  const env = { ...process.env, HOME: root, PATH: `${bin}:/usr/bin:/bin`, HANDOVER_PROBE_ORIGIN: 'http://127.0.0.1:{port}', HANDOVER_POLL_MS: '50', PASEO_AGENT_ID: '', PASEO_HOME: '', PASEO_HOST: '' };
  const home = join(root, '.wong-stack/hand-over');
  const fakes = [];
  const chats = new Set();
  const chat = (name, extra = {}) => {
    const cwd = join(root, name);
    if (!existsSync(cwd)) {
      mkdirSync(cwd);
      execFileSync('git', ['init', '-q', '-b', 'main'], { cwd, stdio: 'ignore' });
      writeFileSync(join(cwd, '.gitignore'), '.env*\n!.env.example\n');
      writeFileSync(join(cwd, '.env.example'), `# The Maps key.\n${KEY}=\n`);
    }
    chats.add(name);
    return {
      run: (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd, env: { ...env, ...extra }, encoding: 'utf8', timeout: 30_000 }),
      /** Runs a command beside the test, as `wait` blocks; resolves to its status and output. */
      start: (...args) => new Promise(done => {
        const child = spawn(process.execPath, [SCRIPT, ...args], { cwd, env: { ...env, ...extra }, stdio: ['ignore', 'pipe', 'pipe'] });
        const out = { stdout: '', stderr: '' };
        for (const stream of ['stdout', 'stderr']) child[stream].on('data', chunk => { out[stream] += chunk; });
        child.on('close', status => done({ ...out, status }));
      }),
      dir: join(home, 'links', name),
    };
  };
  /** A watcher that only stays alive, for a link this test writes by hand. The shell leaves it to init, so a
   * killed one is gone at once, never a zombie that still answers as alive. */
  const fakeWatcher = () => {
    const pid = Number(execFileSync('sh', ['-c', `"${process.execPath}" -e 'setInterval(() => {}, 1e6)' >/dev/null 2>&1 & echo $!`], { encoding: 'utf8' }));
    fakes.push(pid);
    return pid;
  };
  /** Writes a link's files in `dir` with a live fake watcher; resolves to the watcher's pid. */
  const place = (dir, state) => {
    mkdirSync(dir, { recursive: true });
    const pid = fakeWatcher();
    writeFileSync(join(dir, 'state.json'), `${JSON.stringify({ completionId: 'c0ffee', ...state })}\n`);
    writeFileSync(join(dir, 'watcher.pid'), `${pid}\n`);
    return pid;
  };
  /** Fake live-view tools, so a view's open passes the tool check and stops at the page: no browser runs here. */
  const viewTools = () => {
    for (const name of ['x11vnc', 'xdotool']) {
      writeFileSync(join(bin, name), '#!/bin/sh\nexit 0\n');
      chmodSync(join(bin, name), 0o755);
    }
    const core = join(root, '.wong-stack/live-view/novnc-1.6.0/core');
    mkdirSync(core, { recursive: true });
    writeFileSync(join(core, 'rfb.js'), '');
  };
  t.after(() => {
    for (const name of chats) chat(name).run('close');
    for (const pid of fakes) try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ }
    rmSync(root, { recursive: true, force: true });
  });
  return { root, bin, home, chat, place, fakeWatcher, viewTools };
}

/** Opens a key link in `c` and returns the live watcher's pid. */
function openKeys(c) {
  const out = c.run('open', '--keys', KEY, '--minutes', '5');
  assert.equal(out.status, 0, out.stdout + out.stderr);
  assert.match(out.stdout, /^HANDOVER_LINK=https:\/\/quiet-fox-lamp\.trycloudflare\.com\/#key=[^\n]*\nHANDOVER_SEND=[^\n]+$/m);
  const send = out.stdout.match(/^HANDOVER_SEND=(.*)$/m)[1];
  assert.doesNotMatch(send, /https?:|key=|trycloudflare/, 'the reminder holds no link or key');
  const pid = Number(readFileSync(join(c.dir, 'watcher.pid'), 'utf8'));
  assert.ok(alive(pid));
  return pid;
}

/** Every file in `dir` and its text, to show nothing there changed. */
const snapshot = dir => Object.fromEntries(readdirSync(dir).filter(name => name !== 'links' && name !== 'timings.jsonl').map(name => [name, readFileSync(join(dir, name), 'utf8')]));

test('two chats each open a link, and close in one leaves the other open', t => {
  const f = fixture(t);
  const [a, b] = [f.chat('chat-a'), f.chat('chat-b')];
  const first = openKeys(a);
  const second = openKeys(b);
  assert.notEqual(first, second);
  const closed = b.run('close');
  assert.match(closed.stdout, /^HANDOVER_RESULT=closed$/m);
  assert.ok(!existsSync(join(b.dir, 'watcher.pid')));
  assert.ok(alive(first), 'chat A keeps its link');
  assert.ok(existsSync(join(a.dir, 'state.json')));
  assert.match(a.run('close').stdout, /^HANDOVER_RESULT=closed$/m);
});

test('an unopened key link gives way to a new one from the same chat only', async t => {
  const f = fixture(t);
  const [a, b] = [f.chat('chat-a'), f.chat('chat-b')];
  const other = openKeys(b);
  const old = openKeys(a);
  const waited = a.start('wait');
  await pause(300);
  const fresh = openKeys(a);
  const out = await waited;
  assert.match(out.stdout, /^HANDOVER_RESULT=closed$/m);
  assert.match(out.stdout, /^HANDOVER_REPLACED_BY=chat-a$/m);
  assert.ok(!alive(old));
  assert.ok(alive(fresh));
  assert.ok(alive(other), 'the other chat\'s unopened key link stays open');
});

test('a busy link in the same chat blocks a new one and names the chat', t => {
  const f = fixture(t);
  const a = f.chat('chat-a');
  const pid = openKeys(a);
  writeFileSync(join(a.dir, 'opened'), '');
  const out = a.run('open', '--keys', KEY);
  assert.equal(out.status, 1);
  assert.match(out.stderr, /A private link is already open in chat-a\./);
  assert.doesNotMatch(out.stdout, /^HANDOVER_(LINK|SEND)=/m);
  assert.ok(alive(pid));
});

test('a second live view is refused from any chat and names the holder', t => {
  const f = fixture(t);
  const b = f.chat('chat-b');
  const view = f.place(join(f.home, 'links', 'chat-a'), { view: { display: ':97' }, cwd: join(f.root, 'chat-a') });
  const before = snapshot(join(f.home, 'links', 'chat-a'));
  const out = b.run('open', '--view', '--until', '**/done');
  assert.equal(out.status, 1);
  assert.match(out.stderr, /^A live view is already open in chat-a\.$/m);
  assert.doesNotMatch(out.stdout, /^HANDOVER_(LINK|SEND)=/m);
  assert.ok(alive(view));
  assert.deepEqual(snapshot(join(f.home, 'links', 'chat-a')), before);
  assert.ok(!existsSync(b.dir), 'a refused view writes nothing');
});

test('an older link\'s live view still counts; a dead one or another chat\'s form does not', t => {
  const f = fixture(t);
  const b = f.chat('chat-b');
  const old = f.place(f.home, { view: { display: ':97' }, cwd: '/root/.paseo/worktrees/x/modest-toad' });
  assert.match(b.run('open', '--view', '--until', '**/done').stderr, /A live view is already open in modest-toad\./);
  process.kill(old, 'SIGKILL');
  f.place(join(f.home, 'links', 'chat-a'), { form: { title: 'Pay' } });
  // Past the check, a HOME without the viewer stops at the missing tools: no browser is asked.
  const out = b.run('open', '--view', '--until', '**/done');
  assert.equal(out.status, 3, out.stderr);
  assert.match(out.stdout, /^HANDOVER_NEEDS=live-view$/m);
});

test('an older link in the shared place stays untouched while a chat opens and closes its own', t => {
  const f = fixture(t);
  const a = f.chat('chat-a');
  const old = f.place(f.home, { form: { title: 'Bank details' }, cwd: '/root/.paseo/worktrees/x/modest-toad' });
  writeFileSync(join(f.home, 'result.json'), '{"result":"done"}\n');
  writeFileSync(join(f.home, 'opened'), '');
  const before = snapshot(f.home);
  openKeys(a);
  assert.deepEqual(snapshot(f.home), before);
  assert.match(a.run('close').stdout, /^HANDOVER_RESULT=closed$/m);
  assert.deepEqual(snapshot(f.home), before);
  assert.ok(alive(old));
});

test('a view another chat is still starting counts; its mark goes away on every exit', t => {
  const f = fixture(t);
  const [a, b] = [f.chat('chat-a'), f.chat('chat-b')];
  mkdirSync(a.dir, { recursive: true });
  const opener = f.fakeWatcher();
  writeFileSync(join(a.dir, `view-opener.${opener}`), `${opener}\n`);
  assert.match(b.run('open', '--view', '--until', '**/done').stderr, /^A live view is already open in chat-a\.$/m);
  process.kill(opener, 'SIGKILL');
  f.viewTools();
  // Past both checks the open fails at the page, since this HOME has no browser; the opener's mark is gone.
  const out = b.run('open', '--view', '--until', '**/done');
  assert.equal(out.status, 1, out.stderr);
  assert.match(out.stderr, /No page is open in this browser session/);
  assert.deepEqual(readdirSync(b.dir).filter(name => name.startsWith('view-opener.')), []);
});

test('wait and close reach this chat\'s own older link in the shared place, never another chat\'s', async t => {
  const f = fixture(t);
  const [a, b] = [f.chat('chat-a'), f.chat('chat-b')];
  const own = f.place(f.home, { keys: { keys: [] }, cwd: join(f.root, 'chat-a') });
  const before = snapshot(f.home);
  assert.match(b.run('close').stderr, /No private link is open\./);
  assert.equal(b.run('wait').status, 1);
  assert.deepEqual(snapshot(f.home), before);
  const waited = a.start('wait');
  // A loaded machine can take a second to start node; the wait must find the older state first.
  await pause(1500);
  writeFileSync(join(f.home, 'result.json'), '{"result":"done","completionId":"c0ffee","notification":"not-requested"}\n');
  rmSync(join(f.home, 'state.json'));
  rmSync(join(f.home, 'watcher.pid'));
  process.kill(own, 'SIGKILL');
  const out = await waited;
  assert.match(out.stdout, /^HANDOVER_RESULT=done$/m);
  rmSync(join(f.home, 'result.json'));
  const again = f.place(f.home, { form: { title: 'Pay' }, session: 'chat-a', cwd: join(f.root, 'chat-a', 'app') });
  assert.match(a.run('close').stdout, /^HANDOVER_RESULT=closed$/m);
  assert.ok(!alive(again));
  assert.ok(!existsSync(join(f.home, 'watcher.pid')));
});

test('a chat with its own link and an older one closes its own at once and leaves the older one', t => {
  const f = fixture(t);
  const a = f.chat('chat-a');
  const old = f.place(f.home, { form: { title: 'Pay' }, cwd: join(f.root, 'chat-a') });
  const before = snapshot(f.home);
  openKeys(a);
  const closed = a.run('close');
  assert.match(closed.stdout, /^HANDOVER_RESULT=closed$/m);
  assert.match(a.run('wait').stdout, /^HANDOVER_RESULT=closed$/m);
  assert.deepEqual(snapshot(f.home), before);
  assert.ok(alive(old));
});

test('a finished link wakes only the chat that opened it', async t => {
  const f = fixture(t);
  const log = join(f.root, 'woken.log');
  writeFileSync(join(f.bin, 'paseo'), `#!/bin/sh
echo "$2" >> "${log}"
printf '{"status":"sent","agentId":"%s"}' "$2"
`);
  chmodSync(join(f.bin, 'paseo'), 0o755);
  const [a, b] = [f.chat('chat-a', { PASEO_AGENT_ID: 'agent-a' }), f.chat('chat-b', { PASEO_AGENT_ID: 'agent-b' })];
  openKeys(a);
  openKeys(b);
  const { port, key } = JSON.parse(readFileSync(join(b.dir, 'state.json'), 'utf8'));
  const saved = await fetch(`http://127.0.0.1:${port}/save`, { method: 'POST', headers: { 'x-hand-over-key': key, 'content-type': 'application/json' }, body: JSON.stringify({ keys: { [KEY]: 'abc123' } }) });
  assert.equal(saved.status, 200);
  const out = await b.start('wait');
  assert.match(out.stdout, /^HANDOVER_RESULT=done$/m);
  assert.match(out.stdout, /^HANDOVER_NOTIFICATION=notified$/m);
  assert.equal(readFileSync(log, 'utf8'), 'agent-b\n');
  assert.ok(existsSync(join(a.dir, 'watcher.pid')), 'chat A\'s link stays open');
});
