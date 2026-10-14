// The bootstrap's project download, against a local Git HTTP server: the real `git http-backend`
// behind a Node listener that records each request, as the app's code route answers Git.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { cleanEnvironment, companyClient, git, installState, otherCopy, ownCopy, projectCopy } from '../employee-bootstrap.mjs';

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

// A project with one commit on `main`, served over HTTP under the app's code path. `seen` holds each request's
// method, address and session, as a header or a Basic password; `mode` makes the next answers a redirect or a refusal.
async function project(t) {
  const base = mkdtempSync(join(tmpdir(), 'employee-project-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const bare = join(base, 'served.git'), work = join(base, 'author');
  plain(base, 'init', '--quiet', '--bare', '-b', 'main', bare);
  plain(bare, 'config', 'http.receivepack', 'true');
  plain(base, 'init', '--quiet', '-b', 'main', work);
  const publish = (name, text, message) => {
    mkdirSync(dirname(join(work, name)), { recursive: true });
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
    const basic = /^Basic (.+)$/.exec(request.headers.authorization ?? '')?.[1];
    const password = basic && Buffer.from(basic, 'base64').toString().replace(/^[^:]*:/, '');
    const session = request.headers['cf-access-token'] ?? password ?? null;
    fixture.seen.push({ method: request.method, path: url.pathname, query: url.search, session, basic: !!basic });
    if (fixture.mode === 'redirect') return response.writeHead(302, { Location: `http://127.0.0.1:${other.address().port}${request.url}` }).end();
    if (fixture.mode === 'refuse' || !url.pathname.startsWith(PATH)) return response.writeHead(403, { 'Content-Type': 'application/json' }).end('{"error":{"code":"forbidden"}}');
    // As the app answers: Git asks its credential helper only after this challenge.
    if (session !== TOKEN) return response.writeHead(401, { 'WWW-Authenticate': 'Basic realm="company app"', 'Content-Type': 'text/plain' }).end('Sign in again\n');
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
  // The copy's own Git asks the helper beside it, at the app's address alone, after clearing any computer-wide one.
  const scope = `credential.${f.address.slice(0, -1)}`;
  assert.equal(plain(folder, 'config', '--get-all', '-z', `${scope}.helper`), `\0!"${process.execPath}" "${join(folder, 'scripts', 'company-git-credential.mjs')}"\0`);
  assert.equal(plain(folder, 'config', '--get', `${scope}.useHttpPath`), 'true');
  for (const name of readdirSync(join(folder, '.git'), { recursive: true }).filter(each => statSync(join(folder, '.git', each)).isFile())) {
    assert.ok(!readFileSync(join(folder, '.git', name)).includes(TOKEN), `${name} holds the session`);
  }
  // An existing empty folder is as good as a missing one.
  const empty = join(f.base, 'empty');
  mkdirSync(empty);
  assert.equal((await f.copy(empty)).project, 'installed');
  // A downloaded setup file is not one of the folder's files: it goes first, since Git refuses a non-empty folder.
  const fetched = join(f.base, 'fetched'), self = join(fetched, 'setup.mjs');
  mkdirSync(fetched);
  writeFileSync(self, 'the setup file\n');
  assert.deepEqual(await projectCopy({ address: f.address, folder: fetched, token: TOKEN, self }), { project: 'installed', folder: fetched });
  assert.deepEqual(snapshot(fetched).files, { 'README.md': 'first\n' });
});

test('plain Git in the copy fetches and saves with the helper\'s sign-in, and a computer-wide helper never stores it', async t => {
  const f = await project(t);
  // A stand-in for the helper, published in the project as the real one is: it answers `get` alone.
  f.publish('scripts/company-git-credential.mjs', `if (process.argv[2] === 'get') console.log('username=x-access\\npassword=${TOKEN}');\n`, 'helper');
  const folder = join(f.base, 'copy'), home = join(f.base, 'home');
  await f.copy(folder);
  mkdirSync(home);
  writeFileSync(join(home, '.gitconfig'), '[credential]\n\thelper = store\n');
  const newer = f.publish('README.md', 'newer\n', 'newer');
  const before = process.env.HOME;
  process.env.HOME = home;
  try {
    f.seen.length = 0;
    // Plain Git, as Paseo runs it: no session from this side, so the app's challenge reaches the copy's helper.
    assert.equal((await git(['-C', folder, 'fetch', '--quiet', 'origin'], { address: f.address })).code, 0);
    assert.equal(plain(folder, 'rev-parse', 'origin/main'), newer);
    assert.ok(f.seen.some(request => request.basic && request.session === TOKEN));
    // Saving is a push the same way.
    plain(folder, 'switch', '--quiet', '-c', 'ada/fix');
    writeFileSync(join(folder, 'fix.txt'), 'fix\n');
    plain(folder, 'add', '-A'); plain(folder, 'commit', '--quiet', '-m', 'fix');
    assert.equal((await git(['-C', folder, 'push', '--quiet', 'origin', 'ada/fix'], { address: f.address })).code, 0);
    assert.equal(plain(f.bare, 'rev-parse', 'ada/fix'), plain(folder, 'rev-parse', 'HEAD'));
    assert.ok(!existsSync(join(home, '.git-credentials')), 'the computer-wide helper stored nothing');
    // Without the clearing entry, the same fetch hands the sign-in to that helper: the entry is what stops it.
    plain(folder, 'config', '--unset', `credential.${f.address.slice(0, -1)}.helper`, '^$');
    assert.equal((await git(['-C', folder, 'fetch', '--quiet', 'origin'], { address: f.address })).code, 0);
    assert.ok(readFileSync(join(home, '.git-credentials'), 'utf8').includes(TOKEN));
  } finally { process.env.HOME = before; }
  assert.ok(!readFileSync(join(folder, '.git', 'config'), 'utf8').includes(TOKEN));
});

test('refuses a folder that holds other work, or another project, and changes nothing there', async t => {
  const f = await project(t);
  const busy = join(f.base, 'busy');
  mkdirSync(busy);
  writeFileSync(join(busy, 'notes.txt'), 'mine\n');
  await assert.rejects(f.copy(busy), /already holds other files\. Choose an empty folder with --dir; nothing was changed\./);
  assert.deepEqual(readdirSync(busy), ['notes.txt']);
  // A setup file beside other files changes nothing either, and is not removed here.
  const self = join(busy, 'setup.mjs');
  writeFileSync(self, 'the setup file\n');
  await assert.rejects(projectCopy({ address: f.address, folder: busy, token: TOKEN, self }), /already holds other files/);
  assert.deepEqual(readdirSync(busy), ['notes.txt', 'setup.mjs']);
  rmSync(self);
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

  // Dirty: a tracked file was edited. Diverged: a commit was made on top. Elsewhere: the person is on their own branch.
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
function connected(t, { code = 'ready', installed = false } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'employee-install-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const root = join(base, 'here'), stateDir = installed ? installState(origin) : join(base, 'private'), cacheDir = join(base, 'cache');
  mkdirSync(root);
  const state = { code, copies: [], requests: [], result: {} };
  const client = companyClient({ root, stateDir, cacheDir, routesDir: join(base, 'routes'), run: async () => TOKEN, request: async (url, init) => {
    state.requests.push({ path: url.pathname, session: init.headers['cf-access-token'] });
    if (state.memoryDown && url.pathname === '/_memory/caller') return new Response('', { status: 404 });
    return Response.json({ identity, role: 'employee', apps: ['orders'], api: 'authenticated', code: state.code, repository: 'manual_provider_setup', memory: 'independent_operator_setup' });
  } });
  const copy = async options => {
    state.copies.push(options);
    mkdirSync(join(options.folder, '.claude'), { recursive: true });
    writeFileSync(join(options.folder, '.claude', '.wong-stack.json'), JSON.stringify({ components: { companyApi: { origin } } }));
    return { project: 'installed', folder: options.folder, ...state.result };
  };
  return { base, stateDir, client, state, copy };
}
const origin = 'https://business.example.com';

const DONE = folder => `Used this computer's existing sign-in as ${identity.email}. Apps that work: orders. Memory works. The project is in ${folder}, and new chats keep it up to date. Nothing else is needed.`;
test('install signs in, downloads the project for a person who holds Project code, confirms memory, and says it is done', async t => {
  // Setup keeps the sign-in where the downloaded copy's own tools look for it.
  const home = process.env.HOME; process.env.HOME = mkdtempSync(join(tmpdir(), 'employee-home-'));
  t.after(() => { rmSync(process.env.HOME, { recursive: true, force: true }); process.env.HOME = home; });
  const f = connected(t, { installed: true });
  const folder = join(f.base, 'project');
  const report = await f.client.install(origin, folder, f.copy);
  assert.deepEqual(report, { connected: origin, signedInAs: identity.email, signIn: 'reused', apps: ['orders'], memory: 'works', state: f.stateDir, project: 'installed', folder, summary: DONE(folder) });
  // Memory is asked once, with the same sign-in.
  assert.deepEqual(f.state.requests.filter(row => row.path === '/_memory/caller'), [{ path: '/_memory/caller', session: TOKEN }]);
  // The report names no command to run, no environment file and no key.
  assert.doesNotMatch(JSON.stringify(report), /\bnode\b|company-api|--state|\.env\b|\bkey\b|\bnext\b/i);
  // The download asks the app's own address, as the person who signed in.
  assert.deepEqual(f.state.copies, [{ address: `${origin}/api/access/code/git/`, folder, token: TOKEN }]);
  assert.ok(!JSON.stringify(report).includes(TOKEN));
  // No folder is remembered between runs: the folder is the one it is run in.
  assert.ok(!existsSync(join(f.stateDir, 'project.json')));
  // Again: an update that was not applied is passed on, and a downloaded setup file is named to the download.
  f.state.result = { project: 'kept your changes; update not applied', applied: false };
  assert.deepEqual(await f.client.install(origin, folder, f.copy, '/tmp/setup.mjs'), { ...report, project: 'kept your changes; update not applied', applied: false,
    summary: `Used this computer's existing sign-in as ${identity.email}. Apps that work: orders. Memory works. Project: kept your changes; update not applied, in ${folder}. Your changes were kept, so the update waits.` });
  // Memory that does not answer is said plainly, and setup still ends.
  const quiet = connected(t);
  quiet.state.memoryDown = true;
  assert.equal((await quiet.client.install(origin, folder, quiet.copy)).memory, 'not reachable yet');
  assert.deepEqual(f.state.copies[1], { address: `${origin}/api/access/code/git/`, folder, token: TOKEN, self: '/tmp/setup.mjs' });
  // `code` alone needs a connection first, and uses the same address.
  await f.client.code(join(f.base, 'again'), f.copy);
  assert.deepEqual(f.state.copies[2], { address: `${origin}/api/access/code/git/`, folder: join(f.base, 'again'), token: TOKEN });
  await assert.rejects(connected(t).client.code(folder, f.copy), /Connect first/);
});

test('install leaves a copy of the project from elsewhere as it is, whatever the person holds', async t => {
  const base = mkdtempSync(join(tmpdir(), 'employee-elsewhere-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const address = `${origin}/api/access/code/git/`, mine = join(base, 'mine');
  plain(base, 'init', '--quiet', '-b', 'main', mine);
  plain(mine, 'remote', 'add', 'origin', 'https://github.com/owner/project.git');
  // A Git folder that is not this project is not a copy of it.
  assert.equal(await otherCopy(mine, address), false);
  mkdirSync(join(mine, 'scripts'));
  writeFileSync(join(mine, 'scripts', 'employee-bootstrap.mjs'), '');
  assert.equal(await otherCopy(mine, address), true);
  // The copy the app itself handed out is the one setup updates.
  plain(mine, 'remote', 'set-url', 'origin', address);
  assert.equal(await otherCopy(mine, address), false);
  assert.equal(await otherCopy(join(base, 'missing'), address), false);
  // Signed in, copy left alone, and never told the project is not included.
  for (const code of ['ready', 'lacked', 'off']) {
    const f = connected(t, { code }), asked = [];
    const report = await f.client.install(origin, mine, f.copy, undefined, async (...args) => { asked.push(args); return true; });
    assert.deepEqual(report, { connected: origin, signedInAs: identity.email, signIn: 'reused', apps: ['orders'], memory: 'works', state: f.stateDir, project: 'already on this computer; left as it is', folder: mine,
      summary: `Used this computer's existing sign-in as ${identity.email}. Apps that work: orders. Memory works. Project: already on this computer; left as it is, in ${mine}. Nothing else is needed.` });
    assert.deepEqual([asked, f.state.copies], [[[mine, address]], []]);
  }
});

test('install connects the apps and downloads nothing when the person lacks Project code, or the app hands none out', async t => {
  for (const [code, project] of [['lacked', 'not included. Ask your admin for access to Connect your assistant.'], ['off', 'not handed out by this app; apps only'], [null, 'not handed out by this app; apps only']]) {
    const f = connected(t, { code });
    assert.deepEqual(await f.client.install(origin, join(f.base, 'project'), f.copy), { connected: origin, signedInAs: identity.email, signIn: 'reused', apps: ['orders'], memory: 'works', state: f.stateDir, project,
      summary: `Used this computer's existing sign-in as ${identity.email}. Apps that work: orders. Memory works. Project: ${project}. Nothing else is needed.` });
    assert.deepEqual(f.state.copies, []);
  }
});

const MARKER = "const SERVED_FROM = '';";
// The real file run as a command, with a stand-in sign-in, app and Git. `git.jsonl` records how Git was called;
// the stand-in plays a copy whose tracked file may have been edited, or one that came from elsewhere.
function packaged(t, { code = 'ready' } = {}) {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'employee-command-')));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const bin = join(base, 'bin'), home = join(base, 'home'), log = join(base, 'git.jsonl');
  mkdirSync(bin); mkdirSync(home);
  const source = readFileSync(new URL('../employee-bootstrap.mjs', import.meta.url), 'utf8');
  writeFileSync(join(bin, 'cloudflared'), `#!${process.execPath}\nconsole.log('${TOKEN}');\n`, { mode: 0o700 });
  writeFileSync(join(bin, 'git'), `#!${process.execPath}
    const { appendFileSync, existsSync, mkdirSync, writeFileSync } = require('node:fs'); const { join } = require('node:path');
    const args = process.argv.slice(2), config = {};
    for (let i = 0; i < Number(process.env.GIT_CONFIG_COUNT); i++) config[process.env['GIT_CONFIG_KEY_' + i]] = process.env['GIT_CONFIG_VALUE_' + i];
    appendFileSync(${JSON.stringify(log)}, JSON.stringify({ args, config, prompt: process.env.GIT_TERMINAL_PROMPT, extra: Object.keys(process.env).filter(key => /TOKEN|SECRET|CLOUDFLARE/.test(key)) }) + '\\n');
    const dir = args[0] === '-C' ? args[1] : args.at(-1), verb = args[0] === '-C' ? args[2] : args[0];
    if (verb === 'clone') { mkdirSync(join(dir, '.git'), { recursive: true }); mkdirSync(join(dir, '.claude')); writeFileSync(join(dir, 'README.md'), 'first');
      writeFileSync(join(dir, '.claude', '.wong-stack.json'), '{"components":{"companyApi":{"origin":"${origin}"}}}'); }
    if (verb === 'config') console.log(existsSync(join(dir, 'elsewhere')) ? 'https://github.com/owner/project.git' : '${origin}${PATH}');
    if (verb === 'symbolic-ref') console.log(args.at(-1) === 'HEAD' ? 'main' : 'origin/main');
    if (verb === 'status' && existsSync(join(dir, 'edited'))) console.log(' M README.md');
    console.error('diagnostics ${TOKEN}');\n`, { mode: 0o700 });
  const preloader = join(base, 'transport.mjs');
  writeFileSync(preloader, `globalThis.fetch = async () => Response.json(${JSON.stringify({ identity, role: 'employee', apps: [], api: 'authenticated', code })});\n`);
  const env = { ...cleanEnvironment(), HOME: home, PATH: `${bin}:${process.env.PATH}`, CLOUDFLARE_API_TOKEN: 'owner-token', GH_TOKEN: 'provider-secret' };
  const run = (file, cwd, ...args) => spawnSync(process.execPath, ['--import', preloader, file, ...args], { cwd, env, encoding: 'utf8' });
  const calls = () => existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line)) : [];
  const verbs = () => calls().map(({ args }) => args[0] === '-C' ? args[2] : args[0]);
  /** The file as the app serves it, downloaded into `folder`. */
  const served = folder => {
    assert.equal(source.split(MARKER).length, 2, 'the one line the app fills in');
    mkdirSync(folder, { recursive: true });
    const file = join(folder, 'setup.mjs');
    writeFileSync(file, source.replace(MARKER, `const SERVED_FROM = ${JSON.stringify(origin)};`));
    return file;
  };
  return { base, home, source, run, calls, verbs, served };
}

test('the packaged command installs in one step, updates on the next, and ends as a failure when an update is not applied', t => {
  const { base, home, source, run: start, calls, verbs } = packaged(t);
  const helper = join(base, 'bootstrap.mjs');
  writeFileSync(helper, source);
  // Run from the home folder, where an assistant often starts: the private files still sit outside the working folder.
  const run = (...args) => start(helper, home, ...args);
  const folder = join(base, 'installed');

  const installed = run('install', '--origin', origin, '--dir', folder);
  assert.equal(installed.status, 0, installed.stderr);
  const report = JSON.parse(installed.stdout);
  assert.deepEqual([report.project, report.folder, report.signedInAs, report.connected], ['installed', folder, identity.email, origin]);
  assert.match(report.state, /\.local\/state\/wong-company\/[a-f0-9]{64}$/);
  assert.ok(report.state.startsWith(home));
  assert.equal(statSync(report.state).mode & 0o777, 0o700);
  assert.equal(report.next, undefined);
  assert.match(report.summary, /Nothing else is needed\.$/);
  // One download, from the app's own address. The session is a header for that address alone, set in Git's
  // environment: never an argument. No redirect, no prompt, no credential helper, and no other credential.
  const [asked, clone, ...pointed] = calls();
  assert.deepEqual(asked.args, ['ls-remote', '--quiet', '--exit-code', `${origin}${PATH}`, 'HEAD']);
  assert.deepEqual(clone.args, ['clone', '--quiet', '--origin', 'origin', `${origin}${PATH}`, folder]);
  assert.deepEqual(clone.config, { 'credential.helper': '', 'http.followRedirects': 'false', [`http.${origin}${PATH}.extraHeader`]: `cf-access-token: ${TOKEN}` });
  assert.deepEqual([clone.prompt, clone.extra, asked.config], ['0', [], clone.config]);
  // Then the copy's own Git is pointed at the helper beside it, for the app's address alone.
  const scope = `credential.${origin}/api/access/code/git`;
  assert.deepEqual(pointed.map(({ args }) => args.slice(2)), [['config', '--replace-all', `${scope}.helper`, ''],
    ['config', '--add', `${scope}.helper`, `!"${process.execPath}" "${join(folder, 'scripts', 'company-git-credential.mjs')}"`], ['config', `${scope}.useHttpPath`, 'true']]);
  assert.equal(calls().length, 5);

  // The same step again updates that copy.
  const updated = run('install', '--origin', origin, '--dir', folder);
  assert.deepEqual([updated.status, JSON.parse(updated.stdout).project, JSON.parse(updated.stdout).folder], [0, 'up to date', folder]);
  assert.deepEqual(verbs().slice(5), ['config', 'ls-remote', 'fetch', 'config', 'config', 'config', 'symbolic-ref', 'symbolic-ref', 'status', 'merge']);
  assert.deepEqual(calls().at(-1).args, ['-C', folder, 'merge', '--quiet', '--ff-only', 'origin/main']);
  // Only the calls that reach the app carry the session.
  assert.deepEqual(calls().filter(call => Object.keys(call.config).length === 3).map(({ args }) => args.find(arg => ['ls-remote', 'clone', 'fetch'].includes(arg))), ['ls-remote', 'clone', 'ls-remote', 'fetch']);

  // A copy the person edited is kept: no merge is tried, and the step ends as a failure a script can see.
  writeFileSync(join(folder, 'edited'), '');
  const before = calls().length;
  const kept = run('code', '--dir', folder, '--state', report.state);
  assert.deepEqual([kept.status, JSON.parse(kept.stdout)], [1, { project: 'kept your changes; update not applied', folder, applied: false }]);
  assert.deepEqual(verbs().slice(before), ['config', 'ls-remote', 'fetch', 'config', 'config', 'config', 'symbolic-ref', 'symbolic-ref', 'status']);
  for (const never of ['reset', 'clean', 'stash', 'checkout', 'push']) assert.ok(!verbs().includes(never), never);
  // Nothing Git was told, and nothing it or the helper printed, holds the session.
  assert.ok(calls().every(({ args }) => args.every(arg => !arg.includes('eyJ'))));
  for (const result of [installed, updated, kept]) assert.ok(!`${result.stdout}${result.stderr}`.includes(TOKEN));
  // With no app named, served from nowhere and outside any copy, there is nothing to set up against.
  for (const usage of [run('install'), run(), run('code', '--state', report.state)]) assert.deepEqual([usage.status, /employee-bootstrap\.mjs \[install\]/.test(usage.stderr)], [1, true]);
  assert.ok(existsSync(helper), 'a file the app did not serve stays');
});

test('the file the app serves sets up the folder it is run in, with no command and no address, and removes itself', t => {
  const f = packaged(t), here = join(f.base, 'here');
  // Nothing: installs the project.
  let file = f.served(here);
  const installed = f.run(file, here);
  assert.equal(installed.status, 0, installed.stderr);
  const report = JSON.parse(installed.stdout);
  assert.deepEqual([report.project, report.folder, report.connected], ['installed', here, origin]);
  assert.match(report.state, /\.local\/state\/wong-company\/[a-f0-9]{64}$/);
  assert.deepEqual(f.calls()[1].args, ['clone', '--quiet', '--origin', 'origin', `${origin}${PATH}`, here]);
  assert.deepEqual(readdirSync(here).sort(), ['.claude', '.git', 'README.md'], 'the setup file is gone');
  // Our read-only copy: updates it.
  file = f.served(here);
  const updated = f.run(file, here);
  assert.deepEqual([updated.status, JSON.parse(updated.stdout).project, JSON.parse(updated.stdout).folder, existsSync(file)], [0, 'up to date', here, false]);
  assert.equal(f.verbs().at(-1), 'merge');
  // Another folder can still be named.
  const named = join(f.base, 'named');
  file = f.served(here);
  assert.deepEqual([JSON.parse(f.run(file, here, '--dir', named).stdout).folder, existsSync(file)], [named, false]);
});

test('the served file stops at a folder that holds other files, changes nothing there, and still removes itself', t => {
  const f = packaged(t), busy = join(f.base, 'busy');
  const file = f.served(busy);
  writeFileSync(join(busy, 'notes.txt'), 'mine\n');
  const stopped = f.run(file, busy);
  assert.equal(stopped.status, 1);
  assert.match(stopped.stderr, /already holds other files\. Choose an empty folder with --dir; nothing was changed\./);
  assert.deepEqual([readdirSync(busy), readFileSync(join(busy, 'notes.txt'), 'utf8'), f.calls()], [['notes.txt'], 'mine\n', []]);
});

test('the served file signs in and leaves another copy of the project as it is, for a person with or without Project code', t => {
  for (const code of ['ready', 'lacked']) {
    const f = packaged(t, { code }), mine = join(f.base, 'mine');
    mkdirSync(join(mine, '.git'), { recursive: true }); mkdirSync(join(mine, 'scripts'));
    writeFileSync(join(mine, 'scripts', 'employee-bootstrap.mjs'), f.source);
    writeFileSync(join(mine, 'elsewhere'), '');
    const file = f.served(mine);
    const left = f.run(file, mine);
    assert.equal(left.status, 0, left.stderr);
    const report = JSON.parse(left.stdout);
    assert.deepEqual([report.signedInAs, report.project, report.folder], [identity.email, 'already on this computer; left as it is', mine]);
    assert.doesNotMatch(left.stdout, /not included/);
    assert.deepEqual([f.verbs(), existsSync(file), existsSync(join(mine, 'scripts', 'employee-bootstrap.mjs'))], [['config'], false, true]);
  }
});

test('with no project to hand out, the served file leaves its folder empty and keeps a client beside the sign-in', t => {
  for (const [code, project] of [['off', 'not handed out by this app; apps only'], ['lacked', 'not included. Ask your admin for access to Connect your assistant.']]) {
    const f = packaged(t, { code }), here = join(f.base, 'here');
    const connected = f.run(f.served(here), here);
    assert.equal(connected.status, 0, connected.stderr);
    const report = JSON.parse(connected.stdout), client = join(report.state, 'bootstrap.mjs');
    assert.deepEqual([report.project, report.client, report.next, readdirSync(here), f.calls()], [project, client, undefined, [], []]);
    assert.equal(statSync(client).mode & 0o777, 0o600);
    assert.ok(readFileSync(client, 'utf8').includes(MARKER), 'the kept client is served from nowhere');
    // The kept client reads the same sign-in, and stays for the next call.
    const status = f.run(client, here, 'status', '--state', report.state);
    assert.deepEqual([status.status, JSON.parse(status.stdout).code, existsSync(client)], [0, code, true]);
  }
});

test('the copy inside the project uses the address and the folder of that project, and never removes itself', t => {
  const f = packaged(t), copy = join(f.base, 'copy'), inside = join(copy, 'scripts', 'employee-bootstrap.mjs');
  mkdirSync(join(copy, '.git'), { recursive: true }); mkdirSync(join(copy, 'scripts')); mkdirSync(join(copy, '.claude'));
  writeFileSync(inside, f.source);
  assert.deepEqual([ownCopy(inside), ownCopy(join(copy, 'setup.mjs')), ownCopy(join(f.base, 'scripts', 'employee-bootstrap.mjs'))], [copy, undefined, undefined]);
  // With no address recorded there is nothing to set up against.
  assert.deepEqual([f.run(inside, f.home).status, f.calls()], [1, []]);
  writeFileSync(join(copy, '.claude', '.wong-stack.json'), JSON.stringify({ components: { companyApi: { origin } } }));
  // Run from another folder: the copy the file sits in is still the one set up.
  const updated = f.run(inside, f.home);
  assert.equal(updated.status, 0, updated.stderr);
  const report = JSON.parse(updated.stdout);
  assert.deepEqual([report.connected, report.project, report.folder, existsSync(inside)], [origin, 'up to date', copy, true]);
  // A failed run leaves it too.
  assert.deepEqual([f.run(inside, f.home, 'nothing').status, existsSync(inside)], [1, true]);
});
