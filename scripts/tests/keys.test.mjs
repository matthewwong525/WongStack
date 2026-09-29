import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { cleanValue, declarations, firstSentence, formatLine, LIMITS, setKey } from '../../.agents/skills/verify/scripts/keys.mjs';
import { filledKeys } from '../../.agents/skills/verify/scripts/keys-page.mjs';
import { parseEnv } from '../../.agents/skills/memory/scripts/lib/store.mjs';

const legacyOutput = text => text.replace(/^HANDOVER_(COMPLETION|NOTIFICATION)=.*\n/gm, '');
const legacyResult = ({ completionId: _completionId, notification: _notification, ready: _ready, ...result }) => result;
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, '.agents/skills/verify/scripts/hand-over.mjs');
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
// with `.env` seeded into a linked worktree and `app/.dev.vars` not. A fake agent-browser and cloudflared
// log each call; HOME is the fixture's own.
function fixture(t, { env = 'A=1\n', ignore = IGNORE } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-keys-'));
  const bin = join(root, 'bin');
  const primary = join(root, 'primary');
  const worktree = join(root, 'wt');
  mkdirSync(bin);
  mkdirSync(join(primary, 'app'), { recursive: true });
  const log = join(root, 'calls.log');
  for (const tool of ['agent-browser', 'cloudflared']) {
    writeFileSync(join(bin, tool), `#!${process.execPath}\nrequire('node:fs').appendFileSync(${JSON.stringify(log)}, ${JSON.stringify(tool)} + ' ' + process.argv.slice(2).join(' ') + '\\n');\n`);
    chmodSync(join(bin, tool), 0o755);
  }
  git(primary, 'init', '-q', '-b', 'main');
  writeFileSync(join(primary, '.gitignore'), ignore);
  writeFileSync(join(primary, '.env.example'), ENV_EXAMPLE);
  writeFileSync(join(primary, 'app/.dev.vars.example'), DEV_VARS_EXAMPLE);
  git(primary, 'add', '.');
  git(primary, 'commit', '-qm', 'init');
  writeFileSync(join(primary, '.env'), env);
  git(primary, 'worktree', 'add', '-q', '-b', 'feature', worktree);
  execFileSync(process.execPath, [seedScript, 'seed'], { cwd: worktree, stdio: 'ignore' });
  const environment = { ...process.env, HOME: root, PATH: `${bin}:/usr/bin:/bin`, HANDOVER_POLL_MS: '50' };
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

/** Runs `open --local --keys`, asserts it worked, and returns the page's port and the key. */
function opened(f, names, ...args) {
  const out = f.run('open', '--local', '--keys', names, ...args);
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
  assert.deepEqual(await route(port, key, 'keys'), { status: 200, json: { keys: [
    { name: 'MAPS_API_KEY', hint: 'The Maps key.', set: true },
    { name: 'STRIPE_SECRET_KEY', hint: 'Secret key for the payments provider.', set: false },
  ] } });
  assert.equal((await route(port, key, 'fields')).status, 404, 'no field routes');
  assert.deepEqual(f.calls(), [], 'no agent-browser or tunnel');
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
  for (const body of ['{', '[]', {}, { keys: [] }, { keys: {} }, { keys: { STRIPE_SECRET_KEY: SECRET } }, { keys: { MAPS_API_KEY: SECRET, OTHER: 'x' } }]) {
    assert.equal((await route(port, key, 'save', body)).status, 400, JSON.stringify(body));
  }
  assert.equal((await route(port, key, 'save', { keys: { MAPS_API_KEY: 'x'.repeat(LIMITS.body) } })).status, 413);
  assert.equal(f.read(f.primary, '.env'), 'A=1\n', 'nothing written');
});

test('a new key lands in the primary file and the seeded branch copy; an unseeded copy is left alone', async t => {
  const f = fixture(t);
  writeFileSync(join(f.worktree, 'app/.dev.vars'), 'MINE=1\n');
  const { port, key } = opened(f, 'MAPS_API_KEY,STRIPE_SECRET_KEY', '--minutes', '5');
  assert.deepEqual(await route(port, key, 'save', { keys: { MAPS_API_KEY: `  ${SECRET}\n`, STRIPE_SECRET_KEY: SPACED } }), { status: 200, json: { saved: ['MAPS_API_KEY', 'STRIPE_SECRET_KEY'], failed: [] } });
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
  assert.deepEqual((await route(port, key, 'save', { keys: { MAPS_API_KEY: SECRET } })).json, { saved: ['MAPS_API_KEY'], failed: [] });
  assert.equal(f.read(f.primary, '.env'), `# tools\nA=1\nexport MAPS_API_KEY=${SECRET}\nB=2\n`);
  assert.equal(f.read(f.worktree, '.env'), `# tools\nA=1\nexport MAPS_API_KEY=${SECRET}\nB=2\n`);
  const out = f.run('wait');
  assert.equal(out.stdout, 'HANDOVER_RESULT=done\nHANDOVER_SAVED=MAPS_API_KEY\nHANDOVER_APP_KEYS=\n');
  assert.ok(!existsSync(join(f.state, 'watcher.pid')), 'the watcher is gone');
});

test('a refused value is named in failed and the link stays open', async t => {
  const f = fixture(t);
  const { port, key } = opened(f, 'MAPS_API_KEY,STRIPE_SECRET_KEY');
  for (const bad of ['   ', 'two\nlines', 'x'.repeat(LIMITS.value + 1), 42, `it's "quoted" $x`]) {
    assert.deepEqual((await route(port, key, 'save', { keys: { MAPS_API_KEY: bad } })).json, { saved: [], failed: ['MAPS_API_KEY'] }, JSON.stringify(bad).slice(0, 40));
  }
  assert.equal(f.read(f.primary, '.env'), 'A=1\n');
  assert.deepEqual((await route(port, key, 'save', { keys: { MAPS_API_KEY: 'x'.repeat(LIMITS.value), STRIPE_SECRET_KEY: '' } })).json, { saved: ['MAPS_API_KEY'], failed: ['STRIPE_SECRET_KEY'] });
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
  const out = f.run('open', '--local', '--keys', 'STRIPE_SECRET_KEY');
  assert.equal(out.status, 1);
  assert.match(out.stderr, /Not git-ignored.*app\/\.dev\.vars/);
  assert.ok(!existsSync(f.state));
});

test('a key link refuses to open while another link is open, and the reverse', t => {
  const f = fixture(t);
  opened(f, 'MAPS_API_KEY');
  const passwords = f.run('open', '--local', '--passwords');
  assert.equal(passwords.status, 1);
  assert.match(passwords.stderr, /already open/);
  assert.equal(f.run('close').status, 0);
  assert.equal(f.run('open', '--local', '--passwords').status, 0);
  const keys = f.run('open', '--local', '--keys', 'MAPS_API_KEY');
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
