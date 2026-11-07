import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fakeLibrary } from './fixtures/fake-camoufox-library.mjs';

const SCRIPT = fileURLToPath(new URL('../../.agents/skills/browser/scripts/launch-config.py', import.meta.url));
const PINS = ['--library', '0.5.9', '--build', 'v158.0.1-beta.41'];
/** The system the browser tells sites: this computer's own. */
const HOST_OS = { darwin: 'macos', win32: 'windows' }[process.platform] ?? 'linux';

/** Runs launch-config.py on a fake library; resolves to its exit code and its one JSON line. */
function run(library, ...args) {
  return runPinned(PINS, library, ...args);
}

function runPinned(pins, library, ...args) {
  const dir = mkdtempSync(join(tmpdir(), 'launch-config-test-'));
  try {
    const lib = fakeLibrary(dir, library);
    const done = spawnSync('python3', [SCRIPT, ...pins, ...args], { encoding: 'utf8', env: { PATH: process.env.PATH, PYTHONPATH: lib, HOME: dir } });
    return { status: done.status, out: JSON.parse(done.stdout), stdout: done.stdout, stderr: done.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('the launch config is one JSON line: versions, the context options, English for the proxy country, the driver', () => {
  const { status, out, stdout } = run({}, '--proxy', 'http://127.0.0.1:4000', '--display', ':7');
  assert.equal(status, 0);
  assert.equal(stdout.trim().split('\n').length, 1, 'the library\'s own lines stay off stdout');
  assert.deepEqual(Object.keys(out).sort(), ['build', 'driver', 'library', 'locale', 'options']);
  assert.equal(out.library, '0.5.9');
  assert.equal(out.build, '158.0.1-beta.41');
  assert.equal(out.locale, 'en-CA');
  assert.match(out.driver, /playwright[/\\]driver[/\\]package$/);
  const { given, ...options } = out.options;
  assert.deepEqual(given, { os: HOST_OS, headless: false, virtual_display: ':7', humanize: true, enable_cache: true, geoip: '203.0.113.7', locale: 'en-CA', proxy: { server: 'http://127.0.0.1:4000' }, fingerprint: null });
  assert.equal(options.no_viewport, true);
  assert.equal(options.executable_path, '/fake/camoufox-bin');
});

test('a failed country lookup starts in US English with no geoip', () => {
  const { out } = run({ country: null });
  assert.equal(out.locale, 'en-US');
  assert.equal(out.options.given.geoip, null);
  assert.equal(out.options.given.headless, true);
});

test('--window shows the browser on the computer\'s own screen, with no virtual display and the computer\'s own system', () => {
  const { status, out } = run({}, '--window');
  assert.equal(status, 0);
  assert.equal(out.options.given.headless, false);
  assert.equal(out.options.given.virtual_display, null);
  assert.equal(out.options.given.os, HOST_OS);
});

test('--check gives only the versions', () => {
  assert.deepEqual(run({}, '--check').out, { library: '0.5.9', build: '158.0.1-beta.41' });
});

test('a library, pin or build that disagrees is refused, naming the part to install', () => {
  for (const [library, needs, reason] of [
    [{ version: '0.5.8' }, 'library', /library is 0\.5\.8, not 0\.5\.9/],
    [{ pin: 'v159.0.0-beta.1' }, 'pins', /pins v159\.0\.0-beta\.1, not v158\.0\.1-beta\.41/],
    [{ installed: '158.0.0-beta.40' }, 'build', /158\.0\.1-beta\.41 is not installed \(158\.0\.0-beta\.40 is\)/],
    [{ installed: null }, 'build', /158\.0\.1-beta\.41 is not installed$/],
  ]) {
    const { status, out } = run(library);
    assert.equal(status, 3);
    assert.equal(out.needs, needs);
    assert.match(out.error, reason);
  }
});

test('the identity is made once per library and build, then each start reuses it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'launch-config-fingerprint-'));
  const file = join(dir, 'fingerprint.json');
  try {
    const first = run({}, '--fingerprint', file);
    assert.equal(first.out.fingerprint, 'new');
    assert.equal(statSync(file).mode & 0o777, 0o600);
    const again = run({}, '--fingerprint', file, '--proxy', 'http://127.0.0.1:4001');
    assert.equal(again.out.fingerprint, 'saved');
    assert.deepEqual(again.out.options.given.fingerprint, first.out.options.given.fingerprint);
    assert.equal(again.out.options.given.proxy.server, 'http://127.0.0.1:4001', 'the proxy and locale still follow each start');
    const raised = runPinned(['--library', '0.6.0', '--build', 'v159.0.0-beta.1'], { version: '0.6.0', pin: 'v159.0.0-beta.1', installed: '159.0.0-beta.1' }, '--fingerprint', file);
    assert.equal(raised.out.fingerprint, 'new');
    assert.notDeepEqual(raised.out.options.given.fingerprint, first.out.options.given.fingerprint);
    writeFileSync(file, '{not json');
    assert.equal(run({}, '--fingerprint', file).out.fingerprint, 'new', 'a broken file is made again');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a Mac\'s launch and identity tell macos; one saved with no system, or for another, is made again, then reused', () => {
  // CI runs on Linux: the fake library makes Python report another system, as on that computer.
  const dir = mkdtempSync(join(tmpdir(), 'launch-config-system-'));
  const file = join(dir, 'fingerprint.json');
  const saved = () => JSON.parse(readFileSync(file, 'utf8'));
  const linux = (...args) => run({ platform: 'linux' }, '--fingerprint', file, ...args);
  const mac = (...args) => run({ platform: 'darwin' }, '--fingerprint', file, ...args);
  try {
    const made = linux();
    assert.equal(made.out.options.given.os, 'linux', 'the pretended system reaches the script');
    const unmarked = saved();
    delete unmarked.os;
    writeFileSync(file, JSON.stringify(unmarked));
    assert.equal(linux().out.fingerprint, 'saved', 'a file with no system was made as Linux');
    const remade = mac();
    assert.equal(remade.status, 0);
    assert.equal(remade.out.options.given.os, 'macos', 'the launch tells macos');
    assert.equal(remade.out.fingerprint, 'new', 'a file with no system is made again on a Mac');
    assert.equal(remade.out.options.given.fingerprint.os, 'macos', 'the new identity is made for macos');
    assert.equal(saved().os, 'macos', 'the file records the system');
    const reused = mac();
    assert.equal(reused.out.fingerprint, 'saved');
    assert.deepEqual(reused.out.options.given.fingerprint, remade.out.options.given.fingerprint);
    assert.equal(linux().out.fingerprint, 'new', 'an identity saved for macos is made again on Linux');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('--addon loads each add-on folder, lets it open its own tab, and keeps its data when it is taken out for an update', () => {
  const { status, out } = run({}, '--addon', '/data/addons/pm@maker.example');
  assert.equal(status, 0);
  assert.deepEqual(out.options.given.addons, ['/data/addons/pm@maker.example']);
  assert.equal(out.options.given.allow_addon_new_tab, true);
  assert.deepEqual(out.options.given.firefox_user_prefs, { 'extensions.webextensions.keepStorageOnUninstall': true, 'extensions.webextensions.keepUuidOnUninstall': true });
  const both = run({}, '--addon', '/data/addons/pm@maker.example', '--addon', '/data/addons/blocker@maker.example');
  assert.deepEqual(both.out.options.given.addons, ['/data/addons/pm@maker.example', '/data/addons/blocker@maker.example'], 'each --addon loads its folder');
  const without = run({}).out.options.given;
  for (const key of ['addons', 'allow_addon_new_tab', 'firefox_user_prefs']) assert.ok(!(key in without), `${key} is only for a start with an add-on`);
});
