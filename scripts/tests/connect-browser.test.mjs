import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile, execFileSync, spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { whereIs } from '../../.agents/skills/browser/scripts/connect-browser.mjs';
import { VIEWER } from '../../.agents/skills/hand-over/scripts/view.mjs';
import { BROWSE_ENV, fakeCamofox } from './fixtures/fake-camofox.mjs';
import { fakeTunnel, ORIGIN, TUNNEL_ENV } from './fixtures/fake-tunnel.mjs';
import { fakeViewer, fakeViewTools } from './fixtures/fake-view-tools.mjs';

const HELPER = fileURLToPath(new URL('../../.agents/skills/browser/scripts/connect-browser.mjs', import.meta.url));
const HAND_OVER = fileURLToPath(new URL('../../.agents/skills/hand-over/scripts/hand-over.mjs', import.meta.url));

// A stand-in scripts/cf-secrets.mjs: it logs its argv and a digest of its stdin, never the stdin itself.
const CF_SECRETS = `import { appendFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const input = readFileSync(0, 'utf8');
appendFileSync(process.env.CF_LOG, JSON.stringify({ argv: process.argv.slice(2), digest: createHash('sha256').update(input).digest('hex'),
  login: process.env.CLOUDFLARE_API_TOKEN ?? null }) + '\\n');
if (process.env.CF_FAIL) { console.error('cf-secrets: ERROR — could not save it'); process.exit(1); }
if (process.env.CF_LATER) { console.log('cf-secrets: TOOL_STRIPE is on a new version, not on the live app yet: it reaches the live app at the next publish.'); process.exit(0); }
console.log('cf-secrets: saved on the live app');
`;

// A stand-in scripts/company-api.mjs, as `key send <name> --value-stdin` answers: it logs its argv, folder and a digest
// of its stdin, never the stdin; CA_REFUSE refuses with that code, CA_FAIL fails echoing the value, as a careless one.
const COMPANY_API = `import { appendFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const input = readFileSync(0, 'utf8');
appendFileSync(process.env.CA_LOG, JSON.stringify({ argv: process.argv.slice(2), cwd: process.cwd(),
  digest: createHash('sha256').update(input).digest('hex') }) + '\\n');
if (process.env.CA_REFUSE) { console.log(JSON.stringify({ error: { code: process.env.CA_REFUSE, message: 'the app said no' } })); process.exit(1); }
if (process.env.CA_FAIL) { console.error('company-api: could not send ' + input); process.exit(1); }
console.log(JSON.stringify({ name: process.argv[4], ends: input.slice(-4), waiting: true }));
`;

/** Each JSON line a stand-in logged, or none. */
const logged = file => existsSync(file) ? readFileSync(file, 'utf8').trim().split('\n').map(line => JSON.parse(line)) : [];
const digest = value => createHash('sha256').update(value).digest('hex');

/** A primary checkout and its worktree, a stand-in cf-secrets and company-api; with `camoufox`, a fake Camoufox
 * install whose stand-in server a test starts, `{ installed: false }` leaving the install out. */
function fixture(t, { camoufox = null } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-connect-browser-'));
  const camofox = camoufox ? fakeCamofox(dir, camoufox) : null;
  t.after(() => { camofox?.stop(); rmSync(dir, { recursive: true, force: true }); });
  const primary = join(dir, 'primary'), temp = join(dir, 'tmp');
  for (const folder of [join(primary, 'scripts'), join(primary, 'app'), temp]) mkdirSync(folder, { recursive: true });
  writeFileSync(join(primary, 'scripts', 'cf-secrets.mjs'), CF_SECRETS);
  writeFileSync(join(primary, 'scripts', 'company-api.mjs'), COMPANY_API);
  writeFileSync(join(primary, '.gitignore'), '.dev.vars\n');
  const git = (...args) => execFileSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', ...args], { cwd: primary, stdio: 'ignore' });
  git('init', '-q', '-b', 'main'); git('add', '.'); git('commit', '-qm', 'init');
  const worktree = join(dir, 'wt');
  git('worktree', 'add', '-q', '-b', 'connect', worktree);
  writeFileSync(join(primary, 'app', '.dev.vars'), 'OTHER_KEY=kept\nTOOL_STRIPE=old\n');
  const cfLog = join(dir, 'cf.log'), caLog = join(dir, 'ca.log');
  const options = env => ({ cwd: worktree, encoding: 'utf8',
    env: { PATH: process.env.PATH, HOME: dir, TMPDIR: temp, CF_LOG: cfLog, CA_LOG: caLog, ...(camofox && BROWSE_ENV), ...env } });
  const run = (args, env = {}) => {
    const result = spawnSync(process.execPath, [HELPER, ...args], options(env));
    return { status: result.status, stdout: result.stdout, stderr: result.stderr };
  };
  /** As `run`, with this process free meanwhile, so a child of the test that ends is reaped and seen gone. */
  const runFree = (args, env = {}) => new Promise((resolve, reject) => execFile(process.execPath, [HELPER, ...args], options(env),
    (error, stdout, stderr) => (error && typeof error.code !== 'number' ? reject(error) : resolve({ status: error?.code ?? 0, stdout, stderr }))));
  return { dir, primary, worktree, temp, run, runFree, cfLog, caLog, camofox };
}

test('a command it does not know, the wrong number of words, or a flag of another command is a usage error', t => {
  const f = fixture(t);
  for (const args of [['look'], ['open'], ['take-key', '@e1', '@e2', '--tool', 'x'],
    ['read', '--id'], ['read', '--server'], ['read', '--stopped'], ['wait-click', '@e2']]) {
    assert.equal(f.run(args).status, 2, args.join(' '));
  }
  assert.match(f.run(['click', 'button']).stderr, /not a ref from read/);
});

// The assistant's browser on a server: a fake Camoufox under the test's HOME and its stand-in browse server.
// Made up for the test: no service ever issued it.
const NOTION_KEY = 'ntn_' + 'MADEUPkey0000aaaaBBBBcccc91c0';
const INTEGRATIONS = 'https://www.notion.so/profile/integrations';
const SECRET_PAGE = `- heading "Internal integration secret"\n- textbox "Secret key" [e1]: ${NOTION_KEY}\n- button "Show ${NOTION_KEY}" [e2]\n- textbox "Password" [e3]`;
const SIGN_IN_PAGE = '- heading "Log in to Notion"\n- textbox "Email" [e1]\n- textbox "Password" [e2]\n- button "Continue" [e3]';
const BROWSE = fileURLToPath(new URL('../../.agents/skills/browser/scripts/browse.mjs', import.meta.url));

/** A fixture attached to the assistant's browser, with its page open at the integrations page; `prepare` runs before
 * the browser starts. */
function onServer(t, page = SECRET_PAGE, prepare = () => {}) {
  const f = fixture(t, { camoufox: {} });
  f.camofox.set('snapshot', page);
  prepare(f);
  assert.equal(f.run(['attach', '--server']).stdout, 'BROWSER=camoufox\n');
  const opened = f.run(['open', INTEGRATIONS]);
  assert.equal(opened.stdout, 'opened www.notion.so\n', `${opened.stderr}${f.camofox.errors()}`);
  return f;
}

/** A stand-in for this chat's open watch link, held by `control`; a live child running `script` stands in for its
 * watcher, given the link's folder. */
function fakeWatch(t, f, control, turn = null, script = 'setTimeout(() => {}, 60000)') {
  const dir = join(f.dir, '.wong-stack', 'hand-over', 'links', 'wt');
  mkdirSync(dir, { recursive: true });
  const watcher = spawn(process.execPath, ['-e', script, dir], { stdio: 'ignore' });
  t.after(() => watcher.kill());
  writeFileSync(join(dir, 'state.json'), JSON.stringify({ completionId: 'c1', view: { watch: true } }));
  writeFileSync(join(dir, 'watcher.pid'), `${watcher.pid}\n`);
  writeFileSync(join(dir, 'control.json'), JSON.stringify(control));
  if (turn) writeFileSync(join(dir, 'turn.json'), JSON.stringify(turn));
  return { dir, line: () => JSON.parse(readFileSync(join(dir, 'line.json'), 'utf8')).text, turn: () => JSON.parse(readFileSync(join(dir, 'turn.json'), 'utf8')) };
}

test('where names the place from the platform, its screen and the browser\'s window, and connects to nothing', () => {
  const view = (answer) => () => answer;
  const off = { unsupported: 'off Linux', missing: [] };
  const on = () => true, hidden = () => false;
  const cases = [
    [{ platform: 'darwin', env: {}, view: view(off), shown: on }, 'window'],
    [{ platform: 'win32', env: {}, view: view(off), shown: on }, 'window'],
    [{ platform: 'darwin', env: {}, view: view({ window: true, missing: [] }), shown: hidden }, 'window'],
    [{ platform: 'darwin', env: {}, view: view(off), shown: hidden }, 'link'],
    [{ platform: 'linux', env: { DISPLAY: ':0' }, view: view({ window: true, missing: [] }), shown: hidden }, 'window'],
    [{ platform: 'linux', env: { WAYLAND_DISPLAY: 'wayland-0' }, view: view({ window: true, missing: [] }), shown: hidden }, 'window'],
    [{ platform: 'linux', env: {}, view: view({ window: true, missing: [] }), shown: on }, 'server'],
    [{ platform: 'linux', env: {}, view: view({ missing: ['novnc'] }), shown: on }, 'server'],
    [{ platform: 'linux', env: {}, view: view({ unsupported: 'no screen', missing: [] }), shown: on }, 'link'],
    [{ platform: 'freebsd', env: {}, view: view(off), shown: on }, 'link'],
  ];
  for (const [given, want] of cases) assert.equal(whereIs(given), want, JSON.stringify(given));
});

test('where connects to nothing, and attach, with --server or not, asks for an install it lacks', t => {
  const f = fixture(t, { camoufox: { installed: false } });
  assert.match(f.run(['where']).stdout, /^WHERE=(window|server|link)\n$/);
  assert.deepEqual(f.camofox.requests(), []);
  for (const args of [['attach'], ['attach', '--server']]) {
    const missing = f.run(args);
    assert.equal(missing.status, 3, args.join(' '));
    assert.equal(missing.stdout, 'BROWSE_NEEDS=install\n');
    assert.match(missing.stderr, /browse\.mjs install/);
  }
  assert.equal(f.run(['open', 'https://x.example.com/', '--server']).status, 2);
});

test('in the assistant\'s browser, read hides a key, no picture while one shows, and no typing into a password box', t => {
  const f = onServer(t);
  const read = f.run(['read']);
  assert.equal(read.status, 0, read.stderr);
  assert.match(read.stdout, /textbox "Secret key" \[e1\]: \[key …91c0\]/);
  assert.ok(!read.stdout.includes(NOTION_KEY));
  assert.match(f.run(['picture', join(f.dir, 'p.png')]).stderr, /A key shows on this page/);
  assert.match(f.run(['fill', '@e3', 'hunter2']).stderr, /password or a sign-in code/);
  assert.ok(!f.camofox.calls().some(call => /\/(type|screenshot)\b/.test(call)));
  f.camofox.set('snapshot', '- heading "New integration"\n- textbox "Name" [e1]\n- button "Save" [e2]');
  assert.equal(f.run(['picture', join(f.dir, 'p.png')]).status, 0);
  assert.equal(readFileSync(join(f.dir, 'p.png'), 'utf8'), 'png-1');
  assert.equal(f.run(['fill', '@e1', 'assistant read-only']).stdout, 'Done\n');
  assert.equal(f.run(['click', 'e2']).stdout, 'Done\n');
  assert.equal(f.run(['wait', '500']).status, 0);
  assert.equal(f.run(['wait', 'e2']).status, 0);
  assert.equal(f.run(['wait', 'e9']).status, 1, 'a ref that never shows');
  assert.equal(f.run(['open', 'http://www.notion.so/']).status, 1, 'an address that is not https');
});

test('a click that waits for the person\'s turn in another chat\'s tab answers at once, and wait-click says how it ended', t => {
  const f = onServer(t, '- heading "New integration"\n- button "Save" [e2]');
  assert.deepEqual([f.run(['wait-click']).stdout], ['No click waits.\n'], 'with no click sent, none waits');
  f.camofox.set('click-queued');
  f.camofox.set('click-still-waiting');
  let before = f.camofox.calls().length;
  const clicked = f.run(['click', '@e2']);
  assert.equal(clicked.status, 0, clicked.stderr);
  assert.match(clicked.stdout, /^The person is using the browser in another chat's tab, so this click runs when their turn ends\. Run `browser\.mjs wait-click` in the background/);
  assert.deepEqual(f.camofox.calls().slice(before).filter(call => /click/.test(call)), ['POST /tabs/:tab/click'], 'it did not wait for the turn');
  f.camofox.unset('click-queued');
  before = f.camofox.calls().length;
  const ran = f.run(['wait-click']);
  assert.deepEqual([ran.status, ran.stdout], [0, 'Done\n'], ran.stderr);
  assert.deepEqual(f.camofox.calls().slice(before).filter(call => /click/.test(call)), ['GET /tabs/:tab/click', 'GET /tabs/:tab/click'], 'it waited until the click ran');
  assert.equal(f.run(['wait-click']).stdout, 'No click waits.\n', 'once it ran, none waits');
  f.camofox.set('click-queued');
  f.run(['click', '@e2']);
  f.camofox.unset('click-queued');
  f.camofox.set('waited-error', 'e2 is not on the page now; read the page again and use a current ref');
  const failed = f.run(['wait-click']);
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /e2 is not on the page now/);
});

/** No stand-in's log, and no argv sent, holds a copy of `value`. */
function nowhere(f, value) {
  for (const log of [f.caLog, f.cfLog]) assert.ok(!existsSync(log) || !readFileSync(log, 'utf8').includes(value), log);
  for (const entry of logged(f.caLog)) assert.ok(!entry.argv.join(' ').includes(value), 'not in argv');
}

test('in the assistant\'s browser, take-key reads the key unseen, keeps it here, and sends it sealed through the app on stdin alone', t => {
  const f = onServer(t);
  for (const args of [['take-key', '--tool', 'notion'], ['take-key', '@e1', '--tool', 'notion']]) {
    const result = f.run(args);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'TOOL_NOTION sent, ends in …91c0, goes live at the next publish\n');
    assert.ok(!`${result.stdout}${result.stderr}`.includes(NOTION_KEY));
    // A key in a box the page marks secret reads [hidden] in every snapshot, and still moves by its ref.
    f.camofox.set('secrets.json', [NOTION_KEY]);
  }
  const file = join(f.primary, 'app', '.dev.vars');
  assert.equal(readFileSync(file, 'utf8'), `OTHER_KEY=kept\nTOOL_STRIPE=old\nTOOL_NOTION=${NOTION_KEY}\n`);
  assert.equal(statSync(file).mode & 0o777, 0o600);
  const sent = logged(f.caLog);
  assert.deepEqual(sent.map(entry => entry.argv), [['key', 'send', 'TOOL_NOTION', '--value-stdin'], ['key', 'send', 'TOOL_NOTION', '--value-stdin']]);
  assert.ok(sent.every(entry => entry.digest === digest(NOTION_KEY) && entry.cwd === realpathSync(f.worktree)));
  assert.equal(existsSync(f.cfLog), false, 'no Cloudflare login is needed or used');
  nowhere(f, NOTION_KEY);
  assert.match(f.run(['take-key', '@e9', '--tool', 'notion']).stderr, /No key shows at @e9/);
  assert.equal(f.run(['take-key', '--tool', 'Notion']).status, 1, 'a tool id in lowercase only');
});

test('take-key --id sends a tool\'s ID as TOOL_<ID>_ID, beside its secret', t => {
  const f = onServer(t);
  const result = f.run(['take-key', '@e1', '--tool', 'shop-app', '--id']);
  assert.equal(result.stdout, 'TOOL_SHOP_APP_ID sent, ends in …91c0, goes live at the next publish\n', result.stderr);
  assert.deepEqual(logged(f.caLog).map(entry => entry.argv), [['key', 'send', 'TOOL_SHOP_APP_ID', '--value-stdin']]);
  assert.match(readFileSync(join(f.primary, 'app', '.dev.vars'), 'utf8'), new RegExp(`\nTOOL_SHOP_APP_ID=${NOTION_KEY}\n$`));
});

// Notion's new connection page, as met live: the token is plain text with no ref, beside a long name and an id.
const CONNECTION_PAGE = `- heading "WongStack (read only)"\n- link "Back" [e1]:\n  - /url: /developers/connections/3f0c2a9e-1b2c-4d5e-8f90-a1b2c3d4e5f6
- textbox [e2]: WongStack (read only)\n- text: Claymoo API token ${NOTION_KEY}\n- button "Copy" [e3]`;

test('take-key takes the one key that starts like a service\'s', t => {
  const f = onServer(t, CONNECTION_PAGE);
  const result = f.run(['take-key', '--tool', 'notion']);
  assert.equal(result.stdout, 'TOOL_NOTION sent, ends in …91c0, goes live at the next publish\n', result.stderr);
  assert.equal(logged(f.caLog)[0].digest, digest(NOTION_KEY));
});

test('an app with no lock for keys yet takes the key through this computer\'s Cloudflare login, when it has one', t => {
  const f = onServer(t);
  const refused = f.run(['take-key', '--tool', 'notion'], { CA_REFUSE: 'no_seal' });
  assert.equal(refused.status, 1);
  assert.equal(refused.stdout, '');
  assert.match(refused.stderr, /^TOOL_NOTION is saved on this computer, ends in …91c0, but not sent to the app: no_seal: the app said no\n$/);
  assert.equal(existsSync(f.cfLog), false, 'no login, no put');

  writeFileSync(join(f.primary, '.env'), 'CLOUDFLARE_API_TOKEN=cf-login\nOTHER=not-passed\n');
  const saved = f.run(['take-key', '--tool', 'notion'], { CA_REFUSE: 'no_seal' });
  assert.equal(saved.stdout, 'TOOL_NOTION saved, ends in …91c0\n', saved.stderr);
  const later = f.run(['take-key', '--tool', 'notion'], { CA_REFUSE: 'no_seal', CF_LATER: '1' });
  assert.equal(later.stdout, 'TOOL_NOTION saved on this computer, ends in …91c0; it reaches the live app at the next publish\n', later.stderr);
  const failed = f.run(['take-key', '--tool', 'notion'], { CA_REFUSE: 'no_seal', CF_FAIL: '1' });
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /TOOL_NOTION is saved on this computer, ends in …91c0, but not on the live app: cf-secrets: ERROR/);
  const puts = logged(f.cfLog);
  assert.deepEqual(puts.map(entry => [entry.argv, entry.digest, entry.login]), Array(3).fill([['put-tool', 'TOOL_NOTION'], digest(NOTION_KEY), 'cf-login']));

  // Any other refusal, or a failure, never falls back, and an echo of the value is masked.
  const owner = f.run(['take-key', '--tool', 'notion'], { CA_REFUSE: 'owner_required' });
  assert.match(owner.stderr, /but not sent to the app: owner_required: the app said no/);
  const echoed = f.run(['take-key', '--tool', 'notion'], { CA_FAIL: '1' });
  assert.equal(echoed.status, 1);
  assert.match(echoed.stderr, /but not sent to the app: company-api: could not send /);
  assert.equal(logged(f.cfLog).length, 3, 'no put after another refusal');
  for (const result of [refused, saved, later, failed, owner, echoed]) assert.ok(!`${result.stdout}${result.stderr}`.includes(NOTION_KEY));
  nowhere(f, NOTION_KEY);
});

test('with no profile, take-key keeps the key in this computer\'s ignored .env alone, and refuses when .env is not ignored', t => {
  const f = onServer(t);
  const none = { WONG_BROWSER_PROFILE: '' };
  const refused = f.run(['take-key', '--tool', 'notion'], none);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /TOOL_NOTION is not saved: \.env is not git-ignored here/);
  assert.equal(existsSync(join(f.primary, '.env')), false);
  writeFileSync(join(f.primary, '.gitignore'), '.dev.vars\n.env\n');
  const kept = f.run(['take-key', '--tool', 'notion'], none);
  assert.equal(kept.stdout, 'TOOL_NOTION saved on this computer only, ends in …91c0, in .env\n', kept.stderr);
  assert.equal(readFileSync(join(f.primary, '.env'), 'utf8'), `TOOL_NOTION=${NOTION_KEY}\n`);
  assert.equal(readFileSync(join(f.primary, 'app', '.dev.vars'), 'utf8'), 'OTHER_KEY=kept\nTOOL_STRIPE=old\n', 'the app file is untouched');
  assert.deepEqual([existsSync(f.caLog), existsSync(f.cfLog)], [false, false], 'nothing sent');
  nowhere(f, NOTION_KEY);
});

test('take-key never picks a publishable key that shows in full beside an account id', t => {
  const f = onServer(t, `- heading "API keys"\n- text: Publishable key ${'pk_live_' + '51HxQwErTy0123456789AbCdEf'}\n- text: Account ${'acct_' + '1HxQwErTy0123456'}`);
  assert.match(f.run(['take-key', '--tool', 'stripe']).stderr, /Several keys show on this page/);
});

test('in the assistant\'s browser, done closes only its own page and leaves another chat\'s', t => {
  const f = onServer(t);
  const errand = spawnSync(process.execPath, [BROWSE, 'open', 'https://mail.example.com/', '--session', 'errand'],
    { cwd: f.dir, encoding: 'utf8', env: { ...process.env, ...BROWSE_ENV, HOME: f.dir } });
  assert.equal(errand.status, 0, errand.stderr);
  assert.equal(f.camofox.tabs().length, 2);
  const done = f.run(['done']);
  assert.equal(done.stdout, 'closed the page; the browser stays open\n', done.stderr);
  assert.deepEqual(f.camofox.tabs().map(tab => tab.session), ['errand']);
  assert.match(f.run(['read']).stderr, /one this helper opened/, 'nothing is ours after done');
});

test('while the person holds the watch link\'s browser, every command that acts on the page is refused', t => {
  for (const [control, turn, marker] of [[{ control: 'person' }, null, 'CONNECT_PAUSED=taken-over'],
    [{ control: 'assistant', turnDone: 0 }, { n: 1, until: `${INTEGRATIONS}**` }, 'CONNECT_PAUSED=your-turn']]) {
    const f = onServer(t);
    fakeWatch(t, f, control, turn);
    const before = f.camofox.calls().length;
    for (const args of [['read'], ['click', '@e2'], ['open', INTEGRATIONS], ['take-key', '--tool', 'notion'], ['sign-in', '--tool', 'Notion']]) {
      const result = f.run(args);
      assert.equal(result.status, 1, args.join(' '));
      assert.equal(result.stdout, `${marker}\n`, args.join(' '));
    }
    assert.equal(f.camofox.calls().length, before, 'the browser got nothing');
    assert.equal(f.run(['where']).status, 0);
  }
});

test('sign-in and watch work only on the helper\'s own page, and a turn waits for Hand back', t => {
  const fresh = fixture(t, { camoufox: {} });
  fresh.run(['attach', '--server']);
  for (const args of [['sign-in', '--tool', 'Notion'], ['watch']]) assert.match(fresh.run(args).stderr, /No page is one this helper opened/, args.join(' '));

  const f = onServer(t, SIGN_IN_PAGE);
  const watch = fakeWatch(t, f, { control: 'assistant', turnDone: 0 });
  const turn = f.run(['sign-in', '--tool', 'Notion']);
  assert.equal(turn.stdout, 'CONNECT_PAUSED=your-turn\n', turn.stderr);
  assert.deepEqual(watch.turn(), { n: 1, note: 'Sign in to Notion, then tap Hand back.' });
  assert.equal(f.run(['read']).stdout, 'CONNECT_PAUSED=your-turn\n');
  const g = onServer(t, '- heading "Integrations"\n- button "New integration" [e1]');
  fakeWatch(t, g, { control: 'assistant', turnDone: 0 });
  assert.match(g.run(['sign-in', '--tool', 'Notion']).stderr, /shows no sign-in/);
});

/** A live view this server could open, from stand-ins: a tunnel, the view's tools, and the browser's screen, set
 * before the browser starts; returns the environment that names them. */
function viewable(f) {
  // The fixture makes no bin folder now that no agent-browser stand-in lives there.
  mkdirSync(join(f.dir, 'bin'), { recursive: true });
  fakeTunnel(join(f.dir, 'bin'), join(f.dir, 'tunnel.log'));
  fakeViewer(f.dir, VIEWER.version);
  f.camofox.set('display', ':97');
  const tools = fakeViewTools(f.dir, f.camofox.control).env();
  return { ...TUNNEL_ENV, ...tools, PATH: `${join(f.dir, 'bin')}:${tools.PATH ?? process.env.PATH}` };
}

const linux = { skip: process.platform !== 'linux' && 'a live view runs on Linux only' };

test('sign-in with no watch link open opens one and starts the turn, and watch still opens one on request', linux, async t => {
  for (const command of [['sign-in', '--tool', 'Notion'], ['watch']]) {
    let env;
    const f = onServer(t, SIGN_IN_PAGE, g => { env = viewable(g); });
    const dir = join(f.dir, '.wong-stack', 'hand-over', 'links', 'wt');
    try {
      const out = await f.runFree(command, env);
      assert.equal(out.status, 0, out.stderr);
      const link = new RegExp(`^HANDOVER_LINK=${ORIGIN}/#key=[0-9a-f]{64}$`, 'm');
      assert.match(out.stdout, link, command.join(' '));
      if (command[0] === 'watch') {
        assert.doesNotMatch(out.stdout, /CONNECT_PAUSED/);
        assert.equal(existsSync(join(dir, 'turn.json')), false, 'watch starts no turn');
        continue;
      }
      assert.match(out.stdout, /\nCONNECT_PAUSED=your-turn\n$/, 'the link prints before the turn\'s marker');
      assert.deepEqual(JSON.parse(readFileSync(join(dir, 'turn.json'), 'utf8')),
        { n: 1, note: 'Sign in to Notion, then tap Hand back.' });
      assert.equal((await f.runFree(['read'], env)).stdout, 'CONNECT_PAUSED=your-turn\n');
    } finally {
      await f.runFree(['done'], env);
    }
  }
});

test('each command sets the watch link\'s line, and no line holds a key', t => {
  const f = onServer(t);
  const watch = fakeWatch(t, f, { control: 'assistant', turnDone: 0 });
  f.run(['open', INTEGRATIONS]);
  assert.equal(watch.line(), 'Opening www.notion.so…');
  assert.equal(f.run(['click', '@e2']).status, 0);
  assert.equal(watch.line(), 'Clicking Show [key …91c0]…');
  assert.equal(f.run(['take-key', '@e1', '--tool', 'notion']).status, 0);
  assert.equal(watch.line(), 'Key sent, ends in …91c0');
  assert.ok(!readdirSync(join(f.dir, '.wong-stack', 'hand-over'), { recursive: true }).some(name => {
    const file = join(f.dir, '.wong-stack', 'hand-over', name);
    return statSync(file).isFile() && readFileSync(file, 'utf8').includes(NOTION_KEY);
  }));
});

test('a sign-in turn opens even on a page an old finish would have met, and holds the browser until Hand back', t => {
  const f = onServer(t, SIGN_IN_PAGE);
  const watch = fakeWatch(t, f, { control: 'assistant', turnDone: 0 });
  f.camofox.set('count', '0');
  const turn = f.run(['sign-in', '--tool', 'Notion']);
  assert.equal(turn.stdout, 'CONNECT_PAUSED=your-turn\n', turn.stderr);
  assert.deepEqual(Object.keys(watch.turn()).sort(), ['n', 'note'], 'the turn holds no finish');
  assert.equal(f.run(['read']).stdout, 'CONNECT_PAUSED=your-turn\n');
  assert.match(f.run(['read']).stderr, /until it prints handed-back; in a browser window, run `hand-over\.mjs close` once they say done/);
});

test('an attach starts afresh: a page an earlier attach opened is not the helper\'s, and --server changes nothing', t => {
  const f = onServer(t);
  assert.equal(f.run(['attach']).stdout, 'BROWSER=camoufox\n');
  assert.match(f.run(['read']).stderr, /No page is one this helper opened/);
  assert.equal(f.run(['open', INTEGRATIONS]).stdout, 'opened www.notion.so\n');
  assert.equal(f.run(['read']).status, 0);
  assert.equal(f.run(['attach', '--server']).stdout, 'BROWSER=camoufox\n');
  assert.match(f.run(['read']).stderr, /No page is one this helper opened/);
});

// A stand-in watcher that ends as the real one does on close: its result from the closing mark, then its pid gone.
const CLOSING_WATCHER = `const fs = require('node:fs'), path = require('node:path'), dir = process.argv[1];
process.on('SIGTERM', () => {
  const stopped = fs.readFileSync(path.join(dir, 'closing'), 'utf8').trim() === 'stopped';
  fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify({ result: stopped ? 'stopped' : 'done', completionId: 'c1' }));
  fs.rmSync(path.join(dir, 'watcher.pid'));
  process.exit(0);
});
fs.writeFileSync(path.join(dir, 'ready'), '');
setInterval(() => {}, 1000);`;

test('done closes an open watch link, and passes --stopped on', async t => {
  for (const [args, want] of [[['done'], 'done'], [['done', '--stopped'], 'stopped']]) {
    const f = onServer(t);
    const watch = fakeWatch(t, f, { control: 'assistant', turnDone: 0 }, null, CLOSING_WATCHER);
    for (const end = Date.now() + 5000; !existsSync(join(watch.dir, 'ready')) && Date.now() < end;) await new Promise(done => setTimeout(done, 20));
    const result = await f.runFree(args);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(readFileSync(join(watch.dir, 'result.json'), 'utf8')).result, want, args.join(' '));
    assert.equal(existsSync(join(watch.dir, 'watcher.pid')), false, 'the watch link is closed');
    assert.deepEqual(f.camofox.tabs(), [], 'and the helper\'s page');
  }
});

/** Records the running browser as shown in its own window, as off Linux. */
function inWindow(f) {
  const record = join(f.camofox.install, 'server.json');
  writeFileSync(record, JSON.stringify({ ...JSON.parse(readFileSync(record, 'utf8')), window: true }));
}

test('in a browser window, watch opens nothing, and sign-in gives a turn there that a page change never ends', async t => {
  const f = onServer(t, SIGN_IN_PAGE);
  inWindow(f);
  const dir = join(f.dir, '.wong-stack', 'hand-over', 'links', 'wt');
  const env = { HANDOVER_POLL_MS: '50' };
  try {
    const watch = await f.runFree(['watch'], env);
    assert.equal(watch.stdout, 'HANDOVER_VIEW=window\n', watch.stderr);
    assert.equal(existsSync(join(dir, 'state.json')), false, 'watch opens nothing');

    const turn = await f.runFree(['sign-in', '--tool', 'Notion'], env);
    assert.equal(turn.status, 0, turn.stderr);
    assert.match(turn.stdout, /^HANDOVER_VIEW=window\nHANDOVER_SEND=[^\n]+\nCONNECT_PAUSED=your-turn\n$/);
    assert.doesNotMatch(turn.stdout, /HANDOVER_LINK|https?:/);
    const note = 'Sign in to Notion in the browser window, then say done.';
    assert.deepEqual(JSON.parse(readFileSync(join(dir, 'turn.json'), 'utf8')), { n: 1, note });
    assert.equal((await f.runFree(['read'], env)).stdout, 'CONNECT_PAUSED=your-turn\n');

    // The person signs in: the key page shows no sign-in box, and the browser stays theirs until they say done.
    f.camofox.set('count', '0');
    await new Promise(done => setTimeout(done, 300));
    assert.equal((await f.runFree(['read'], env)).stdout, 'CONNECT_PAUSED=your-turn\n', 'a page change ends no turn');
    const closed = await new Promise(done => execFile(process.execPath, [HAND_OVER, 'close'], { cwd: f.worktree, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: f.dir, TMPDIR: f.temp, ...BROWSE_ENV, ...env } }, (_, stdout) => done(stdout)));
    assert.match(closed, /^HANDOVER_RESULT=done$/m, 'the person said done: close ends the turn');
    assert.equal((await f.runFree(['read'], env)).status, 0, 'the agent reads the key page again');
  } finally {
    await f.runFree(['done'], env);
  }
  assert.equal(existsSync(join(dir, 'watcher.pid')), false, 'done closes the watch');
});
