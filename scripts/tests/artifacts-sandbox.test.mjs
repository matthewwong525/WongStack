import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { runInNewContext } from 'node:vm';

// Exercise the installed SDK's lifecycle code, without importing Workers-only
// modules or replacing its call accounting, idle checks or disconnect logic.
function sdkClient() {
  const require = createRequire(new URL('../pilots/artifacts/package.json', import.meta.url));
  const ciRequire = createRequire(new URL('../pilots/artifacts/node_modules/@cloudflare/ci/package.json', import.meta.url));
  const entry = require.resolve('@cloudflare/sandbox');
  assert.equal(ciRequire.resolve('@cloudflare/sandbox'), entry, 'CI must use the same corrected SDK');
  const dist = dirname(entry);
  assert.equal(JSON.parse(readFileSync(join(dist, '..', 'package.json'))).version, '0.12.5');
  const bundle = readdirSync(dist).filter(file => /^sandbox-.*\.js$/.test(file))
    .map(file => readFileSync(join(dist, file), 'utf8')).find(source => source.includes('var ContainerControlClient = class'));
  assert.ok(bundle, 'Installed RPC client source must be available');
  const wrapperStart = bundle.indexOf('function wrapStub(');
  const wrapperEnd = bundle.indexOf('\n/**', wrapperStart);
  const clientStart = bundle.indexOf('var ContainerControlClient = class');
  const clientEnd = bundle.indexOf('//#endregion', clientStart);
  assert.ok(wrapperStart >= 0 && wrapperEnd > wrapperStart && clientEnd > clientStart);
  const timeouts = new Map(), intervals = new Map();
  const timer = (map, callback) => { const id = {}; map.set(id, callback); return id; };
  const connection = { connected: true, stats: { imports: 1, exports: 1 }, disconnects: 0,
    isConnected() { return this.connected; }, getStats() { return this.stats; },
    disconnect() { this.disconnects++; this.connected = false; }, rpc() { return this.remote; } };
  const logger = { debug() {}, warn() {} };
  const Client = runInNewContext(`${bundle.slice(wrapperStart, wrapperEnd)}\n${bundle.slice(clientStart, clientEnd)}\nContainerControlClient`, {
    ContainerControlConnection: class { constructor() { return connection; } },
    DEFAULT_IDLE_DISCONNECT_MS: 1000, BUSY_POLL_INTERVAL_MS: 1000,
    IDLE_IMPORT_THRESHOLD: 1, IDLE_EXPORT_THRESHOLD: 1,
    createNoOpLogger: () => logger, withSpan: (_name, _attributes, callback) => callback(),
    translateRPCError: error => { throw error; },
    setTimeout: callback => timer(timeouts, callback), clearTimeout: id => timeouts.delete(id),
    setInterval: callback => timer(intervals, callback), clearInterval: id => intervals.delete(id),
  });
  const client = new Client({ stub: {}, logger });
  const expireIdleTimers = () => {
    for (const [id, callback] of [...timeouts]) { timeouts.delete(id); callback(); }
  };
  return { client, connection, timeouts, intervals, expireIdleTimers };
}

test('installed RPC client keeps a pending command alive at the capnweb idle baseline', async () => {
  const { client, connection, timeouts, intervals, expireIdleTimers } = sdkClient();
  let finish;
  connection.remote = { commands: { execute: () => new Promise(resolve => { finish = resolve; }) } };
  const pending = client.commands.execute('test -c /dev/fuse');
  // Reproduce the upstream race: the RPC promise is pending while session
  // statistics temporarily show only the two bootstrap references.
  for (const poll of intervals.values()) poll();
  expireIdleTimers();
  assert.equal(connection.disconnects, 0, 'A pending call cannot lose its main stub');
  assert.equal(timeouts.size, 0, 'Pending calls must not arm idle disconnect');
  finish({ exitCode: 0 });
  assert.equal((await pending).exitCode, 0);
  assert.equal(timeouts.size, 1, 'Settlement must restore idle cleanup');
  expireIdleTimers();
  assert.equal(connection.disconnects, 1);
  assert.equal(intervals.size, 0);
});

test('installed RPC client releases rejected calls and retains active stream exports', async () => {
  const { client, connection, timeouts, expireIdleTimers } = sdkClient();
  let rejectCall;
  connection.remote = { commands: { execute: () => new Promise((_resolve, reject) => { rejectCall = reject; }) } };
  const pending = client.commands.execute('probe');
  const rejected = assert.rejects(pending, /probe failed/);
  rejectCall(new Error('probe failed'));
  await rejected;
  assert.equal(timeouts.size, 1, 'Rejected calls must also release their busy count');
  // A settled command may leave a stream exported: stats must still keep the
  // connection alive until that stream completes or is cancelled.
  connection.stats = { imports: 1, exports: 2 };
  expireIdleTimers();
  assert.equal(connection.disconnects, 0);
  client.pollBusyState();
  assert.equal(timeouts.size, 0);
  connection.stats = { imports: 1, exports: 1 };
  client.pollBusyState();
  expireIdleTimers();
  assert.equal(connection.disconnects, 1);
});
