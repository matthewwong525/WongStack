// The bootstrap's project download, against a local Git HTTP server: the real `git http-backend`
// behind a Node listener that records each request, as the app's code route answers Git.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cleanEnvironment, companyClient, git, projectCopy } from '../employee-bootstrap.mjs';

const TOKEN = `eyJhbGciOiJSUzI1NiJ9.${Buffer.from(JSON.stringify({ email: 'employee@example.com', sub: 'employee-subject', exp: Date.now() / 1000 + 1000 })).toString('base64url')}.c2ln`;
const PATH = '/api/access/code/git/';
const identity = { email: 'employee@example.com', subject: 'employee-subject' };
const author = { GIT_AUTHOR_NAME: 'Ada', GIT_AUTHOR_EMAIL: 'ada@example.com', GIT_COMMITTER_NAME: 'Ada', GIT_COMMITTER_EMAIL: 'ada@example.com' };
/** Plain git for arranging a test: no session, no fixture address. */
function plain(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', env: { ...cleanEnvironment(), ...author, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' } });
  assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout.trim();
}
/** Every file of a copy outside `.git`, with its bytes, and where its branch points. */
const snapshot = dir => ({
  files: Object.fromEntries(readdirSync(dir, { recursive: true }).filter(name => !name.split(/[\\/]/).includes('.git') && statSync(join(dir, name)).isFile())
    .sort().map(name => [name, readFileSync(join(dir, name), 'utf8')])),
  head: plain(dir, 'rev-parse', 'HEAD'), status: plain(dir, 'status', '--porcelain'),
});

/**
 * A project with one commit on `main`, served over HTTP under the app's code path. `seen` holds each
 * request's method, address and session header; `mode` makes the next answers a redirect or a refusal.
 */
async function project(t) {
  const base = mkdtempSync(join(tmpdir(), 'employee-project-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const bare = join(base, 'served.git'), work = join(base, 'author');
  plain(base, 'init', '--quiet', '--bare', '-b', 'main', bare);
  plain(base, 'init', '--quiet', '-b', 'main', work);
  const publish = (name, text, message) => {
    writeFileSync(join(work, name), text);
    plain(work, 'add', '-A');
    plain(work, 'commit', '--quiet', '-m', message);
    plain(work, 'push', '--quiet', bare, 'main');
    return plain(work, 'rev-parse', 'HEAD');
  };
  const first = publish('README.md', 'first\n', 'first');
  const fixture = { base, bare, publish, first, seen: [], mode: 'serve', elsewhere: [] };
  // Where a redirect points: it must never be asked, with or without the session.
  const other = createServer((request, response) => { fixture.elsewhere.push(request.headers['cf-access-token'] ?? null); response.writeHead(404).end(); });
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    fixture.seen.push({ method: request.method, path: url.pathname, query: url.search, session: request.headers['cf-access-token'] ?? null });
    if (fixture.mode === 'redirect') return response.writeHead(302, { Location: `http://127.0.0.1:${other.address().port}${request.url}` }).end();
    if (fixture.mode === 'refuse' || request.headers['cf-access-token'] !== TOKEN || !url.pathname.startsWith(PATH)) return response.writeHead(403, { 'Content-Type': 'application/json' }).end('{"error":{"code":"forbidden"}}');
    const backend = spawn('git', ['http-backend'], { env: { ...cleanEnvironment(), GIT_PROJECT_ROOT: bare, GIT_HTTP_EXPORT_ALL: '1', REQUEST_METHOD: request.method,
      PATH_INFO: `/${url.pathname.slice(PATH.length)}`, QUERY_STRING: url.search.slice(1), CONTENT_TYPE: request.headers['content-type'] ?? '',
      HTTP_CONTENT_ENCODING: request.headers['content-encoding'] ?? '', GIT_PROTOCOL: request.headers['git-protocol'] ?? '' } });
    request.pipe(backend.stdin);
    const chunks = [];
    backend.stdout.on('data', chunk => chunks.push(chunk));
    backend.on('close', () => {
      const output = Buffer.concat(chunks), split = output.indexOf('\r\n\r\n');
      const headers = Object.fromEntries(output.subarray(0, split).toString().split('\r\n').map(line => [line.slice(0, line.indexOf(':')), line.slice(line.indexOf(':') + 1).trim()]));
      const status = Number(headers.Status?.split(' ')[0] ?? 200);
      delete headers.Status;
      response.writeHead(status, headers).end(output.subarray(split + 4));
    });
  });
  await Promise.all([server, other].map(each => new Promise(done => each.listen(0, '127.0.0.1', done))));
  t.after(() => { server.close(); other.close(); });
  fixture.address = `http://127.0.0.1:${server.address().port}${PATH}`;
  fixture.copy = (folder, token = TOKEN) => projectCopy({ address: fixture.address, folder, token });
  return fixture;
}

test('clones the project into a missing or empty folder with its history, and sends the session only as a header', async t => {
  const f = await project(t);
  const calls = [];
  const recorded = (args, session) => { calls.push(args); return git(args, session); };
  const folder = join(f.base, 'copy');
  assert.deepEqual(await projectCopy({ address: f.address, folder, token: TOKEN, run: recorded }), { project: 'installed', folder });
  assert.deepEqual(snapshot(folder), { files: { 'README.md': 'first\n' }, head: f.first, status: '' });
  assert.equal(plain(folder, 'log', '--format=%s'), 'first');
  // Every request carried the session, in a header; the address Git was given and the one it saved hold none.
  assert.ok(f.seen.length >= 2 && f.seen.every(request => request.session === TOKEN && request.path.startsWith(PATH)));
  assert.deepEqual(f.seen.map(request => `${request.method} ${request.path.slice(PATH.length)}`).filter((call, index, all) => all.indexOf(call) === index),
    ['GET info/refs', 'POST git-upload-pack']);
  assert.ok(calls.flat().every(argument => !argument.includes(TOKEN) && !argument.includes('eyJ')));
  assert.equal(plain(folder, 'config', '--get', 'remote.origin.url'), f.address);
  const config = readFileSync(join(folder, '.git', 'config'), 'utf8');
  assert.ok(!config.includes(TOKEN) && !/extraheader|cf-access-token/i.test(config));
  for (const name of readdirSync(join(folder, '.git'), { recursive: true }).filter(each => statSync(join(folder, '.git', each)).isFile())) {
    assert.ok(!readFileSync(join(folder, '.git', name)).includes(TOKEN), `${name} holds the session`);
  }
  // An existing empty folder is as good as a missing one.
  const empty = join(f.base, 'empty');
  mkdirSync(empty);
  assert.equal((await f.copy(empty)).project, 'installed');
});

test('refuses a folder that holds other work, or another project, and changes nothing there', async t => {
  const f = await project(t);
  const busy = join(f.base, 'busy');
  mkdirSync(busy);
  writeFileSync(join(busy, 'notes.txt'), 'mine\n');
  await assert.rejects(f.copy(busy), /already holds other files\. Choose an empty folder with --dir; nothing was changed\./);
  assert.deepEqual(readdirSync(busy), ['notes.txt']);
  const other = join(f.base, 'other');
  plain(f.base, 'init', '--quiet', '-b', 'main', other);
  plain(other, 'remote', 'add', 'origin', 'https://github.com/someone/else.git');
  writeFileSync(join(other, 'work.txt'), 'theirs\n');
  await assert.rejects(f.copy(other), /holds a different project/);
  assert.equal(readFileSync(join(other, 'work.txt'), 'utf8'), 'theirs\n');
  assert.equal(plain(other, 'config', '--get', 'remote.origin.url'), 'https://github.com/someone/else.git');
  assert.deepEqual(f.seen, [], 'neither folder was worth a request');
});

test('running it again fast-forwards a clean copy, and keeps a changed or diverged one exactly as it is', async t => {
  const f = await project(t);
  const folder = join(f.base, 'copy');
  await f.copy(folder);
  assert.deepEqual(await f.copy(folder), { project: 'up to date', folder }, 'nothing new is still up to date');
  const second = f.publish('wiki.md', 'second\n', 'second');
  // A file the person made that the project does not track is theirs, and stops nothing.
  writeFileSync(join(folder, 'scratch.txt'), 'untracked\n');
  assert.deepEqual(await f.copy(folder), { project: 'up to date', folder });
  assert.deepEqual(snapshot(folder), { files: { 'README.md': 'first\n', 'scratch.txt': 'untracked\n', 'wiki.md': 'second\n' }, head: second, status: '?? scratch.txt' });

  // Dirty: a tracked file was edited. Diverged: a commit was made on top. Elsewhere: the person is on a branch of their own.
  const cases = {
    dirty: dir => writeFileSync(join(dir, 'README.md'), 'edited by hand\n'),
    diverged: dir => { writeFileSync(join(dir, 'mine.txt'), 'my work\n'); plain(dir, 'add', '-A'); plain(dir, 'commit', '--quiet', '-m', 'mine'); },
    elsewhere: dir => plain(dir, 'switch', '--quiet', '-c', 'my-branch'),
  };
  const copies = Object.fromEntries(Object.entries(cases).map(([name, change]) => {
    const dir = join(f.base, name);
    cpSync(folder, dir, { recursive: true });
    change(dir);
    return [name, { dir, before: snapshot(dir) }];
  }));
  f.publish('README.md', 'third\n', 'third');
  for (const [name, { dir, before }] of Object.entries(copies)) {
    assert.deepEqual(await f.copy(dir), { project: 'kept your changes; update not applied', folder: dir, applied: false }, name);
    assert.deepEqual(snapshot(dir), before, `${name} is left byte for byte`);
    assert.equal(plain(dir, 'stash', 'list'), '', `${name} has nothing stashed`);
  }
  // The clean copy still moves.
  assert.equal((await f.copy(folder)).project, 'up to date');
  assert.equal(snapshot(folder).files['README.md'], 'third\n');
});

test('a refusal, a redirect and a missing session download nothing and leave an existing copy unchanged', async t => {
  const f = await project(t);
  const folder = join(f.base, 'copy');
  await f.copy(folder);
  const before = snapshot(folder);
  f.publish('README.md', 'newer\n', 'newer');
  for (const [mode, token] of [['refuse', TOKEN], ['redirect', TOKEN], ['serve', null]]) {
    f.mode = mode;
    const fresh = join(f.base, `fresh-${mode}`);
    for (const target of [folder, fresh]) {
      await assert.rejects(f.copy(target, token), { message: 'The project download was refused. Ask your admin for access to Connect your assistant, or sign in again. The copy on this computer is unchanged.' });
    }
    assert.deepEqual(snapshot(folder), before, mode);
    assert.ok(!existsSync(join(fresh, '.git')), `${mode} left no half copy`);
  }
  // The redirect was never followed, so the session went nowhere else. Git alone would have taken the
  // redirect's empty answer for an empty project: the helper asks for the project's branch first.
  assert.deepEqual(f.elsewhere, []);
});

test('names Git plainly when it is not installed', async () => {
  const path = process.env.PATH;
  process.env.PATH = mkdtempSync(join(tmpdir(), 'no-git-'));
  try {
    await assert.rejects(git(['--version']), { message: 'Install Git from its official distribution (https://git-scm.com/downloads), then run this step again. No account or key is needed.' });
  } finally { rmSync(process.env.PATH, { recursive: true, force: true }); process.env.PATH = path; }
});

/** A client whose sign-in and app are faked, and whose download is recorded instead of run. */
function connected(t, { code = 'ready' } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'employee-install-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const root = join(base, 'here'), stateDir = join(base, 'private'), cacheDir = join(base, 'cache');
  mkdirSync(root);
  const state = { code, copies: [], requests: [], result: {} };
  const client = companyClient({ root, stateDir, cacheDir, routesDir: join(base, 'routes'), run: async () => TOKEN, request: async (url, init) => {
    state.requests.push({ path: url.pathname, session: init.headers['cf-access-token'] });
    return Response.json({ identity, role: 'employee', apps: ['orders'], api: 'authenticated', code: state.code, repository: 'manual_provider_setup', memory: 'independent_operator_setup' });
  } });
  const copy = async options => { state.copies.push(options); return { project: 'installed', folder: options.folder, ...state.result }; };
  return { base, stateDir, client, state, copy };
}
const origin = 'https://business.example.com';

test('install signs in, downloads the project for a person who holds Project code, and says where it is and what to run', async t => {
  const f = connected(t);
  const folder = join(f.base, 'project');
  const report = await f.client.install(origin, folder, f.copy);
  assert.deepEqual(report, { connected: origin, signedInAs: identity.email, apps: ['orders'], state: f.stateDir, project: 'installed', folder,
    next: `cd ${folder} && node scripts/company-api.mjs list --state ${f.stateDir}` });
  // The download asks the app's own address, as the person who signed in.
  assert.deepEqual(f.state.copies, [{ address: `${origin}/api/access/code/git/`, folder, token: TOKEN }]);
  assert.ok(!JSON.stringify(report).includes(TOKEN));
  assert.equal(statSync(join(f.stateDir, 'project.json')).mode & 0o777, 0o600);
  assert.ok(!readFileSync(join(f.stateDir, 'project.json'), 'utf8').includes(TOKEN));
  // Again, with no folder named: the same copy is brought up to date, and an update that was not applied is passed on.
  f.state.result = { project: 'kept your changes; update not applied', applied: false };
  assert.deepEqual(await f.client.install(origin, undefined, f.copy), { ...report, project: 'kept your changes; update not applied', applied: false });
  assert.equal(f.state.copies[1].folder, folder);
  // `code` alone needs a connection first, and uses the same address.
  await f.client.code(join(f.base, 'again'), f.copy);
  assert.deepEqual(f.state.copies[2], { address: `${origin}/api/access/code/git/`, folder: join(f.base, 'again'), token: TOKEN });
  await assert.rejects(connected(t).client.code(folder, f.copy), /Connect first/);
});

test('install with no folder named picks one in the home directory, named for the app', async t => {
  const f = connected(t), home = process.env.HOME;
  process.env.HOME = f.base;
  try { assert.equal((await f.client.install(origin, undefined, f.copy)).folder, join(f.base, 'business')); }
  finally { process.env.HOME = home; }
});

test('install connects the apps and downloads nothing when the person lacks Project code, or the app hands none out', async t => {
  for (const [code, project] of [['lacked', 'not included. Ask your admin for access to Connect your assistant.'], ['off', 'not handed out by this app; apps only'], [null, 'not handed out by this app; apps only']]) {
    const f = connected(t, { code });
    assert.deepEqual(await f.client.install(origin, join(f.base, 'project'), f.copy), { connected: origin, signedInAs: identity.email, apps: ['orders'], state: f.stateDir, project });
    assert.deepEqual(f.state.copies, []);
    assert.ok(!existsSync(join(f.stateDir, 'project.json')));
  }
});

test('the packaged command installs in one step, updates on the next, and ends as a failure when an update is not applied', t => {
  const base = mkdtempSync(join(tmpdir(), 'employee-command-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const bin = join(base, 'bin'), home = join(base, 'home'), helper = join(base, 'bootstrap.mjs'), log = join(base, 'git.jsonl');
  mkdirSync(bin); mkdirSync(home);
  writeFileSync(helper, readFileSync(new URL('../employee-bootstrap.mjs', import.meta.url)));
  writeFileSync(join(bin, 'cloudflared'), `#!${process.execPath}\nconsole.log('${TOKEN}');\n`, { mode: 0o700 });
  // A stand-in Git that records how it was called and plays a copy whose tracked file may have been edited.
  writeFileSync(join(bin, 'git'), `#!${process.execPath}
    const { appendFileSync, existsSync, mkdirSync, writeFileSync } = require('node:fs'); const { join } = require('node:path');
    const args = process.argv.slice(2), config = {};
    for (let i = 0; i < Number(process.env.GIT_CONFIG_COUNT); i++) config[process.env['GIT_CONFIG_KEY_' + i]] = process.env['GIT_CONFIG_VALUE_' + i];
    appendFileSync(${JSON.stringify(log)}, JSON.stringify({ args, config, prompt: process.env.GIT_TERMINAL_PROMPT, extra: Object.keys(process.env).filter(key => /TOKEN|SECRET|CLOUDFLARE/.test(key)) }) + '\\n');
    const dir = args[0] === '-C' ? args[1] : args.at(-1), verb = args[0] === '-C' ? args[2] : args[0];
    if (verb === 'clone') { mkdirSync(join(dir, '.git'), { recursive: true }); writeFileSync(join(dir, 'README.md'), 'first'); }
    if (verb === 'config') console.log('${origin}${PATH}');
    if (verb === 'symbolic-ref') console.log(args.at(-1) === 'HEAD' ? 'main' : 'origin/main');
    if (verb === 'status' && existsSync(join(dir, 'edited'))) console.log(' M README.md');
    console.error('diagnostics ${TOKEN}');\n`, { mode: 0o700 });
  const preloader = join(base, 'transport.mjs');
  writeFileSync(preloader, `globalThis.fetch = async () => Response.json(${JSON.stringify({ identity, role: 'employee', apps: [], api: 'authenticated', code: 'ready' })});\n`);
  const env = { ...cleanEnvironment(), HOME: home, PATH: `${bin}:${process.env.PATH}`, CLOUDFLARE_API_TOKEN: 'owner-token', GH_TOKEN: 'provider-secret' };
  // Run from the home folder itself, where an assistant often starts: the private files still sit outside the working folder.
  const run = (...args) => spawnSync(process.execPath, ['--import', preloader, helper, ...args], { cwd: home, env, encoding: 'utf8' });
  const calls = () => readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  const verbs = () => calls().map(({ args }) => args[0] === '-C' ? args[2] : args[0]);
  const folder = join(base, 'installed');

  const installed = run('install', '--origin', origin, '--dir', folder);
  assert.equal(installed.status, 0, installed.stderr);
  const report = JSON.parse(installed.stdout);
  assert.deepEqual([report.project, report.folder, report.signedInAs, report.connected], ['installed', folder, identity.email, origin]);
  assert.match(report.state, /\.local\/state\/wong-company\/[a-f0-9]{64}$/);
  assert.ok(report.state.startsWith(home));
  assert.equal(statSync(report.state).mode & 0o777, 0o700);
  assert.equal(report.next, `cd ${folder} && node scripts/company-api.mjs list --state ${report.state}`);
  // One download, from the app's own address. The session is a header for that address alone, set in Git's
  // environment: never an argument. No redirect, no prompt, no credential helper, and no other credential.
  const [asked, clone] = calls();
  assert.deepEqual(asked.args, ['ls-remote', '--quiet', '--exit-code', `${origin}${PATH}`, 'HEAD']);
  assert.deepEqual(clone.args, ['clone', '--quiet', '--origin', 'origin', `${origin}${PATH}`, folder]);
  assert.deepEqual(clone.config, { 'credential.helper': '', 'http.followRedirects': 'false', [`http.${origin}${PATH}.extraHeader`]: `cf-access-token: ${TOKEN}` });
  assert.deepEqual([clone.prompt, clone.extra, asked.config], ['0', [], clone.config]);
  assert.equal(calls().length, 2);

  // The same step again, with no folder named, updates that copy.
  const updated = run('install', '--origin', origin);
  assert.deepEqual([updated.status, JSON.parse(updated.stdout).project, JSON.parse(updated.stdout).folder], [0, 'up to date', folder]);
  assert.deepEqual(verbs().slice(2), ['config', 'ls-remote', 'fetch', 'symbolic-ref', 'symbolic-ref', 'status', 'merge']);
  assert.deepEqual(calls().at(-1).args, ['-C', folder, 'merge', '--quiet', '--ff-only', 'origin/main']);
  // Only the calls that reach the app carry the session.
  assert.deepEqual(calls().filter(call => Object.keys(call.config).length === 3).map(({ args }) => args.find(arg => ['ls-remote', 'clone', 'fetch'].includes(arg))), ['ls-remote', 'clone', 'ls-remote', 'fetch']);

  // A copy the person edited is kept: no merge is tried, and the step ends as a failure a script can see.
  writeFileSync(join(folder, 'edited'), '');
  const before = calls().length;
  const kept = run('code', '--dir', folder, '--state', report.state);
  assert.deepEqual([kept.status, JSON.parse(kept.stdout)], [1, { project: 'kept your changes; update not applied', folder, applied: false }]);
  assert.deepEqual(verbs().slice(before), ['config', 'ls-remote', 'fetch', 'symbolic-ref', 'symbolic-ref', 'status']);
  for (const never of ['reset', 'clean', 'stash', 'checkout', 'push']) assert.ok(!verbs().includes(never), never);
  // Nothing Git was told, and nothing it or the helper printed, holds the session.
  assert.ok(calls().every(({ args }) => args.every(arg => !arg.includes('eyJ'))));
  for (const result of [installed, updated, kept]) assert.ok(!`${result.stdout}${result.stderr}`.includes(TOKEN));
  for (const usage of [run('install'), run('code', '--state', report.state)]) assert.deepEqual([usage.status, /employee-bootstrap\.mjs install/.test(usage.stderr)], [1, true]);
});
