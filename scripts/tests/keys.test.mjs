import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { authPlace, checkGuide, checkKey, cleanValue, declarations, firstSentence, formatLine, httpsUrl, keyRoutes, LIMITS, setKey } from '../../.agents/skills/hand-over/scripts/keys.mjs';
import { filledKeys } from '../../.agents/skills/hand-over/scripts/keys-page.mjs';
import { parseEnv } from '../../.agents/skills/memory/scripts/lib/store.mjs';
import { fakeTunnel, TUNNEL_ENV } from './fixtures/fake-tunnel.mjs';

const legacyOutput = text => text.replace(/^HANDOVER_(COMPLETION|NOTIFICATION)=.*\n/gm, '');
const legacyResult = ({ completionId: _completionId, notification: _notification, ready: _ready, ...result }) => result;
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, '.agents/skills/hand-over/scripts/hand-over.mjs');
const seedScript = join(repo, '.agents/skills/ship/scripts/worktree-secrets.mjs');
const KEY = /#key=([0-9a-f]{64})$/m;
const SECRET = 'sk_live_Secret123';
const SPACED = 'pa ss #word';

const ENV_EXAMPLE = `# .env.example

# --- Maps ---

# The Maps key. Google Cloud → APIs → Credentials.
# More words that never show.
MAPS_API_KEY=

TWICE=
# Commented out, so not declared.
# LATER_KEY=
`;
const DEV_VARS_EXAMPLE = `# Secret key for the payments provider. Use the TEST key in .dev.vars.staging.
STRIPE_SECRET_KEY=
TWICE=
`;
const IGNORE = '.env*\n!.env.example\n.dev.vars*\n!.dev.vars.example\n';

const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', ...args], { cwd, stdio: 'ignore' });

// A primary checkout declaring MAPS_API_KEY (.env), STRIPE_SECRET_KEY (app/.dev.vars), and TWICE (both),
// with `.env` seeded into a linked worktree and `app/.dev.vars` not. A fake agent-browser and tunnel tool
// log each call; HOME is the fixture's own.
function fixture(t, { env = 'A=1\n', ignore = IGNORE } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-keys-'));
  const bin = join(root, 'bin');
  const primary = join(root, 'primary');
  const worktree = join(root, 'wt');
  mkdirSync(bin);
  mkdirSync(join(primary, 'app'), { recursive: true });
  const log = join(root, 'calls.log');
  writeFileSync(join(bin, 'agent-browser'), `#!${process.execPath}\nrequire('node:fs').appendFileSync(${JSON.stringify(log)}, 'agent-browser ' + process.argv.slice(2).join(' ') + '\\n');\n`);
  chmodSync(join(bin, 'agent-browser'), 0o755);
  fakeTunnel(bin, log);
  git(primary, 'init', '-q', '-b', 'main');
  writeFileSync(join(primary, '.gitignore'), ignore);
  writeFileSync(join(primary, '.env.example'), ENV_EXAMPLE);
  writeFileSync(join(primary, 'app/.dev.vars.example'), DEV_VARS_EXAMPLE);
  git(primary, 'add', '.');
  git(primary, 'commit', '-qm', 'init');
  writeFileSync(join(primary, '.env'), env);
  git(primary, 'worktree', 'add', '-q', '-b', 'feature', worktree);
  execFileSync(process.execPath, [seedScript, 'seed'], { cwd: worktree, stdio: 'ignore' });
  const environment = { ...process.env, ...TUNNEL_ENV, HOME: root, PATH: `${bin}:/usr/bin:/bin`, HANDOVER_POLL_MS: '50' };
  const outputs = [];
  const run = (cwd, ...args) => {
    const out = spawnSync(process.execPath, [script, ...args], { cwd, env: environment, encoding: 'utf8', timeout: 30_000 });
    outputs.push(out.stdout, out.stderr);
    out.rawStdout = out.stdout;
    out.stdout = legacyOutput(out.stdout);
    return out;
  };
  const state = join(root, '.wong-stack/hand-over');
  t.after(() => {
    run(worktree, 'close');
    rmSync(root, { recursive: true, force: true });
  });
  return {
    primary,
    worktree,
    state,
    run: (...args) => run(worktree, ...args),
    runIn: run,
    read: (base, rel) => (existsSync(join(base, rel)) ? readFileSync(join(base, rel), 'utf8') : null),
    calls: () => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean) : []),
    stateFiles: () => (existsSync(state) ? readdirSync(state).map(name => readFileSync(join(state, name), 'utf8')).join('\n') : ''),
    outputs: () => outputs.join('\n'),
  };
}

/** Runs `open --keys`, asserts it worked, and returns the key and the page's recorded loopback port. */
function opened(f, names, ...args) {
  const out = f.run('open', '--keys', names, ...args);
  assert.equal(out.status, 0, out.stderr + out.stdout);
  return { key: KEY.exec(out.stdout)?.[1], port: JSON.parse(readFileSync(join(f.state, 'state.json'), 'utf8')).port };
}

/** Calls a route with the key header unless `key` is null; resolves to the status and JSON. */
async function route(port, key, path, body) {
  const response = await fetch(`http://127.0.0.1:${port}/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: key === null ? {} : { 'x-hand-over-key': key },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, json: text ? JSON.parse(text) : null };
}

test('the key link serves its page and the asked-for keys, touching no browser page', async t => {
  const f = fixture(t, { env: 'A=1\nMAPS_API_KEY=old\n' });
  const { port, key } = opened(f, 'MAPS_API_KEY,STRIPE_SECRET_KEY');
  assert.match(await (await fetch(`http://127.0.0.1:${port}/`)).text(), /Keys for your assistant/);
  assert.match(await (await fetch(`http://127.0.0.1:${port}/page.mjs`)).text(), /export function filledKeys/);
  assert.deepEqual((await route(port, key, 'keys')).json.keys, [
    { name: 'MAPS_API_KEY', hint: 'The Maps key.', set: true },
    { name: 'STRIPE_SECRET_KEY', hint: 'Secret key for the payments provider.', set: false },
  ]);
  assert.equal((await route(port, key, 'fields')).status, 404, 'no field routes');
  assert.deepEqual(f.calls().filter(line => line.startsWith('agent-browser')), [], 'no agent-browser');
  assert.ok(f.calls().some(line => line.startsWith('cloudflared tunnel ')), 'the link goes through the tunnel');
});

test('every route needs the key, and a bad body is refused before any write', async t => {
  const f = fixture(t);
  const { port, key } = opened(f, 'MAPS_API_KEY');
  const good = { keys: { MAPS_API_KEY: SECRET } };
  for (const wrong of [null, '0'.repeat(64)]) {
    assert.equal((await route(port, wrong, 'save', good)).status, 403);
    assert.equal((await route(port, wrong, 'keys')).status, 403);
    assert.equal((await route(port, wrong, 'done', {})).status, 403);
  }
  assert.equal((await route(port, key, 'save')).status, 405);
  assert.equal((await route(port, key, 'keys', {})).status, 405);
  for (const body of ['{', '[]', {}, { keys: [] }, { keys: {} }, { keys: { STRIPE_SECRET_KEY: SECRET } }, { keys: { MAPS_API_KEY: SECRET, OTHER: 'x' } }, { keys: { MAPS_API_KEY: SECRET }, force: 'MAPS_API_KEY' }, { keys: { MAPS_API_KEY: SECRET }, force: ['OTHER'] }]) {
    assert.equal((await route(port, key, 'save', body)).status, 400, JSON.stringify(body));
  }
  assert.equal((await route(port, key, 'save', { keys: { MAPS_API_KEY: 'x'.repeat(LIMITS.body) } })).status, 413);
  assert.equal(f.read(f.primary, '.env'), 'A=1\n', 'nothing written');
});

test('a new key lands in the primary file and the seeded branch copy; an unseeded copy is left alone', async t => {
  const f = fixture(t);
  writeFileSync(join(f.worktree, 'app/.dev.vars'), 'MINE=1\n');
  const { port, key } = opened(f, 'MAPS_API_KEY,STRIPE_SECRET_KEY', '--minutes', '5');
  assert.deepEqual(await route(port, key, 'save', { keys: { MAPS_API_KEY: `  ${SECRET}\n`, STRIPE_SECRET_KEY: SPACED } }), { status: 200, json: { saved: ['MAPS_API_KEY', 'STRIPE_SECRET_KEY'], failed: [], refused: [], checked: { MAPS_API_KEY: 'untested', STRIPE_SECRET_KEY: 'untested' } } });
  assert.equal(f.read(f.primary, '.env'), `A=1\nMAPS_API_KEY=${SECRET}\n`, 'trimmed and appended');
  assert.equal(f.read(f.worktree, '.env'), `A=1\nMAPS_API_KEY=${SECRET}\n`, 'the seeded copy too');
  assert.equal(f.read(f.primary, 'app/.dev.vars'), `STRIPE_SECRET_KEY='${SPACED}'\n`, 'created');
  assert.equal(statSync(join(f.primary, 'app/.dev.vars')).mode & 0o777, 0o600);
  assert.equal(statSync(join(f.primary, '.env')).mode & 0o777, 0o600);
  assert.equal(f.read(f.worktree, 'app/.dev.vars'), 'MINE=1\n', 'the unseeded copy is untouched');
  assert.equal(parseEnv(f.read(f.primary, 'app/.dev.vars')).STRIPE_SECRET_KEY, SPACED, 'reads back unchanged');
  assert.deepEqual(readdirSync(f.primary).filter(name => name.endsWith('.tmp')), [], 'no temp file left');
  const status = JSON.parse(execFileSync(process.execPath, [seedScript, 'status'], { cwd: f.worktree, encoding: 'utf8' }));
  assert.deepEqual(status.files.filter(file => file.path === '.env'), [], 'both copies agree, so nothing waits for the merge');
});

test('a rotation replaces the line in place and keeps the rest; the link ends once every key is saved', async t => {
  const f = fixture(t, { env: '# tools\nA=1\nexport MAPS_API_KEY=old\nB=2\nMAPS_API_KEY=stale\n' });
  const { port, key } = opened(f, 'MAPS_API_KEY');
  assert.equal((await route(port, key, 'keys')).json.keys[0].set, true);
  assert.deepEqual((await route(port, key, 'save', { keys: { MAPS_API_KEY: SECRET } })).json, { saved: ['MAPS_API_KEY'], failed: [], refused: [], checked: { MAPS_API_KEY: 'untested' } });
  assert.equal(f.read(f.primary, '.env'), `# tools\nA=1\nexport MAPS_API_KEY=${SECRET}\nB=2\n`);
  assert.equal(f.read(f.worktree, '.env'), `# tools\nA=1\nexport MAPS_API_KEY=${SECRET}\nB=2\n`);
  const out = f.run('wait');
  assert.equal(out.stdout, 'HANDOVER_RESULT=done\nHANDOVER_SAVED=MAPS_API_KEY\nHANDOVER_APP_KEYS=\n');
  assert.ok(!existsSync(join(f.state, 'watcher.pid')), 'the watcher is gone');
});

test('a refused value is named in failed and the link stays open', async t => {
  const f = fixture(t);
  const { port, key } = opened(f, 'MAPS_API_KEY,STRIPE_SECRET_KEY');
  for (const bad of ['   ', 'two\n"lines"', 'x'.repeat(LIMITS.value + 1), 42, `it's "quoted" $x`]) {
    assert.deepEqual((await route(port, key, 'save', { keys: { MAPS_API_KEY: bad } })).json, { saved: [], failed: ['MAPS_API_KEY'], refused: [], checked: {} }, JSON.stringify(bad).slice(0, 40));
  }
  assert.equal(f.read(f.primary, '.env'), 'A=1\n');
  assert.deepEqual((await route(port, key, 'save', { keys: { MAPS_API_KEY: 'x'.repeat(LIMITS.value), STRIPE_SECRET_KEY: '' } })).json, { saved: ['MAPS_API_KEY'], failed: ['STRIPE_SECRET_KEY'], refused: [], checked: { MAPS_API_KEY: 'untested' } });
  assert.ok(existsSync(join(f.state, 'watcher.pid')), 'still open: STRIPE_SECRET_KEY is unsaved');
});

test('Done ends the link, and wait prints only the saved names and those for the Worker', async t => {
  const f = fixture(t);
  const { port, key } = opened(f, 'MAPS_API_KEY,STRIPE_SECRET_KEY');
  await route(port, key, 'save', { keys: { STRIPE_SECRET_KEY: SECRET } });
  assert.deepEqual(await route(port, key, 'done', {}), { status: 200, json: { ok: true } });
  const out = f.run('wait');
  assert.equal(out.stdout, 'HANDOVER_RESULT=done\nHANDOVER_SAVED=STRIPE_SECRET_KEY\nHANDOVER_APP_KEYS=STRIPE_SECRET_KEY\n');
  const result = readFileSync(join(f.state, 'result.json'), 'utf8');
  assert.deepEqual(legacyResult(JSON.parse(result)), { result: 'done', saved: ['STRIPE_SECRET_KEY'], appKeys: ['STRIPE_SECRET_KEY'] });
  assert.ok(!f.outputs().includes(SECRET), 'no value in stdout or stderr');
  assert.ok(!(result + f.stateFiles()).includes(SECRET), 'no value in state.json or result.json');
  assert.ok(!f.calls().some(line => line.includes(SECRET)), 'no value in argv');
});

test('closing a key link with nothing saved prints empty lists', t => {
  const f = fixture(t);
  opened(f, 'MAPS_API_KEY');
  assert.equal(f.run('close').stdout, 'HANDOVER_RESULT=closed\nHANDOVER_SAVED=\nHANDOVER_APP_KEYS=\n');
});

test('an undeclared or ambiguous name opens no tunnel', t => {
  const f = fixture(t);
  const undeclared = f.run('open', '--keys', 'MAPS_API_KEY,LATER_KEY,NOPE');
  assert.equal(undeclared.status, 2);
  assert.equal(undeclared.stdout, 'KEYS_UNDECLARED=LATER_KEY,NOPE\n', 'a commented-out name is not declared');
  assert.match(undeclared.stderr, /Declare each key/);
  const ambiguous = f.run('open', '--keys', 'TWICE');
  assert.equal(ambiguous.status, 2);
  assert.equal(ambiguous.stdout, 'KEYS_AMBIGUOUS=TWICE\n');
  assert.deepEqual(f.calls(), [], 'no cloudflared, no agent-browser');
  assert.ok(!existsSync(f.state), 'no link state');
});

test('a destination the checkout does not ignore opens no link', t => {
  const f = fixture(t, { ignore: '.env*\n!.env.example\n' });
  const out = f.run('open', '--keys', 'STRIPE_SECRET_KEY');
  assert.equal(out.status, 1);
  assert.match(out.stderr, /Not git-ignored.*app\/\.dev\.vars/);
  assert.ok(!existsSync(f.state));
});

test('an opened key link refuses a second link, and a password link refuses a key link', async t => {
  const f = fixture(t);
  const { port, key } = opened(f, 'MAPS_API_KEY');
  assert.equal((await route(port, key, 'keys')).status, 200);
  const passwords = f.run('open', '--passwords');
  assert.equal(passwords.status, 1);
  assert.match(passwords.stderr, /already open/);
  assert.equal(f.run('close').status, 0);
  assert.equal(f.run('open', '--passwords').status, 0);
  const keys = f.run('open', '--keys', 'MAPS_API_KEY');
  assert.equal(keys.status, 1);
  assert.match(keys.stderr, /already open/);
});

test('--keys takes declared-style names and no other mode', t => {
  const f = fixture(t);
  for (const args of [['--passwords'], ['--until', '**'], ['--until-gone', '#x']]) assert.equal(f.run('open', '--keys', 'MAPS_API_KEY', ...args).status, 2, args.join(' '));
  for (const names of ['', 'lower_case', 'A,,B', 'A B', Array.from({ length: LIMITS.names + 1 }, (_, i) => `K${i}`).join(',')]) {
    assert.equal(f.run('open', '--keys', names).status, 2, names.slice(0, 20));
  }
  assert.deepEqual(f.calls(), []);
});

test('declarations read each uncommented name and the first sentence above it', () => {
  assert.deepEqual([...declarations(ENV_EXAMPLE)], [['MAPS_API_KEY', 'The Maps key.'], ['TWICE', '']]);
  assert.equal(firstSentence(['# Dashboard → Developers → API keys', '# → Secret key. Then more.']), 'Dashboard → Developers → API keys → Secret key.');
  assert.equal(firstSentence(['# No full stop here']), 'No full stop here');
  assert.equal(firstSentence([`# ${'word '.repeat(60)}`]).length, LIMITS.hint);
  assert.equal(firstSentence([]), '');
});

test('formatLine quotes a value so every reader gets it back unchanged', () => {
  const cases = { 'sk_live-1.2:3/4+5=@x': 'K=sk_live-1.2:3/4+5=@x', 'a #b': "K='a #b'", '~/x': "K='~/x'", 'a\\b"c$d': "K='a\\b\"c$d'", "it's": 'K="it\'s"' };
  for (const [value, line] of Object.entries(cases)) {
    assert.equal(formatLine('K', value), line);
    assert.equal(parseEnv(line).K, value, value);
  }
  assert.equal(formatLine('K', `it's "x"`), null);
  assert.equal(cleanValue(' a '), 'a');
  assert.equal(cleanValue('a\u0000b'), null);
});

test('setKey creates a missing file with mode 0600 and keeps a file without a final newline', t => {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-setkey-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  setKey(join(dir, '.env'), 'K', 'K=1');
  assert.equal(readFileSync(join(dir, '.env'), 'utf8'), 'K=1\n');
  assert.equal(statSync(join(dir, '.env')).mode & 0o777, 0o600);
  writeFileSync(join(dir, '.env'), '# K=commented\nA=1');
  setKey(join(dir, '.env'), 'K', 'K=2');
  assert.equal(readFileSync(join(dir, '.env'), 'utf8'), '# K=commented\nA=1\nK=2\n');
  assert.throws(() => setKey(join(dir, 'missing/.env'), 'K', 'K=1'));
  assert.deepEqual(readdirSync(dir), ['.env']);
});

test('filledKeys sends only the trimmed, filled, open boxes', () => {
  assert.deepEqual(filledKeys([
    { name: 'A', value: '  a1 ', disabled: false },
    { name: 'B', value: '   ', disabled: false },
    { name: 'C', value: 'c', disabled: true },
  ]), { A: 'a1' });
});


test('continue keeps successful keys while missing and failed keys prevent readiness, then delivers one receipt', async t => {
  const f=fixture(t); const {port,key}=opened(f,'MAPS_API_KEY,STRIPE_SECRET_KEY');
  const partial=await route(port,key,'continue',{keys:{MAPS_API_KEY:SECRET,STRIPE_SECRET_KEY:''}});
  assert.equal(partial.json.ready,false); assert.deepEqual(partial.json.missing,['STRIPE_SECRET_KEY']);
  assert.deepEqual(partial.json.saved,['MAPS_API_KEY']);
  assert.equal((await route(port,key,'continue',{keys:{}})).json.ready,false);
  const complete=await route(port,key,'continue',{keys:{STRIPE_SECRET_KEY:SECRET}});
  assert.equal(complete.json.ready,true); assert.equal(complete.json.receipt.notification,'unavailable');
  assert.deepEqual(complete.json.receipt.appKeys,['STRIPE_SECRET_KEY']);
  assert.equal((await route(port,key,'continue',{keys:{STRIPE_SECRET_KEY:'replacement'}})).status,410);
  assert.equal((await route(port,key,'done',{})).status,410);
  f.run('wait');
});

// ---------------------------------------------------------------------------
// The guide, the 30-minute limit, the on-save test, and long keys

const GUIDE = {
  title: 'Stripe key',
  url: 'https://dashboard.stripe.com/apikeys',
  open: "Open Stripe's keys",
  steps: ['Tap Create restricted key', 'Tick Read charges', 'Copy the key'],
  check: { url: 'https://api.stripe.com/v1/balance?expand=1', auth: 'bearer' },
};

test('checkGuide accepts each field alone and together, for asked-for names only', () => {
  const names = ['STRIPE_SECRET_KEY', 'MAPS_API_KEY'];
  for (const entry of [{}, GUIDE, { title: 'Maps key' }, { steps: [] }, { url: 'https://console.cloud.google.com/apis/credentials' }, { check: { url: 'https://api.example.com:8443/me', auth: 'header:X-Api-Key' } }, { check: { url: 'https://api.example.com/me', auth: 'query:key' } }, { check: { url: 'https://api.example.com/me', auth: 'basic' } }]) {
    assert.deepEqual(checkGuide({ MAPS_API_KEY: entry }, names), { guide: { MAPS_API_KEY: entry } }, JSON.stringify(entry));
  }
  assert.deepEqual(checkGuide({}, names), { guide: {} });
});

test('checkGuide refuses a bad shape, naming the key and the reason', () => {
  const names = ['MAPS_API_KEY'];
  const long = 'x'.repeat(LIMITS.title + 1);
  const bad = {
    'takes only': [{ html: '<b>' }],
    'title and open take': [{ title: long }, { title: '' }, { title: 7 }, { title: 'two\nlines' }, { url: GUIDE.url, open: long }],
    'url takes an https address': [{ url: 'http://dashboard.stripe.com/apikeys' }, { url: 'javascript:alert(1)' }, { url: 'https://localhost/keys' }, { url: 'https://app.localhost/keys' }, { url: 'https://localhost./keys' }, { url: 'https://127.0.0.1/keys' }, { url: 'https://2130706433/keys' }, { url: 'https://[::1]/keys' }, { url: 'https://intranet/keys' }, { url: 'https://me:pw@stripe.com/' }, { url: 'not a url' }, { url: 7 }],
    'open needs a url': [{ open: 'Open it' }],
    'steps takes at most': [{ steps: Array(LIMITS.steps + 1).fill('Tap') }, { steps: ['x'.repeat(LIMITS.step + 1)] }, { steps: [''] }, { steps: 'Tap' }, { steps: [{ html: 1 }] }],
    'check takes an https url': [{ check: 'https://api.stripe.com' }, { check: { url: 'http://api.stripe.com/v1', auth: 'bearer' } }, { check: { url: 'https://10.0.0.1/v1', auth: 'bearer' } }, { check: { url: GUIDE.check.url } }, { check: { ...GUIDE.check, method: 'DELETE' } }, ...['Bearer', 'header:', 'header:Host', 'header:cookie', 'header:Content-Length', 'header:Bad Name', 'header:X:Y', 'query:', 'query:a b', 'body:key', 7].map(auth => ({ check: { url: GUIDE.check.url, auth } }))],
  };
  for (const [reason, entries] of Object.entries(bad)) for (const entry of entries) {
    const { fault, guide } = checkGuide({ MAPS_API_KEY: entry }, names);
    assert.equal(guide, undefined, JSON.stringify(entry));
    assert.ok(fault.startsWith(`MAPS_API_KEY: ${reason}`), `${JSON.stringify(entry)} → ${fault}`);
  }
  assert.equal(checkGuide({ MAPS_API_KEY: 'Stripe' }, names).fault, 'MAPS_API_KEY: takes an object');
  assert.equal(checkGuide({ OTHER_KEY: {} }, names).fault, 'OTHER_KEY: not an asked-for key');
  for (const whole of [null, [], 'text', 7]) assert.match(checkGuide(whole, names).fault, /^guide: takes a JSON object/);
  assert.equal(httpsUrl('https://api.stripe.com/v1').host, 'api.stripe.com');
  assert.deepEqual([authPlace('bearer'), authPlace('header:X-Api-Key'), authPlace('query:key')], [{ header: 'authorization' }, { header: 'X-Api-Key' }, { query: 'key' }]);
});

test('--guide rides in the state and reaches the page without the test\'s path; a bad one opens no link', async t => {
  const f = fixture(t);
  const file = join(f.worktree, 'guide.json');
  writeFileSync(file, JSON.stringify({ STRIPE_SECRET_KEY: { ...GUIDE, title: 7 } }));
  const bad = f.run('open', '--keys', 'STRIPE_SECRET_KEY', '--guide', file);
  assert.equal(bad.status, 2);
  assert.match(bad.stdout, /^KEYS_GUIDE=STRIPE_SECRET_KEY: title and open take 1 to 40 characters/);
  for (const [content, fault] of [['{', 'guide: takes'], [JSON.stringify({ MAPS_API_KEY: {} }), 'MAPS_API_KEY: not an asked-for key']]) {
    writeFileSync(file, content);
    const out = f.run('open', '--keys', 'STRIPE_SECRET_KEY', '--guide', file);
    assert.equal(out.status, 2);
    assert.ok(out.stdout.startsWith(`KEYS_GUIDE=${fault}`), out.stdout);
  }
  assert.equal(f.run('open', '--keys', 'STRIPE_SECRET_KEY', '--guide', join(f.worktree, 'missing.json')).status, 2);
  assert.deepEqual(f.calls(), [], 'no cloudflared, no agent-browser');
  assert.ok(!existsSync(f.state), 'no link state');

  writeFileSync(file, JSON.stringify({ STRIPE_SECRET_KEY: GUIDE }));
  const { port, key } = opened(f, 'MAPS_API_KEY,STRIPE_SECRET_KEY', '--guide', file);
  assert.deepEqual(JSON.parse(readFileSync(join(f.state, 'state.json'), 'utf8')).keys.keys.map(each => each.guide), [undefined, GUIDE]);
  const { keys } = (await route(port, key, 'keys')).json;
  const { check: _check, ...shown } = GUIDE;
  assert.deepEqual(keys, [
    { name: 'MAPS_API_KEY', hint: 'The Maps key.', set: false },
    { name: 'STRIPE_SECRET_KEY', hint: 'Secret key for the payments provider.', set: false, ...shown, checkHost: 'api.stripe.com' },
  ]);
  assert.doesNotMatch(JSON.stringify(keys), /balance|expand/, 'never the test address\'s path');
});

test('a key link stays open 30 minutes from open, says when it closes, and marks its first opening', async t => {
  const f = fixture(t);
  const before = Date.now();
  const { port, key } = opened(f, 'MAPS_API_KEY');
  const { deadline } = JSON.parse(readFileSync(join(f.state, 'state.json'), 'utf8'));
  assert.ok(deadline >= before + 30 * 60_000 && deadline <= Date.now() + 30 * 60_000, 'thirty minutes from open');
  assert.ok(!existsSync(join(f.state, 'opened')), 'the page alone does not open it');
  await fetch(`http://127.0.0.1:${port}/`);
  assert.equal((await route(port, null, 'keys')).status, 403);
  assert.ok(!existsSync(join(f.state, 'opened')), 'nor does a call without the key');
  const { json } = await route(port, key, 'keys');
  assert.equal(json.closesAt, deadline);
  assert.ok(Math.abs(json.now - Date.now()) < 5000, 'the watcher\'s clock');
  assert.ok(existsSync(join(f.state, 'opened')));
  assert.equal(f.run('close').status, 0);
  assert.ok(!existsSync(join(f.state, 'opened')), 'the marker goes with the link');
  opened(f, 'MAPS_API_KEY', '--minutes', '5');
  const short = JSON.parse(readFileSync(join(f.state, 'state.json'), 'utf8')).deadline;
  assert.ok(short <= Date.now() + 5 * 60_000, '--minutes still wins');
});

/** A fake service answer: a status, and a body that may only be cancelled. */
function answer(status) {
  const seen = { cancelled: 0 };
  const unread = () => { throw new Error('the body was read'); };
  return { seen, response: { status, body: { cancel: async () => { seen.cancelled++; } }, text: unread, json: unread, arrayBuffer: unread } };
}

/** Mounts the key routes for one key `K` over a scratch folder, its test answered by `service(url, init)`. */
async function tested(t, check, service) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-check-'));
  const calls = [];
  const routes = keyRoutes({ root: dir, primary: dir, linked: false, keys: [{ name: 'K', file: '.env', hint: '', guide: { check } }] }, {
    fetch: async (url, init) => { calls.push({ url, init }); return service(url, init); },
    onContinue: async () => ({ notification: 'unavailable' }),
  });
  const server = createServer((request, response) => routes(new URL(request.url, 'http://page').pathname, request, response));
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  t.after(() => { server.close(); rmSync(dir, { recursive: true, force: true }); });
  return { calls, post: (path, body) => route(server.address().port, null, path, body), read: () => (existsSync(join(dir, '.env')) ? readFileSync(join(dir, '.env'), 'utf8') : null) };
}

test('a key the service accepts is written as works, with one unread request and nothing logged', async t => {
  const logs = ['log', 'error', 'warn', 'info'].map(name => t.mock.method(console, name, () => {}));
  const { seen, response } = answer(204);
  const k = await tested(t, { url: 'https://api.example.com/v1/me?x=1', auth: 'bearer' }, () => response);
  assert.deepEqual((await k.post('save', { keys: { K: SECRET } })).json, { saved: ['K'], failed: [], refused: [], checked: { K: 'works' } });
  assert.equal(k.read(), `K=${SECRET}\n`);
  assert.equal(k.calls.length, 1);
  const [{ url, init }] = k.calls;
  assert.equal(url, 'https://api.example.com/v1/me?x=1');
  assert.equal(init.method, 'GET');
  assert.equal(init.redirect, 'manual');
  assert.ok(init.signal instanceof AbortSignal);
  assert.equal(init.body, undefined, 'the key rides only where auth puts it');
  assert.deepEqual(init.headers, { authorization: `Bearer ${SECRET}` });
  assert.equal(seen.cancelled, 1, 'the body is cancelled unread');
  assert.equal(logs.reduce((count, log) => count + log.mock.callCount(), 0), 0);
});

test('a refused key is not written and not ready, until it is saved anyway', async t => {
  for (const status of [401, 403]) {
    const k = await tested(t, { url: 'https://api.example.com/me', auth: 'bearer' }, () => answer(status).response);
    assert.deepEqual((await k.post('continue', { keys: { K: SECRET } })).json, { saved: [], failed: [], refused: ['K'], checked: {}, ready: false, missing: ['K'] });
    assert.equal(k.read(), null, 'not written');
    assert.deepEqual((await k.post('save', { keys: { K: SECRET } })).json, { saved: [], failed: [], refused: ['K'], checked: {} }, 'still open, still refused');
    const forced = (await k.post('continue', { keys: { K: SECRET }, force: ['K'] })).json;
    assert.deepEqual({ ...forced, receipt: undefined }, { saved: ['K'], failed: [], refused: [], checked: { K: 'untested' }, ready: true, missing: [], receipt: undefined });
    assert.equal(k.read(), `K=${SECRET}\n`);
    assert.equal(k.calls.length, 2, 'Save anyway skips the test');
  }
});

test('a test with no clear answer saves the key as untested, following no redirect', async t => {
  const services = { 500: () => answer(500).response, 404: () => answer(404).response, 302: () => ({ status: 302, headers: { location: 'https://elsewhere.example.com/' }, body: null }), timeout: () => { throw new DOMException('timed out', 'TimeoutError'); } };
  for (const [name, service] of Object.entries(services)) {
    const k = await tested(t, { url: 'https://api.example.com/me', auth: 'bearer' }, service);
    assert.deepEqual((await k.post('save', { keys: { K: SECRET } })).json, { saved: ['K'], failed: [], refused: [], checked: { K: 'untested' } }, name);
    assert.equal(k.read(), `K=${SECRET}\n`, name);
    assert.equal(k.calls.length, 1, `${name}: one request, the redirect not followed`);
  }
});

test('each auth shape places the key in one spot, and a value that cannot be stored is never sent', async t => {
  const sent = async auth => {
    const k = await tested(t, { url: 'https://api.example.com/me?a=1', auth }, () => answer(200).response);
    await k.post('save', { keys: { K: SPACED } });
    return k.calls[0];
  };
  assert.deepEqual((await sent('basic')).init.headers, { authorization: `Basic ${Buffer.from(`${SPACED}:`).toString('base64')}` });
  assert.deepEqual((await sent('header:X-Api-Key')).init.headers, { 'X-Api-Key': SPACED });
  const query = await sent('query:api_key');
  assert.deepEqual(query.init.headers, {});
  assert.deepEqual([...new URL(query.url).searchParams], [['a', '1'], ['api_key', SPACED]]);
  assert.equal(new URL((await sent('bearer')).url).search, '?a=1');

  const k = await tested(t, { url: 'https://api.example.com/me', auth: 'bearer' }, () => answer(200).response);
  assert.deepEqual((await k.post('save', { keys: { K: `it's "quoted" $x` } })).json, { saved: [], failed: ['K'], refused: [], checked: {} });
  assert.equal(k.calls.length, 0);
  assert.equal(await checkKey({ url: 'https://api.example.com/me', auth: 'bearer' }, 'two\nlines'), 'untested', 'a header cannot carry a line break, so nothing is sent');
});

/** One live-file line's value by dotenv's rules: quotes stripped, and `\n` a line break in double quotes only. */
function dotenvValue(line) {
  const raw = (/^\s*(?:export\s+)?[\w.-]+\s*=\s*('(?:\\'|[^'])*'|"(?:\\"|[^"])*"|`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?$/.exec(line)?.[1] ?? '').trim();
  const value = raw.replace(/^(['"`])([\s\S]*)\1$/, '$2');
  return raw.startsWith('"') ? value.replace(/\\n/g, '\n').replace(/\\r/g, '\r') : value;
}

const KEY_FILE = { type: 'service_account', project_id: 'shop-1', private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQ+/=\n-----END PRIVATE KEY-----\n', client_email: 'bot@shop-1.iam.gserviceaccount.com' };
const PEM = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq+/=\nhkiG9w0BAQEFAASC\n-----END PRIVATE KEY-----';

test('a key over several lines is stored on one line that reads back with the same content', () => {
  const json = formatLine('K', cleanValue(`\n${JSON.stringify(KEY_FILE, null, 2)}\r\n`));
  assert.ok(json.startsWith("K='{\"type\":\"service_account\","), 'compacted, in single quotes');
  assert.ok(!json.includes('\n'));
  assert.deepEqual(JSON.parse(dotenvValue(json)), KEY_FILE, 'the same data');
  const quoted = { ...KEY_FILE, note: "it's \"ours\"" };
  const apostrophe = formatLine('K', cleanValue(JSON.stringify(quoted, null, 2)));
  assert.ok(apostrophe.startsWith("K='{") && !apostrophe.slice(3, -1).includes("'"), 'an apostrophe is escaped, so single quotes still hold it');
  assert.deepEqual(JSON.parse(dotenvValue(apostrophe)), quoted, 'the same data');

  for (const text of [PEM, PEM.replaceAll('\n', '\r\n'), `  ${PEM}\n\n`, "it's a key\nover two lines #1"]) {
    const line = formatLine('K', cleanValue(text));
    assert.ok(line.startsWith('K="') && !/[\r\n]/.test(line), 'one line, in double quotes');
    assert.equal(dotenvValue(line), text.replaceAll('\r\n', '\n').trim(), 'the same lines');
  }
  for (const unsafe of ['a "b"\nc', 'a\\b\nc', 'a $b\nc', 'a `b`\nc']) assert.equal(formatLine('K', cleanValue(unsafe)), null, unsafe);
  assert.equal(cleanValue(`${'x'.repeat(LIMITS.value - 1)}\ny`), null, 'the stored form is past the limit');
  assert.equal(cleanValue(`{\n"a": "${'x'.repeat(LIMITS.value)}"\n}`), null);
  for (const [value, line] of Object.entries({ [SECRET]: `K=${SECRET}`, [SPACED]: `K='${SPACED}'`, "it's": 'K="it\'s"', '{"a":1}': "K='{\"a\":1}'" })) {
    assert.equal(formatLine('K', cleanValue(` ${value}\n`)), line, 'a single-line key is written as before');
    assert.equal(dotenvValue(line), value);
  }
});

test('a picked key file and a pasted private key land on one line each of the live file', async t => {
  const f = fixture(t);
  const { port, key } = opened(f, 'MAPS_API_KEY,STRIPE_SECRET_KEY');
  const saved = await route(port, key, 'save', { keys: { MAPS_API_KEY: PEM, STRIPE_SECRET_KEY: JSON.stringify(KEY_FILE, null, 2) } });
  assert.deepEqual(saved.json.saved, ['MAPS_API_KEY', 'STRIPE_SECRET_KEY']);
  const env = f.read(f.primary, '.env').split('\n');
  assert.equal(env.length, 3, 'A=1, the key, and the final line break');
  assert.equal(dotenvValue(env[1]), PEM);
  assert.equal(f.read(f.worktree, '.env'), f.read(f.primary, '.env'), 'the seeded copy too');
  const vars = f.read(f.primary, 'app/.dev.vars').trimEnd();
  assert.ok(!vars.includes('\n'));
  assert.deepEqual(JSON.parse(dotenvValue(vars)), KEY_FILE);
  assert.deepEqual(JSON.parse(parseEnv(vars).STRIPE_SECRET_KEY), KEY_FILE, 'the memory parser reads the same JSON');
});
