import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkLogins, chooseName, hostOf, LIMITS, slug } from '../../.agents/skills/verify/scripts/passwords.mjs';
import { parseExport, siteUrl } from '../../.agents/skills/verify/scripts/passwords-page.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, '.agents/skills/verify/scripts/hand-over.mjs');
const KEY = /#key=([0-9a-f]{64})$/m;
const SECRET = 'hunter2-Secret!';

// A HOME of its own, and a fake agent-browser first on PATH. It logs each call's argv to calls.log,
// and keeps a vault in vault.json with the password it read from stdin; `auth list --json` prints
// agent-browser 0.38.1's shape. A password of `fail` fails its save; a `fail-list` file fails the list.
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-passwords-'));
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const file = name => join(root, name);
  writeFileSync(join(bin, 'agent-browser'), `#!${process.execPath}
const { appendFileSync, existsSync, readFileSync, writeFileSync } = require('node:fs');
const args = process.argv.slice(2);
appendFileSync(${JSON.stringify(file('calls.log'))}, 'agent-browser ' + args.join(' ') + '\\n');
const vaultFile = ${JSON.stringify(file('vault.json'))};
const vault = existsSync(vaultFile) ? JSON.parse(readFileSync(vaultFile, 'utf8')) : [];
const flag = name => args[args.indexOf(name) + 1];
const say = data => console.log(JSON.stringify({ success: true, data, error: null }));
switch (args.slice(0, 2).join(' ')) {
  case 'auth list':
    if (existsSync(${JSON.stringify(file('fail-list'))})) process.exit(1);
    say({ profiles: vault.map(({ name, url, username }) => ({ name, url, username })) });
    break;
  case 'auth save': {
    const password = readFileSync(0, 'utf8');
    if (password === 'fail') { console.error('✗ Failed to save'); process.exit(1); }
    writeFileSync(vaultFile, JSON.stringify([...vault.filter(p => p.name !== args[2]), { name: args[2], url: flag('--url'), username: flag('--username'), password }]));
    console.log('✓ Saved ' + args[2]);
    break;
  }
  case 'tab list': say({ tabs: [] }); break;
  case 'stream status': say({ connected: true, enabled: true, port: 9 }); break;
}
`);
  chmodSync(join(bin, 'agent-browser'), 0o755);
  const env = { ...process.env, HOME: root, PATH: `${bin}:/usr/bin:/bin`, HANDOVER_POLL_MS: '50' };
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { env, encoding: 'utf8', timeout: 30_000 });
  const state = join(root, '.wong-stack/hand-over');
  t.after(() => {
    run('close');
    rmSync(root, { recursive: true, force: true });
  });
  return {
    run,
    state,
    set: (name, value) => writeFileSync(file(name), value),
    calls: () => (existsSync(file('calls.log')) ? readFileSync(file('calls.log'), 'utf8').trim().split('\n').filter(Boolean) : []),
    vault: () => (existsSync(file('vault.json')) ? JSON.parse(readFileSync(file('vault.json'), 'utf8')) : []),
    stateFiles: () => (existsSync(state) ? readdirSync(state).map(name => readFileSync(join(state, name), 'utf8')).join('\n') : ''),
  };
}

/** Runs `open`, asserts it worked, and returns the page's port and the key. */
function opened(f, ...args) {
  const out = f.run('open', '--local', ...args);
  assert.equal(out.status, 0, out.stderr);
  return { key: KEY.exec(out.stdout)?.[1], port: JSON.parse(readFileSync(join(f.state, 'state.json'), 'utf8')).port };
}

/** Calls a route with the key header unless `key` is null, a GET without a body; resolves to the status and JSON. */
async function route(port, key, path, body) {
  const response = await fetch(`http://127.0.0.1:${port}/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: key === null ? {} : { 'x-hand-over-key': key },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, json: text ? JSON.parse(text) : null };
}

const login = (url, username, password = SECRET) => ({ url, username, password });

test('open --passwords serves the password page and touches no browser page', async t => {
  const f = fixture(t);
  const { port, key } = opened(f, '--passwords');
  assert.match(key, /^[0-9a-f]{64}$/);
  assert.deepEqual(f.calls(), [], 'no viewport, tabs, or live feed');
  const page = await fetch(`http://127.0.0.1:${port}/`);
  assert.match(await page.text(), /Save logins for your agent/);
  assert.match((await fetch(`http://127.0.0.1:${port}/page.mjs`)).headers.get('content-type'), /javascript/);
  assert.match(await (await fetch(`http://127.0.0.1:${port}/page.mjs`)).text(), /export function parseExport/);
  assert.equal((await route(port, key, 'fields')).status, 404, 'no field routes');
  assert.equal((await route(port, key, 'focus', { ref: 0 })).status, 404);
  const upgrade = await new Promise(done => {
    const socket = connect(port, '127.0.0.1', () => socket.write(`GET /stream?key=${key} HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n`));
    let text = '';
    socket.on('data', chunk => { text += chunk; }).on('close', () => done(text));
  });
  assert.match(upgrade, /^HTTP\/1\.1 404/, 'no live feed');
  assert.deepEqual(f.calls(), []);
});

test('a password link refuses to open while a hand-over is open, and the reverse', t => {
  const f = fixture(t);
  opened(f);
  const passwords = f.run('open', '--local', '--passwords');
  assert.equal(passwords.status, 1);
  assert.match(passwords.stderr, /already open/);
  assert.equal(f.run('close').stdout.trim(), 'HANDOVER_RESULT=closed');

  opened(f, '--passwords');
  const before = f.calls().length;
  const handOver = f.run('open', '--local');
  assert.equal(handOver.status, 1);
  assert.match(handOver.stderr, /already open/);
  assert.deepEqual(f.calls().slice(before), [], 'the refused hand-over touched nothing');
});

test('--passwords takes no --until or --until-gone', t => {
  const f = fixture(t);
  assert.equal(f.run('open', '--passwords', '--until', '**').status, 2);
  assert.equal(f.run('open', '--passwords', '--until-gone', '#x').status, 2);
});

test('POST /save needs the key and refuses a bad or over-limit body before calling agent-browser', async t => {
  const f = fixture(t);
  const { port, key } = opened(f, '--passwords');
  const good = { logins: [login('https://www.netflix.com/login', 'me@mail.com')] };
  assert.equal((await route(port, null, 'save', good)).status, 403);
  assert.equal((await route(port, '0'.repeat(64), 'save', good)).status, 403);
  assert.equal((await route(port, null, 'done', {})).status, 403);
  assert.equal((await route(port, key, 'save')).status, 405);
  const long = 'x'.repeat(LIMITS.field + 1);
  const bad = ['{', '[]', {}, { logins: [] }, { logins: [{}] }, { logins: [login('ftp://files.example.com', 'me')] }, { logins: [login('android://abc@com.netflix/', 'me')] },
    { logins: [login('https://a.example.com', 'me\r\nX-Evil: 1')] }, { logins: [login('https://a.example.com', long)] }, { logins: [login('https://a.example.com', 'me', '')] }];
  for (const body of bad) assert.equal((await route(port, key, 'save', body)).status, 400, JSON.stringify(body).slice(0, 80));
  const many = { logins: Array.from({ length: LIMITS.logins + 1 }, (_, i) => login(`https://s${i}.example.com`, 'me')) };
  assert.equal((await route(port, key, 'save', many)).status, 413, 'too many logins');
  assert.equal((await route(port, key, 'save', { logins: [login('https://a.example.com', 'me')], pad: 'x'.repeat(LIMITS.body) })).status, 413, 'too big a body');
  assert.deepEqual(f.calls(), [], 'nothing reached agent-browser');
  assert.deepEqual(f.vault(), []);
});

test('POST /save sends the password only on stdin, replaces a repeat, and numbers a second account', async t => {
  const f = fixture(t);
  f.set('vault.json', JSON.stringify([{ name: 'costco-com', url: 'https://www.costco.com/', username: 'me@mail.com', password: 'old' }]));
  const { port, key } = opened(f, '--passwords');
  const first = await route(port, key, 'save', { logins: [login('https://www.netflix.com/login', 'me@mail.com'), login('https://netflix.com/', 'kid@mail.com'), login('https://costco.com/login', 'me@mail.com', 'new-costco')] });
  assert.deepEqual(first, { status: 200, json: { saved: [{ name: 'netflix-com', host: 'netflix.com' }, { name: 'netflix-com-2', host: 'netflix.com' }, { name: 'costco-com', host: 'costco.com' }], failed: [] } });
  assert.deepEqual(f.calls(), [
    'agent-browser auth list --json',
    'agent-browser auth save netflix-com --url https://www.netflix.com/login --username me@mail.com --password-stdin',
    'agent-browser auth save netflix-com-2 --url https://netflix.com/ --username kid@mail.com --password-stdin',
    'agent-browser auth save costco-com --url https://costco.com/login --username me@mail.com --password-stdin',
  ]);
  const again = await route(port, key, 'save', { logins: [login('https://login.netflix.com/', 'kid@mail.com', 'changed'), login('https://netflix.com/', 'third@mail.com')] });
  assert.deepEqual(again.json.saved.map(saved => saved.name), ['login-netflix-com', 'netflix-com-3'], 'another host gets its own name; a third account gets -3');
  const byName = Object.fromEntries(f.vault().map(entry => [entry.name, entry]));
  assert.equal(byName['costco-com'].password, 'new-costco', 'the same host and username replaced the old password');
  assert.equal(Object.keys(byName).length, 5);
  assert.equal(byName['netflix-com'].password, SECRET, 'the password arrived on stdin');
  assert.ok(!f.calls().some(line => line.includes(SECRET) || line.includes('new-costco')), 'no password in argv');
  assert.ok(!f.stateFiles().includes(SECRET), 'no password in the link\'s files or log');
});

test('a failed save names its index, and a failed list answers 503', async t => {
  const f = fixture(t);
  const { port, key } = opened(f, '--passwords');
  const { json } = await route(port, key, 'save', { logins: [login('https://a.example.com', 'me', 'fail'), login('https://b.example.com', 'me')] });
  assert.deepEqual(json, { saved: [{ name: 'b-example-com', host: 'b.example.com' }], failed: [0] });
  f.set('fail-list', '');
  assert.equal((await route(port, key, 'save', { logins: [login('https://c.example.com', 'me')] })).status, 503);
});

test('Done ends the link, and wait prints the saved names and nothing else from the request', async t => {
  const f = fixture(t);
  const { port, key } = opened(f, '--passwords', '--minutes', '5');
  await route(port, key, 'save', { logins: [login('https://www.netflix.com/login', 'me@mail.com'), login('https://www.costco.com/', 'shopper@mail.com')] });
  await route(port, key, 'save', { logins: [login('https://www.netflix.com/login', 'me@mail.com', 'again')] });
  assert.deepEqual(await route(port, key, 'done', {}), { status: 200, json: { ok: true } });
  const out = f.run('wait');
  assert.equal(out.stdout, 'HANDOVER_RESULT=done\nHANDOVER_SAVED=netflix-com,costco-com\n');
  const result = readFileSync(join(f.state, 'result.json'), 'utf8');
  assert.deepEqual(JSON.parse(result), { result: 'done', saved: ['netflix-com', 'costco-com'] });
  assert.doesNotMatch(result + out.stdout + out.stderr, /mail|http|www|again|hunter|netflix\.com/);
  assert.ok(!existsSync(join(f.state, 'watcher.pid')), 'the watcher is gone');
});

test('closing a password link with nothing saved prints an empty list', t => {
  const f = fixture(t);
  opened(f, '--passwords');
  assert.equal(f.run('close').stdout, 'HANDOVER_RESULT=closed\nHANDOVER_SAVED=\n');
});

test('slug, hostOf, and chooseName name logins as the vault allows', () => {
  assert.equal(slug('www.Netflix.com'), 'netflix-com');
  assert.equal(slug('my_bank.co.uk'), 'my-bank-co-uk');
  assert.equal(slug('...'), 'login');
  for (const host of ['netflix.com', 'login.netflix.com', 'xn--bcher-kva.example', '192.168.1.1']) assert.match(slug(host), /^[a-zA-Z0-9_-]+$/);
  assert.equal(hostOf('https://WWW.Netflix.com/login?next=/'), 'netflix.com');
  assert.equal(hostOf('android://abc@com.netflix.mediaclient/'), '');
  assert.equal(hostOf('not a url'), '');
  const vault = [{ name: 'netflix-com', url: 'https://www.netflix.com/login', username: 'me' }, { name: 'netflix-com-2', url: 'https://netflix.com/', username: 'kid' }];
  assert.equal(chooseName(vault, { host: 'netflix.com', username: 'kid' }), 'netflix-com-2');
  assert.equal(chooseName(vault, { host: 'netflix.com', username: 'new' }), 'netflix-com-3');
  assert.equal(chooseName(vault, { host: 'costco.com', username: 'me' }), 'costco-com');
  assert.equal(checkLogins({ logins: [login('https://a.example.com', 'me')] })[0].host, 'a.example.com');
  assert.equal(checkLogins(null), 400);
});

// Each password manager's CSV export, with the header it writes and one login row.
const EXPORTS = {
  Chrome: ['name,url,username,password,note', 'netflix.com,https://www.netflix.com/login,me@mail.com,pw-chrome,', 'Netflix app,android://Abc123==@com.netflix.mediaclient/,me@mail.com,pw-app,'],
  'Apple Passwords': ['Title,URL,Username,Password,Notes,OTPAuth', 'costco.com (me@mail.com),https://www.costco.com/,me@mail.com,pw-apple,,otpauth://totp/Costco?secret=JBSWY3DPEHPK3PXP'],
  LastPass: ['url,username,password,totp,extra,name,grouping,fav', 'https://www.amazon.com/,me@mail.com,pw-lastpass,,,Amazon,Shopping,0', 'http://sn,,,,"NoteType:Server\nHostname:x",Office wifi,,0'],
  Bitwarden: ['folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp', ',,login,GitHub,,,0,https://github.com/login,octocat,pw-bitwarden,', ',,note,My note,secret text,,0,,,,'],
  '1Password': ['Title,Url,Username,Password,OTPAuth,Favorite,Archived,Tags,Notes', 'Spotify,https://accounts.spotify.com/login,me@mail.com,pw-1password,,false,false,,'],
  Dashlane: ['username,username2,username3,title,password,note,url,category,otpUrl', 'me@mail.com,,,Target,pw-dashlane,,target.com,Shopping,'],
  Firefox: ['"url","username","password","httpRealm","formActionOrigin","guid","timeCreated","timeLastUsed","timePasswordChanged"', '"https://accounts.firefox.com","me@mail.com","pw-firefox","","https://accounts.firefox.com","{0b5e}","1700000000000","1700000000000","1700000000000"'],
};

test('parseExport reads each password manager\'s export and keeps only site, username, and password', () => {
  const want = {
    Chrome: { url: 'https://www.netflix.com/login', host: 'netflix.com', username: 'me@mail.com', password: 'pw-chrome', label: 'netflix.com' },
    'Apple Passwords': { url: 'https://www.costco.com/', host: 'costco.com', username: 'me@mail.com', password: 'pw-apple', label: 'costco.com (me@mail.com)' },
    LastPass: { url: 'https://www.amazon.com/', host: 'amazon.com', username: 'me@mail.com', password: 'pw-lastpass', label: 'Amazon' },
    Bitwarden: { url: 'https://github.com/login', host: 'github.com', username: 'octocat', password: 'pw-bitwarden', label: 'GitHub' },
    '1Password': { url: 'https://accounts.spotify.com/login', host: 'accounts.spotify.com', username: 'me@mail.com', password: 'pw-1password', label: 'Spotify' },
    Dashlane: { url: 'https://target.com', host: 'target.com', username: 'me@mail.com', password: 'pw-dashlane', label: 'Target' },
    Firefox: { url: 'https://accounts.firefox.com', host: 'accounts.firefox.com', username: 'me@mail.com', password: 'pw-firefox', label: '' },
  };
  for (const [manager, lines] of Object.entries(EXPORTS)) assert.deepEqual(parseExport(lines.join('\n')), [want[manager]], manager);
  assert.doesNotMatch(JSON.stringify(parseExport(EXPORTS['Apple Passwords'].join('\n'))), /otpauth|JBSW/, 'one-time code secrets are dropped');
});

test('parseExport follows RFC 4180 and sorts by site', () => {
  const csv = '﻿name,url,username,password,note\r\n'
    + 'Shop,https://shop.example.com,"Smith, Jo","pa,ss""word",\r\n'
    + 'Bank,https://bank.example.com,jo,"line one\nline two","a note\r\nover lines"\r\n'
    + '\r\n'
    + 'Dup,https://www.shop.example.com/other,"Smith, Jo",second,\r\n'
    + 'No password,https://empty.example.com,jo,,\r\n';
  assert.deepEqual(parseExport(csv), [
    { url: 'https://bank.example.com', host: 'bank.example.com', username: 'jo', password: 'line one\nline two', label: 'Bank' },
    { url: 'https://shop.example.com', host: 'shop.example.com', username: 'Smith, Jo', password: 'pa,ss"word', label: 'Shop' },
  ]);
});

test('parseExport gives null for a file that is not an export, and none for an empty one', () => {
  assert.equal(parseExport('{"accounts":[{"name":"Netflix"}]}'), null, 'a JSON export');
  assert.equal(parseExport('PK\u0003\u0004\u0014\u0000binary.1pux'), null, 'a 1Password .1pux');
  assert.equal(parseExport('title,username,notes\nNetflix,me,x'), null, 'no site or password column');
  assert.equal(parseExport(''), null);
  assert.deepEqual(parseExport('url,username,password\n'), []);
  assert.equal(siteUrl(' netflix.com '), 'https://netflix.com');
  assert.equal(siteUrl('http://intranet.local/login'), 'http://intranet.local/login');
  assert.equal(siteUrl('android://x@com.app/'), 'android://x@com.app/');
  assert.equal(siteUrl('localhost'), 'localhost');
});
