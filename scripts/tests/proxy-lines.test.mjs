import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { parseFirst, parseUpstream, resolveFirst, resolveUpstream } from '../../.agents/skills/browser/scripts/proxy-lines.mjs';

const LOGIN = 'tester';
const PASSWORD = 's3cret-pass';

/** A temporary home: every file a resolve reads or writes is inside it, never this computer's own. */
function home(t) {
  const dir = mkdtempSync(join(tmpdir(), 'proxy-lines-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const files = name => ({ file: join(dir, 'home/.wong-stack/camoufox', name), oldFile: join(dir, 'home/.wong-stack/camofox', name) });
  return { dir, envFile: join(dir, '.env'), otherEnv: join(dir, 'other.env'), files };
}

test('the upstream line parses with or without http://, splits the login at the last @, and a wrong shape gives none', () => {
  const want = { host: 'gw.example.test', port: 10000, username: 'abc', password: 'p@ss:w' };
  assert.deepEqual(parseUpstream('abc:p@ss:w@gw.example.test:10000'), want);
  assert.deepEqual(parseUpstream(' http://abc:p@ss:w@gw.example.test:10000/ '), want);
  assert.deepEqual(parseUpstream('HTTP://u:p@[2001:db8::1]:8080'), { host: '2001:db8::1', port: 8080, username: 'u', password: 'p' });
  for (const bad of ['', undefined, 'gw.example.test:10000', 'u@gw.example.test:1', ':p@gw.example.test:1', 'u:@gw.example.test:1',
    'u:p@gw.example.test', 'u:p@gw.example.test:0', 'u:p@gw.example.test:70000', 'socks5://u:p@gw.example.test:1', 'https://u:p@gw.example.test:1']) {
    assert.equal(parseUpstream(bad), null, String(bad));
  }
});

test('the first line parses with or without a login, and the upstream line still needs one', () => {
  assert.deepEqual(parseFirst('http://127.0.0.1:1055'), { host: '127.0.0.1', port: 1055 });
  assert.deepEqual(parseFirst(' 127.0.0.1:1055/ '), { host: '127.0.0.1', port: 1055 });
  assert.deepEqual(parseFirst('[::1]:1055'), { host: '::1', port: 1055 });
  assert.deepEqual(parseFirst('u:p@w@home.example.test:3128'), { host: 'home.example.test', port: 3128, username: 'u', password: 'p@w' });
  for (const bad of ['', undefined, '127.0.0.1', '127.0.0.1:0', 'u@127.0.0.1:1055', 'socks5://127.0.0.1:1055', 'https://127.0.0.1:1055', 'a b:1055']) {
    assert.equal(parseFirst(bad), null, String(bad));
  }
  assert.equal(parseUpstream('http://127.0.0.1:1055'), null);
});

test('a repo line wins and is saved for the computer with mode 600; a repo with none reads the computer file', t => {
  const { envFile, otherEnv, files } = home(t);
  const { file, oldFile } = files('upstream-proxy');
  const line = `${LOGIN}:${PASSWORD}@gw.example.test:10000`;
  const upstream = { host: 'gw.example.test', port: 10000, username: LOGIN, password: PASSWORD };
  assert.equal(resolveUpstream({ env: {}, envFile, file, oldFile }), null);
  assert.ok(!existsSync(file), 'nothing saved without a line');
  writeFileSync(envFile, `BROWSE_UPSTREAM_PROXY="${line}"\n`);
  assert.deepEqual(resolveUpstream({ env: {}, envFile, file, oldFile }), upstream);
  assert.equal(readFileSync(file, 'utf8'), `${line}\n`);
  assert.equal(statSync(file).mode & 0o777, 0o600);
  // A rotated key in the environment wins over the .env file and replaces the saved line.
  const rotated = `${LOGIN}:new-pass@gw.example.test:10001`;
  assert.equal(resolveUpstream({ env: { BROWSE_UPSTREAM_PROXY: rotated }, envFile, file, oldFile }).password, 'new-pass');
  assert.equal(readFileSync(file, 'utf8'), `${rotated}\n`);
  assert.equal(statSync(file).mode & 0o777, 0o600);
  assert.deepEqual(resolveUpstream({ env: {}, envFile: otherEnv, file, oldFile }), { ...upstream, port: 10001, password: 'new-pass' });
  // A repo line of the wrong shape gives no route and leaves the saved line alone.
  assert.equal(resolveUpstream({ env: { BROWSE_UPSTREAM_PROXY: 'not a line' }, envFile, file, oldFile }), null);
  assert.equal(readFileSync(file, 'utf8'), `${rotated}\n`);
});

test('the old camofox file is read only while the new file is missing, and a blank new file stops that', t => {
  const { otherEnv, files } = home(t);
  for (const [name, resolve, line, want] of [
    ['upstream-proxy', resolveUpstream, `${LOGIN}:${PASSWORD}@gw.example.test:10000`, { host: 'gw.example.test', port: 10000, username: LOGIN, password: PASSWORD }],
    ['first-proxy', resolveFirst, 'http://127.0.0.1:1056', { host: '127.0.0.1', port: 1056 }],
  ]) {
    const { file, oldFile } = files(name);
    mkdirSync(dirname(oldFile), { recursive: true });
    writeFileSync(oldFile, `${line}\n`);
    assert.deepEqual(resolve({ env: {}, envFile: otherEnv, file, oldFile }), want, name);
    assert.equal(readFileSync(file, 'utf8'), `${line}\n`, `${name} is copied over`);
    writeFileSync(file, '');
    assert.equal(resolve({ env: {}, envFile: otherEnv, file, oldFile }), null, name);
  }
});

test('the first line is saved like the upstream line, under its own key and file', t => {
  const { envFile, otherEnv, files } = home(t);
  const { file, oldFile } = files('first-proxy');
  assert.equal(resolveFirst({ env: {}, envFile, file, oldFile }), null);
  assert.equal(resolveFirst({ env: { BROWSE_UPSTREAM_PROXY: `${LOGIN}:${PASSWORD}@gw.example.test:1` }, envFile, file, oldFile }), null, 'the upstream key is not a first line');
  writeFileSync(envFile, 'BROWSE_FIRST_PROXY=http://127.0.0.1:1055\n');
  assert.deepEqual(resolveFirst({ env: {}, envFile, file, oldFile }), { host: '127.0.0.1', port: 1055 });
  assert.equal(readFileSync(file, 'utf8'), 'http://127.0.0.1:1055\n');
  assert.equal(statSync(file).mode & 0o777, 0o600);
  assert.deepEqual(resolveFirst({ env: {}, envFile: otherEnv, file, oldFile }), { host: '127.0.0.1', port: 1055 });
  assert.equal(resolveFirst({ env: { BROWSE_FIRST_PROXY: 'not a line' }, envFile, file, oldFile }), null);
  assert.equal(readFileSync(file, 'utf8'), 'http://127.0.0.1:1055\n');
});

test('an unquoted .env line keeps a # inside the password and drops only a comment after a space', t => {
  const { envFile, files } = home(t);
  const { file, oldFile } = files('upstream-proxy');
  writeFileSync(envFile, 'BROWSE_UPSTREAM_PROXY=http://user:pa#ss@gw.example.test:8080 # home line\n');
  assert.deepEqual(resolveUpstream({ env: {}, envFile, file, oldFile }), { host: 'gw.example.test', port: 8080, username: 'user', password: 'pa#ss' });
});
