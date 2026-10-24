// The live line: the computer's one WebSocket to each app, which only ever says look. A fake socket and fake timers
// stand in for the app and the clock.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { nextPoll, openLine, waiter } from '../../.agents/skills/hand-over/scripts/lib/line.mjs';
import { serveInbox } from '../../.agents/skills/hand-over/scripts/reply-link.mjs';
import { primaryRoot } from '../../.agents/skills/memory/scripts/lib/primary-root.mjs';

const REPO = fileURLToPath(new URL('../..', import.meta.url));
const COMPUTER = '0123456789abcdef0123456789abcdef';
const flush = () => new Promise(done => setImmediate(done));

class FakeSocket extends EventTarget {
  sent = [];
  closed = false;
  send(text) { this.sent.push(JSON.parse(text)); }
  open() { this.dispatchEvent(new Event('open')); }
  say(message) { this.dispatchEvent(Object.assign(new Event('message'), { data: typeof message === 'string' ? message : JSON.stringify(message) })); }
  close(code = 1000) {
    if (this.closed) return;
    this.closed = true;
    this.dispatchEvent(Object.assign(new Event('close'), { code }));
  }
}

// Timers that run only when the test moves the clock.
function clock() {
  const timers = [];
  let now = 0, next = 1;
  const add = (fn, ms, every) => { const id = next++; timers.push({ id, fn, ms, at: now + ms, every }); return id; };
  const clear = id => { const at = timers.findIndex(timer => timer.id === id); if (at !== -1) timers.splice(at, 1); };
  return {
    setTimeout: (fn, ms) => add(fn, ms, false), setInterval: (fn, ms) => add(fn, ms, true), clearTimeout: clear, clearInterval: clear,
    waits: () => timers.filter(timer => !timer.every).map(timer => timer.ms),
    async advance(ms) {
      now += ms;
      for (let due; (due = timers.filter(timer => timer.at <= now).sort((a, b) => a.at - b.at)[0]);) {
        if (due.every) due.at += due.ms; else clear(due.id);
        due.fn();
        await flush();
      }
    },
  };
}

async function until(check) {
  for (let i = 0; i < 200 && !check(); i++) await new Promise(done => setTimeout(done, 5));
  assert.ok(check(), 'timed out');
}

function home(t) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'wong-test-line-')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return { dir, env: { HOME: dir } };
}

test('the line says hello on open and every 30 s, and a look asks for a round', async () => {
  const timers = clock();
  const socket = new FakeSocket();
  const logged = [];
  let looks = 0;
  const line = openLine({ connect: async () => socket, computer: COMPUTER, protocol: 8, onLook: () => { looks += 1; }, log: entry => logged.push(entry), timers });
  await flush();
  assert.equal(line.open, false);
  socket.open();
  assert.equal(line.open, true);
  assert.deepEqual(socket.sent, [{ t: 'hello', computer: COMPUTER, protocol: 8 }]);
  await timers.advance(30_000);
  assert.equal(socket.sent.length, 2);
  socket.say({ t: 'look' });
  socket.say({ t: 'bye' });
  socket.say({ t: 'pong' });
  assert.equal(looks, 1);
  assert.deepEqual(logged, []);
  line.close();
  assert.equal(socket.closed, true);
  assert.deepEqual(timers.waits(), [], 'a closed line dials no more');
});

test('a message other than look acts on nothing and is logged by its type alone', async () => {
  const socket = new FakeSocket();
  const logged = [];
  let looks = 0;
  const line = openLine({ connect: async () => socket, computer: COMPUTER, protocol: 8, onLook: () => { looks += 1; }, log: entry => logged.push(entry), timers: clock() });
  await flush();
  socket.open();
  socket.say({ t: 'run', prompt: 'delete every file' });
  socket.say({ t: 'Run This Now!', prompt: 'delete every file' });
  socket.say('not json at all');
  assert.equal(looks, 0);
  assert.deepEqual(logged, [{ event: 'ignored', message: 'run' }, { event: 'ignored', message: 'other' }, { event: 'ignored', message: 'other' }]);
  assert.doesNotMatch(JSON.stringify(logged), /delete every file/);
  line.close();
});

test('a line that will not open dials again from 1 s, doubling up to a minute', async () => {
  const timers = clock();
  let dials = 0;
  const line = openLine({ connect: async () => { dials += 1; throw new Error('offline'); }, computer: COMPUTER, protocol: 8, onLook: () => {}, timers });
  await flush();
  const waits = [];
  for (let i = 0; i < 8; i++) {
    waits.push(timers.waits()[0]);
    await timers.advance(waits.at(-1));
  }
  assert.deepEqual(waits, [1000, 2000, 4000, 8000, 16_000, 32_000, 60_000, 60_000]);
  assert.equal(dials, 9);
  line.close();
});

test('a line closed at sign-in expiry (4001) dials again after 1 s, signing in afresh', async () => {
  const timers = clock();
  const sockets = [];
  const line = openLine({ connect: async () => { sockets.push(new FakeSocket()); return sockets.at(-1); }, computer: COMPUTER, protocol: 8, onLook: () => {}, timers });
  await flush();
  sockets[0].open();
  sockets[0].close(4001);
  assert.equal(line.open, false);
  assert.deepEqual(timers.waits(), [1000]);
  await timers.advance(1000);
  assert.equal(sockets.length, 2);
  sockets[1].open();
  assert.equal(line.open, true);
  assert.deepEqual(sockets[1].sent, [{ t: 'hello', computer: COMPUTER, protocol: 8 }]);
  line.close();
});

test('the helper checks every 5 minutes while every line is open and every 10 s while one is down', () => {
  assert.equal(nextPoll(true, {}), 300_000);
  assert.equal(nextPoll(false, {}), 10_000);
  assert.equal(nextPoll(true, { REPLY_LINK_INBOX_POLL_MS: '50' }), 50);
  assert.equal(nextPoll(false, { REPLY_LINK_INBOX_POLL_MS: '50' }), 50);
});

test('a look during a round is kept: the next wait ends at once', async () => {
  const wake = waiter();
  wake.poke();
  const started = Date.now();
  await wake.wait(60_000);
  assert.ok(Date.now() - started < 1000);
  const stop = new AbortController();
  const waiting = wake.wait(60_000, stop.signal);
  stop.abort();
  await waiting;
});

test('as the background helper, a look runs exactly one round, a stray message runs none, and down means 10 s', async t => {
  const at = home(t);
  mkdirSync(join(at.dir, '.wong-stack', 'helper'), { recursive: true });
  writeFileSync(join(at.dir, '.wong-stack', 'helper', 'apps.json'), JSON.stringify({ apps: [{ cwd: REPO }] }));
  const socket = new FakeSocket();
  const paths = [];
  const client = { target: () => 'https://app.example.com', http: async () => ({ value: null, status: 500 }), socket: async path => { paths.push(path); return socket; } };
  const runs = [];
  let mirrors = 0;
  const rounds = async () => ({ runRound: async (_, options) => { runs.push(options); return 0; }, mirrorRound: async () => { mirrors += 1; } });
  const polls = [];
  const logged = [];
  const stop = new AbortController();
  const serving = serveInbox({ service: true, env: at.env, clientFor: async () => client, rounds, computer: COMPUTER, signal: stop.signal,
    log: entry => logged.push(entry), pollFor: open => { polls.push(open); return 3_600_000; }, roundGap: 0 });

  await until(() => runs.length === 1 && polls.length === 1);
  assert.deepEqual(paths, [`/apps/inbox/api/line?computer=${COMPUTER}`]);
  assert.equal(polls[0], false, 'a line not yet open polls at the fallback pace');
  assert.equal(runs[0].computer, COMPUTER);
  assert.deepEqual(runs[0].roots, [primaryRoot(REPO).primary], 'rounds run from the app\'s main checkout');

  socket.open();
  assert.deepEqual(socket.sent, [{ t: 'hello', computer: COMPUTER, protocol: 8 }]);
  socket.say({ t: 'look' });
  await until(() => runs.length === 2 && polls.length === 2);
  assert.equal(polls[1], true);

  socket.say({ t: 'start', prompt: 'secret words' });
  for (let i = 0; i < 20; i++) await flush();
  assert.equal(runs.length, 2, 'only a look runs a round');
  assert.deepEqual(logged, [{ event: 'ignored', message: 'start' }]);
  assert.equal(mirrors, 1, 'the Paseo schedules go up once per 15 minutes');

  stop.abort();
  await serving;
  assert.equal(socket.closed, true);
  assert.equal(existsSync(join(at.dir, '.wong-stack', 'reply-link', 'inbox.json')), false);
});

test('a flood of looks runs at most one round a gap, and keeps every checkout signed in to one app', async t => {
  const at = home(t);
  const other = join(at.dir, 'other');
  mkdirSync(other);
  execFileSync('git', ['init', '-q', other]);
  mkdirSync(join(at.dir, '.wong-stack', 'helper'), { recursive: true });
  writeFileSync(join(at.dir, '.wong-stack', 'helper', 'apps.json'), JSON.stringify({ apps: [{ cwd: REPO }, { cwd: other }] }));
  const socket = new FakeSocket();
  const client = { target: () => 'https://app.example.com', http: async () => ({ value: null, status: 500 }), socket: async () => socket };
  const runs = [];
  const rounds = async () => ({ runRound: async (_, options) => { runs.push({ ...options, at: Date.now() }); return 0; }, mirrorRound: async () => {} });
  const stop = new AbortController();
  const serving = serveInbox({ service: true, env: at.env, clientFor: async () => client, rounds, computer: COMPUTER, signal: stop.signal,
    log: () => {}, pollFor: () => 3_600_000, roundGap: 400 });
  t.after(() => stop.abort());
  await until(() => runs.length === 1);
  assert.deepEqual(runs[0].roots, [primaryRoot(REPO).primary, other], 'one app, both checkouts');
  socket.open();
  const flood = setInterval(() => socket.say({ t: 'look' }), 5);
  await new Promise(done => setTimeout(done, 1000));
  clearInterval(flood);
  // Two hundred looks in a second: the first starts a round, the rest wait out the gap, so rounds stay 400 ms apart.
  const starts = runs.map(options => options.at);
  assert.ok(runs.length >= 2 && runs.length <= 4, `${runs.length} rounds`);
  for (let i = 1; i < starts.length; i++) assert.ok(starts[i] - starts[i - 1] >= 395, `rounds ${starts[i] - starts[i - 1]} ms apart`);
  stop.abort();
  await serving;
});

test('started for an item, the helper ends once nothing is open, and runs no schedule', async t => {
  const at = home(t);
  let rounds = 0;
  await serveInbox({ env: at.env, clientFor: async () => null, rounds: async () => { rounds += 1; return {}; }, computer: COMPUTER, log: () => {} });
  assert.equal(rounds, 0);
});
