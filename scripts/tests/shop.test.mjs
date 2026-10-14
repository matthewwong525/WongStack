import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { SHOP, ShopError, install, mask, nodeFits, refusal, scrub, shopEnv } from '../../.agents/skills/shop/scripts/shop.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, '.agents/skills/shop/scripts/shop.mjs');
const STORE = 'store.example.com';
const CHECKOUT = 'gid://shopify/Checkout/abc?key=opaque';
const LINK = 'https://store.example.com/checkouts/abc';
// A credential no id, path, or total can hold, so a search for it never matches by chance.
const SECRET = 'tok_Zq9-SECRET-credential-7f3a91c2';

// A stand-in for Shop's command: it logs each call's argv, `SHOP_` settings, and stdin to calls.jsonl, then answers
// from replies.json by the call's first two words or its first. The last reply repeats; `hang` never answers.
const FAKE = control => `import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
const file = name => ${JSON.stringify(control)} + '/' + name;
const argv = process.argv.slice(2);
const settings = Object.fromEntries(Object.entries(process.env).filter(([name]) => name.startsWith('SHOP_')));
appendFileSync(file('calls.jsonl'), JSON.stringify({ argv, settings, stdin: argv.includes('-') ? readFileSync(0, 'utf8') : null }) + '\\n');
const replies = existsSync(file('replies.json')) ? JSON.parse(readFileSync(file('replies.json'), 'utf8')) : {};
const key = [argv.slice(0, 2).join(' '), argv[0]].find(name => replies[name]);
const reply = (key && (replies[key].length > 1 ? replies[key].shift() : replies[key][0])) ?? { json: { ok: true, v: 1, data: {} } };
writeFileSync(file('replies.json'), JSON.stringify(replies));
if (reply.hang) await new Promise(done => setTimeout(done, 60_000));
process.stderr.write(reply.stderr ?? '');
process.stdout.write(reply.text ?? JSON.stringify(reply.json));
process.exit(reply.status ?? 0);
`;

/** A HOME of its own, holding the stand-in where shop.mjs looks for Shop's command unless `installed` is false. */
function fixture(t, { installed = true } = {}) {
  const home = mkdtempSync(join(tmpdir(), 'wong-test-shop-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const control = join(home, 'fake-shop');
  const dir = join(home, '.wong-stack/shop');
  mkdirSync(control);
  if (installed) {
    mkdirSync(join(dir, SHOP.version, 'package/bin'), { recursive: true });
    writeFileSync(join(dir, SHOP.version, 'package/bin/shop.mjs'), FAKE(control));
  }
  const env = { ...process.env, HOME: home, SHOP_NODE: '22.21.0', SHOP_CALL_MS: '10000' };
  const runWith = ({ env: more = {}, input } = {}, ...args) => spawnSync(process.execPath, [script, ...args], { cwd: home, env: { ...env, ...more }, input, encoding: 'utf8', timeout: 60_000 });
  const calls = () => (existsSync(join(control, 'calls.jsonl')) ? readFileSync(join(control, 'calls.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line)) : []);
  const keptDir = join(dir, 'checkouts');
  return {
    home, dir, keptDir, runWith, calls,
    run: (...args) => runWith({}, ...args),
    reply: replies => writeFileSync(join(control, 'replies.json'), JSON.stringify(replies)),
    sent: () => calls().filter(call => call.argv[1] === 'complete'),
    kept: () => (existsSync(keptDir) ? readdirSync(keptDir).map(name => join(keptDir, name)) : []),
  };
}

const card = (id, digits) => ({ id, handler_id: 'shop_pay', type: 'shop_pay', billing_address: { street_address: '1 Hidden Lane' }, credential: { type: 'shop_token', token: `${SECRET}-${id}` }, display: { funding_instrument: { type: 'card', brand: 'Visa', last_digits: digits } } });
const CARDS = [card('saved-1', '4242'), card('saved-2', '1881')];
const checkout = (more = {}) => ({ id: CHECKOUT, status: 'ready_for_complete', currency: 'USD', totals: [{ type: 'subtotal', amount: 8000 }, { type: 'total', amount: 8400 }], continue_url: LINK, payment: { instruments: CARDS }, ...more });
const ok = data => ({ json: { ok: true, v: 1, data } });
const failed = (code, more = {}, status = 1) => ({ json: { ok: false, v: 1, error: { code, message: code, retryable: false, ...more } }, status });
const ORDER = { id: 'order-1042', label: '#1042', permalink_url: 'https://store.example.com/orders/1042' };
const READ = ['checkout', 'get', CHECKOUT, '--shop', STORE];
const PAY = ['pay', CHECKOUT, '--shop', STORE, '--instrument', '1', '--total', '8400', '--currency', 'USD'];
/** The words a run printed before any JSON: its `SHOP_` lines. */
const lines = out => out.stdout.split('\n').filter(line => line.startsWith('SHOP_'));
const everything = out => `${out.stdout}${out.stderr}`;

// ---------------------------------------------------------------------------
// Install

test('with no install, a command prints SHOP_NEEDS=install with the size and exits 3', t => {
  const f = fixture(t, { installed: false });
  for (const args of [['search', 'rain jacket'], ['guide'], PAY]) {
    const out = f.run(...args);
    assert.equal(out.status, 3, args.join(' '));
    assert.equal(out.stdout, 'SHOP_NEEDS=install\n');
    assert.match(out.stderr, /about 2 MB/);
  }
});

test('a Node outside the command\'s lines prints SHOP_NEEDS=node with the range, for a command and for install', t => {
  const f = fixture(t);
  for (const args of [['search', 'rain jacket'], ['install']]) {
    const out = f.runWith({ env: { SHOP_NODE: '22.20.1' } }, ...args);
    assert.equal(out.status, 3, args.join(' '));
    assert.equal(out.stdout, 'SHOP_NEEDS=node\n');
    assert.match(out.stderr, /Node 22\.21 or newer in the 22 line, or 24\.5 or newer in the 24 line/);
  }
  assert.deepEqual(f.calls(), []);
  for (const [version, fits] of [['22.21.0', true], ['22.30.4', true], ['22.20.9', false], ['23.5.0', false], ['24.4.9', false], ['24.5.0', true], ['25.0.0', false], ['20.19.0', false]]) {
    assert.equal(nodeFits(version), fits, version);
  }
});

/** A stand-in package, as the registry would send it, and its fingerprint. */
function tarball(t, files = { 'package/bin/shop.mjs': 'console.log("stand-in");\n', 'package/package.json': '{}' }) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-shop-tarball-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), text);
  }
  assert.equal(spawnSync('tar', ['-czf', 'shop.tgz', ...Object.keys(files).map(name => name.split('/')[0]).filter((name, at, all) => all.indexOf(name) === at)], { cwd: dir }).status, 0);
  const bytes = readFileSync(join(dir, 'shop.tgz'));
  return { bytes, integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}` };
}
const sends = (bytes, seen = []) => async url => { seen.push(url); return new Response(bytes); };

test('install unpacks a download whose fingerprint matches, and leaves the pinned version alone in the folder', async t => {
  const f = fixture(t, { installed: false });
  const { bytes, integrity } = tarball(t);
  mkdirSync(join(f.dir, '1.0.9/package/bin'), { recursive: true });
  mkdirSync(f.keptDir, { recursive: true });
  const seen = [];
  assert.equal(await install({ home: f.home, pin: { version: '1.2.3', integrity }, download: sends(bytes, seen) }), '1.2.3');
  assert.deepEqual(seen, ['https://registry.npmjs.org/@shopify/shop/-/shop-1.2.3.tgz']);
  assert.equal(readFileSync(join(f.dir, '1.2.3/package/bin/shop.mjs'), 'utf8'), 'console.log("stand-in");\n');
  assert.deepEqual(readdirSync(f.dir).sort(), ['1.2.3', 'checkouts'], 'the older version and the scratch folder are gone');
  assert.deepEqual(readdirSync(join(f.dir, '1.2.3')), ['package'], 'the download itself is not kept');
});

test('a download that does not match the fingerprint installs nothing', async t => {
  const f = fixture(t, { installed: false });
  const { bytes, integrity } = tarball(t);
  const changed = Buffer.concat([bytes, Buffer.from('x')]);
  await assert.rejects(install({ home: f.home, pin: { version: '1.2.3', integrity }, download: sends(changed) }), error => {
    assert.ok(error instanceof ShopError);
    assert.match(error.message, /not the one WongStack tried/);
    assert.match(error.message, /Nothing was installed/);
    return true;
  });
  assert.equal(existsSync(f.dir), false, 'not even the folder is made');
});

test('a failed download, and a matching download that is no package, install nothing', async t => {
  const f = fixture(t, { installed: false });
  await assert.rejects(install({ home: f.home, download: async () => new Response('gone', { status: 404 }) }), /the download failed/);
  await assert.rejects(install({ home: f.home, download: async () => { throw new Error('offline'); } }), /the download failed/);
  const other = tarball(t, { 'elsewhere/readme.txt': 'not a package' });
  await assert.rejects(install({ home: f.home, pin: { version: '1.2.3', integrity: other.integrity }, download: sends(other.bytes) }), /did not unpack/);
  const junk = Buffer.from('not a tarball');
  await assert.rejects(install({ home: f.home, pin: { version: '1.2.3', integrity: `sha512-${createHash('sha512').update(junk).digest('base64')}` }, download: sends(junk) }), /did not unpack/);
  assert.deepEqual(readdirSync(f.dir), [], 'no version and no scratch folder is left');
  assert.equal(statSync(f.dir).mode & 0o077, 0, 'the folder the sign-in will sit in is private');
});

// ---------------------------------------------------------------------------
// The allow-list

const THROUGH = [
  ['search', 'rain jacket', '--limit', '3'],
  ['search', '--arguments', '{"catalog":{"query":"rain jacket"}}'],
  ['catalog', 'search', 'rain jacket'],
  ['catalog', 'lookup', 'gid://shopify/Product/1'],
  ['catalog', 'get', 'gid://shopify/Product/1', '--select', 'Size=M'],
  ['cart', 'create', '--shop', STORE, '--variant', '1'],
  ['cart', 'get', 'cart-1', '--shop', STORE],
  ['cart', 'update', 'cart-1', '--shop', STORE, '--arguments', '{"shop":"store.example.com"}'],
  ['checkout', 'create', '--shop', STORE, '--variant', '1', '--quantity', '1'],
  ['checkout', 'get', CHECKOUT, '--shop', STORE],
  ['checkout', 'update', CHECKOUT, '--shop', STORE, '--patch', '[]'],
  ['account'],
  ['account', 'login', '--wait', '0', '--device-name', 'WongStack'],
  ['account', 'logout'],
  ['order', 'search', 'running shoes', '--limit', '10'],
  ['tools'],
  ['checkout', '--help'],
  ['checkout', 'get', '--schema'],
  ['search', 'rain jacket', '--dry-run'],
  ['search', 'rain jacket', '--format', 'md'],
  ['account', 'login', '--format', 'md'],
];

test('each allowed command reaches Shop\'s command with its words unchanged', t => {
  const f = fixture(t);
  for (const args of THROUGH) {
    assert.equal(refusal(args), null, args.join(' '));
    const out = f.run(...args);
    assert.equal(out.status, 0, `${args.join(' ')}: ${everything(out)}`);
    assert.deepEqual(f.calls().at(-1).argv, args);
  }
  assert.equal(f.calls().length, THROUGH.length);
});

test('guide reads Shop\'s guide from the command, whole or one reference', t => {
  const f = fixture(t);
  f.reply({ skill: [{ text: '# Shop\n\nBe a warm shopping assistant.\n' }] });
  assert.equal(f.run('guide').stdout, '# Shop\n\nBe a warm shopping assistant.\n');
  assert.deepEqual(f.calls().at(-1).argv, ['skill']);
  f.run('guide', 'references/transactions.md');
  assert.deepEqual(f.calls().at(-1).argv, ['skill', 'references/transactions.md']);
  f.run('skill', 'references/cli.md');
  assert.deepEqual(f.calls().at(-1).argv, ['skill', 'references/cli.md']);
});

const REFUSED = [
  [['spend-request', 'create', '--business-name', 'A'], /hands the assistant a card number/],
  [['spend-request', 'get', 'sr-1', '--wait', '90'], /hands the assistant a card number/],
  [['spend-request', '--help'], /hands the assistant a card number/],
  [['checkout', 'complete', CHECKOUT, '--shop', STORE, '--instrument', '{}'], /`shop\.mjs pay` is the one pay step/],
  [['call', 'complete_checkout', '--arguments', '{}'], /`shop\.mjs pay` is the one pay step/],
  [['call', 'search_catalog', '--arguments', '{}'], /`shop\.mjs pay` is the one pay step/],
  [['checkout', 'update', CHECKOUT, '--shop', STORE, '--arguments', '{}'], /would carry the hidden payment entries back; use --patch/],
  [['checkout', 'update', '--arguments={}'], /use --patch/],
  [['skill', '--install'], /writes a copy of Shop's guide into agent folders/],
  [['guide', '--install', '--dir', '.agents/skills'], /writes a copy of Shop's guide into agent folders/],
  [['skill', '--dir', '.agents/skills'], /writes a copy of Shop's guide into agent folders/],
  [['search', 'rain jacket', '--verbose'], /--verbose may print the sign-in header/],
  [['account', '--verbose'], /--verbose may print the sign-in header/],
  [['search', 'rain jacket', '--as', 'curl'], /--as curl may print the sign-in header/],
  [['search', 'rain jacket', '--url', 'https://elsewhere.example'], /to another address/],
  [['search', 'rain jacket', '--url=https://elsewhere.example'], /to another address/],
  [['checkout', 'get', CHECKOUT, '--shop', STORE, '--format', 'md'], /--format md is refused on a checkout and on the account/],
  [['checkout', 'create', '--shop', STORE, '--variant', '1', '--format=md'], /--format md is refused/],
  [['account', '--format', 'md'], /--format md is refused/],
  [['nosuch'], /^unknown command: nosuch\./],
  [['checkout', 'cancel', CHECKOUT], /^unknown command: checkout cancel\./],
  [['cart', 'cancel', 'cart-1'], /^unknown command: cart cancel\./],
  [['order', 'get', 'order-1'], /^unknown command: order get\./],
  [['account', 'delete'], /^unknown command: account delete\./],
  [['catalog', 'delete'], /^unknown command: catalog delete\./],
];

test('each refused command prints one SHOP_REFUSED line with its reason, exits 2, and never reaches Shop\'s command', t => {
  const f = fixture(t);
  for (const [args, reason] of REFUSED) {
    const out = f.run(...args);
    assert.equal(out.status, 2, args.join(' '));
    assert.match(out.stdout, /^SHOP_REFUSED=.+\n$/, args.join(' '));
    assert.match(out.stdout.slice('SHOP_REFUSED='.length), reason, args.join(' '));
  }
  assert.deepEqual(f.calls(), []);
  assert.equal(fixture(t, { installed: false }).run('spend-request', 'create').status, 2, 'a refusal needs no install');
});

test('the command starts with one sign-in file under the home folder and no other SHOP_ setting', t => {
  const f = fixture(t);
  const out = f.runWith({ env: { SHOP_MCP_URL: 'https://elsewhere.example', SHOP_AUTH_FILE: '/tmp/other.json', SHOP_AUTH_SHOPD_ORIGIN: 'https://elsewhere.example' } }, 'account');
  assert.equal(out.status, 0, everything(out));
  assert.deepEqual(f.calls()[0].settings, { SHOP_AUTH_FILE: join(f.home, '.wong-stack/shop/credentials.json') });
  assert.deepEqual(shopEnv({ PATH: '/bin', SHOP_AUTH_FILE: 'C:\\other.json', SHOP_MCP_URL: 'https://elsewhere.example' }, { platform: 'win32', home: 'C:\\Users\\jo' }), { PATH: '/bin' }, 'Windows keeps the command\'s own store');
});

test('stdin, the exit code, and stderr pass through', t => {
  const f = fixture(t);
  f.reply({ 'checkout update': [ok(checkout())], account: [{ ...failed('auth_required', {}, 3), stderr: 'shop: note\n' }] });
  const patch = '[{"op":"replace","path":"/line_items/0/quantity","value":2}]';
  assert.equal(f.runWith({ input: patch }, 'checkout', 'update', CHECKOUT, '--shop', STORE, '--patch', '-').status, 0);
  assert.equal(f.calls()[0].stdin, patch);
  const out = f.run('account');
  assert.equal(out.status, 3);
  assert.equal(out.stderr, 'shop: note\n');
  assert.equal(JSON.parse(out.stdout).error.code, 'auth_required');
});

test('--help prints usage, and a missing command or an unknown flag of pay or install is a usage error', t => {
  const f = fixture(t);
  assert.match(f.run('--help').stdout, /^usage: shop\.mjs/);
  for (const args of [[], ['--no-such-flag'], ['install', '--force'], ['pay', CHECKOUT, '--shop', STORE, '--instrument', '1', '--total', '8400', '--currency', 'USD', '--force'],
    ['pay', '--shop', STORE, '--instrument', '1', '--total', '8400', '--currency', 'USD'], ['pay', CHECKOUT, 'extra', '--shop', STORE, '--instrument', '1', '--total', '8400', '--currency', 'USD'],
    ['pay', CHECKOUT, '--instrument', '1', '--total', '8400', '--currency', 'USD'], ['pay', CHECKOUT, '--shop', STORE, '--instrument', '0', '--total', '8400', '--currency', 'USD'],
    ['pay', CHECKOUT, '--shop', STORE, '--instrument', '1', '--total', '84.00', '--currency', 'USD'], ['pay', CHECKOUT, '--shop', STORE, '--instrument', '1', '--total', '8400', '--currency', 'usd'],
    ['pay', CHECKOUT, '--shop', STORE, '--total', '8400', '--currency', 'USD'], ['pay', CHECKOUT, '--shop', STORE, '--instrument', '1', '--currency', 'USD'], ['pay', CHECKOUT, '--shop', STORE, '--instrument', '1', '--total', '8400']]) {
    const out = f.run(...args);
    assert.equal(out.status, 2, `${args.join(' ')}: ${everything(out)}`);
    assert.match(out.stderr, /usage: shop\.mjs/);
  }
  assert.deepEqual(f.calls(), []);
});

// ---------------------------------------------------------------------------
// Masking

test('a checkout\'s saved payment methods reach the agent as n, id, type, display, and selected, with no credential', t => {
  const f = fixture(t);
  f.reply({ 'checkout get': [{ ...ok(checkout({ payment: { instruments: [CARDS[0], { ...CARDS[1], selected: true }] } })), stderr: `shop: sent ${SECRET}-saved-1\n` }] });
  const out = f.run(...READ);
  assert.equal(out.status, 0, everything(out));
  assert.doesNotMatch(everything(out), /SECRET|Hidden Lane|handler_id/);
  assert.equal(out.stderr, 'shop: sent [hidden]\n');
  const shown = JSON.parse(out.stdout).data;
  assert.deepEqual(shown.payment.instruments, [
    { n: 1, id: 'saved-1', type: 'shop_pay', display: { funding_instrument: { type: 'card', brand: 'Visa', last_digits: '4242' } } },
    { n: 2, id: 'saved-2', type: 'shop_pay', display: { funding_instrument: { type: 'card', brand: 'Visa', last_digits: '1881' } }, selected: true },
  ]);
  assert.deepEqual({ ...shown, payment: null }, { ...checkout(), payment: null }, 'the rest of the checkout is as Shop sent it');
});

test('the full entries are kept in one 0600 file per checkout, replaced at each read, and removed after a day', t => {
  const f = fixture(t);
  f.reply({ 'checkout get': [ok(checkout()), ok(checkout({ payment: { instruments: [CARDS[1]] } })), ok(checkout({ id: 'gid://shopify/Checkout/other' }))], search: [ok({ products: [] })] });
  f.run(...READ);
  const [file] = f.kept();
  assert.equal(f.kept().length, 1);
  assert.match(file, /checkouts\/[0-9a-f]{64}\.json$/);
  assert.equal(statSync(file).mode & 0o777, 0o600);
  assert.equal(statSync(f.keptDir).mode & 0o077, 0);
  assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), { instruments: CARDS });
  f.run(...READ);
  assert.deepEqual(f.kept(), [file], 'the same checkout keeps one file');
  assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), { instruments: [CARDS[1]] });
  assert.equal(statSync(file).mode & 0o777, 0o600);
  f.run(...READ);
  assert.equal(f.kept().length, 2, 'another checkout gets its own');

  const old = new Date(Date.now() - 25 * 60 * 60_000);
  utimesSync(file, old, old);
  f.run('search', 'rain jacket');
  assert.equal(f.kept().length, 1);
  assert.equal(existsSync(file), false, 'any run removes a file older than a day');
});

test('a credential is hidden wherever Shop puts it: the account\'s saved cards, an error\'s kept state, a request plan, a text copy', t => {
  const f = fixture(t);
  const account = { signed_in: true, payment: { instruments: [{ handler_id: 'shop_pay', type: 'shop_pay', display: { limit: 50000, remaining_amount: 41600 } }] }, selectable_instruments: CARDS, preferred_instrument_id: 'saved-1' };
  const plan = { dry_run: true, requests: [{ body: { params: { arguments: { id: CHECKOUT, shop: STORE, checkout: { payment: { instruments: [CARDS[0]] } } } } } }] };
  f.reply({
    account: [ok(account)],
    'checkout create': [failed('tool_error', { details: { structuredContent: checkout({ status: 'incomplete' }), content: [{ type: 'text', text: JSON.stringify(checkout()) }] } })],
    'checkout update': [ok(plan)],
    'cart get': [ok({ id: 'cart-1', note: { credential: { type: 'shop_token', token: `${SECRET}-cart` } } })],
  });
  const shown = {};
  for (const [name, args] of Object.entries({ account: ['account'], create: ['checkout', 'create', '--arguments', JSON.stringify({ shop: STORE, checkout: {} })], update: ['checkout', 'update', CHECKOUT, '--shop', STORE, '--patch', '[]', '--dry-run'], cart: ['cart', 'get', 'cart-1', '--shop', STORE] })) {
    const out = f.run(...args);
    assert.doesNotMatch(everything(out), /SECRET/, name);
    shown[name] = JSON.parse(out.stdout);
  }
  assert.deepEqual(shown.account.data.selectable_instruments.map(entry => [entry.n, entry.id, entry.display.funding_instrument.last_digits]), [[1, 'saved-1', '4242'], [2, 'saved-2', '1881']]);
  assert.deepEqual(shown.account.data.payment.instruments, [{ n: 1, type: 'shop_pay', display: { limit: 50000, remaining_amount: 41600 } }]);
  assert.equal(shown.account.data.preferred_instrument_id, 'saved-1');
  assert.deepEqual(Object.keys(shown.create.error.details.structuredContent.payment.instruments[0]), ['n', 'id', 'type', 'display']);
  assert.match(shown.create.error.details.content[0].text, /\[hidden\]/, 'a text copy of the same state has the credential written over');
  assert.deepEqual(shown.update.data.requests[0].body.params.arguments.checkout.payment.instruments, [{ n: 1, id: 'saved-1', type: 'shop_pay', display: CARDS[0].display }]);
  assert.deepEqual(shown.cart.data, { id: 'cart-1', note: {} });
  assert.equal(f.kept().length, 1, 'only a checkout with an id and a seller is kept: the one the error returned, under --arguments\' shop');
});

test('mask and scrub: entries that are not objects, short credential texts, and a credential\'s type are left readable', () => {
  const { doc, checkouts, secrets } = mask({ id: 'c1', payment: { instruments: [null, { id: 'a', credential: { type: 'shop_token_long_type_name', token: 'short', nested: { token: 'a-long-enough-secret-text' } } }] }, instruments: 'none', list: [1, 'two', null] });
  assert.deepEqual(doc, { id: 'c1', payment: { instruments: [{ n: 1 }, { n: 2, id: 'a' }] }, instruments: 'none', list: [1, 'two', null] });
  assert.equal(checkouts.length, 1);
  assert.deepEqual(secrets, ['a-long-enough-secret-text']);
  assert.equal(scrub('x a-long-enough-secret-text y a-long-enough-secret-text', secrets), 'x [hidden] y [hidden]');
  assert.equal(scrub('nothing to hide', []), 'nothing to hide');
});

test('a token from the sign-in file is written over in whatever the command prints', t => {
  const f = fixture(t);
  const signIn = { version: 1, account: 'jo@example.com-and-a-long-label', tokens: { access_token: `${SECRET}-access`, refresh: [`${SECRET}-refresh`], token_type: 'Bearer' }, pending: { device_code: `${SECRET}-device`, user_code: 'ABCD-EFGH' } };
  writeFileSync(join(f.dir, 'credentials.json'), JSON.stringify(signIn));
  const said = `Authorization: Bearer ${SECRET}-access, ${SECRET}-refresh, ${SECRET}-device for jo@example.com-and-a-long-label with ABCD-EFGH`;
  f.reply({ search: [{ ...ok({ dry_run: true, requests: [{ headers: { Authorization: `Bearer ${SECRET}-access` } }] }), stderr: `${said}\n` }], skill: [{ text: `${said}\n`, stderr: `${said}\n` }] });
  const hidden = 'Authorization: Bearer [hidden], [hidden], [hidden] for jo@example.com-and-a-long-label with ABCD-EFGH\n';
  const plan = f.run('search', 'rain jacket', '--dry-run');
  assert.equal(JSON.parse(plan.stdout).data.requests[0].headers.Authorization, 'Bearer [hidden]');
  assert.equal(plan.stderr, hidden);
  const text = f.run('guide');
  assert.equal(text.stdout, hidden);
  assert.equal(text.stderr, hidden);
});

test('an answer that is not JSON is not shown on a checkout or the account, and help text is', t => {
  const f = fixture(t);
  f.reply({ 'checkout get': [{ text: `# Checkout\n\ncard ${SECRET}\n`, stderr: `also ${SECRET}\n` }], account: [{ text: `card ${SECRET}\n` }], 'checkout create': [{ text: 'Usage: shop checkout create [flags]\n' }], search: [{ text: '7' }] });
  for (const args of [READ, ['account']]) {
    const out = f.run(...args);
    assert.equal(out.status, 1, args.join(' '));
    assert.match(out.stdout, /^SHOP_ERROR=Shop's answer was not JSON, so it is not shown/);
    assert.doesNotMatch(everything(out), /SECRET/);
  }
  assert.equal(f.run('checkout', 'create', '--help').stdout, 'Usage: shop checkout create [flags]\n');
  assert.equal(f.run('search', 'x').stdout, '7', 'JSON that is no document passes as text');
});

// ---------------------------------------------------------------------------
// Pay

/** Reads the checkout as the agent does before it asks, so its entries are kept, then sets what Shop answers next. */
function shownCheckout(t, replies, first = checkout()) {
  const f = fixture(t);
  f.reply({ 'checkout get': [ok(first)] });
  assert.equal(f.run(...READ).status, 0);
  f.reply(replies);
  return f;
}

test('pay reads once, sends the agreed entry once on stdin, and reports the completed order', t => {
  const f = shownCheckout(t, { 'checkout get': [ok(checkout())], 'checkout complete': [ok(checkout({ status: 'completed', order: ORDER }))] });
  const out = f.run(...PAY);
  assert.equal(out.status, 0, everything(out));
  assert.deepEqual(lines(out), ['SHOP_PAY=completed', 'SHOP_ORDER=order-1042', 'SHOP_ORDER_URL=https://store.example.com/orders/1042']);
  assert.doesNotMatch(everything(out), /SECRET/);
  assert.deepEqual(f.calls().slice(1).map(call => call.argv), [READ, ['checkout', 'complete', CHECKOUT, '--shop', STORE, '--instrument', '-']]);
  assert.deepEqual(JSON.parse(f.sent()[0].stdin), CARDS[0], 'the whole entry, credential included, as Shop returned it');
  assert.doesNotMatch(JSON.stringify(f.calls().map(call => call.argv)), /SECRET/, 'no credential is in any argv');
  assert.deepEqual(f.kept(), [], 'the kept entries are removed once paid');

  f.reply({ 'checkout get': [ok(checkout({ status: 'completed', order: ORDER }))] });
  const again = f.run(...PAY);
  assert.deepEqual(lines(again), ['SHOP_PAY=completed', 'SHOP_ORDER=order-1042', 'SHOP_ORDER_URL=https://store.example.com/orders/1042']);
  assert.equal(f.sent().length, 1, 'a paid checkout is reported, never paid again');
  assert.deepEqual(f.kept(), []);
});

test('pay sends the entry the person agreed to by its id, in today\'s form, when Shop lists the cards in another order', t => {
  const fresh = [{ ...CARDS[1] }, { ...CARDS[0], credential: { type: 'shop_token', token: `${SECRET}-renewed` } }];
  const f = shownCheckout(t, { 'checkout get': [ok(checkout({ payment: { instruments: fresh } }))], 'checkout complete': [ok(checkout({ status: 'completed', order: ORDER }))] });
  assert.equal(f.run(...PAY).status, 0);
  assert.deepEqual(JSON.parse(f.sent()[0].stdin), fresh[1]);
});

test('a moved total, another currency, a checkout that is not ready, or an entry not shown prints SHOP_PAY=changed and sends nothing', t => {
  const cases = [
    [checkout({ totals: [{ type: 'total', amount: 8900 }] }), /^SHOP_WHY=the total is 8900 USD, not 8400 USD$/, 'SHOP_TOTAL=8900 USD'],
    [checkout({ currency: 'CAD' }), /^SHOP_WHY=the total is 8400 CAD, not 8400 USD$/, 'SHOP_TOTAL=8400 CAD'],
    [checkout({ totals: undefined }), /^SHOP_WHY=the total is unknown USD, not 8400 USD$/, 'SHOP_TOTAL=unknown USD'],
    [checkout({ status: 'requires_escalation' }), /^SHOP_WHY=the checkout is requires_escalation, not ready_for_complete$/, 'SHOP_TOTAL=8400 USD'],
    [checkout({ payment: { instruments: [CARDS[1]] } }), /^SHOP_WHY=payment entry 1 was not shown for this checkout, or is no longer offered/, 'SHOP_TOTAL=8400 USD'],
  ];
  for (const [now, why, total] of cases) {
    const f = shownCheckout(t, { 'checkout get': [ok(now)] });
    const out = f.run(...PAY);
    assert.equal(out.status, 1, everything(out));
    const [state, reason, ...rest] = lines(out);
    assert.equal(state, 'SHOP_PAY=changed');
    assert.match(reason, why);
    assert.deepEqual(rest, [total, `SHOP_CHECKOUT_URL=${LINK}`]);
    assert.equal(f.sent().length, 0, reason);
    assert.doesNotMatch(everything(out), /SECRET/);
    assert.equal(JSON.parse(out.stdout.split('\n').at(-2)).data.status, now.status, 'the checkout as it stands follows, masked');
  }
  const unseen = fixture(t);
  unseen.reply({ 'checkout get': [ok(checkout())] });
  const out = unseen.run(...PAY);
  assert.match(lines(out)[1], /payment entry 1 was not shown for this checkout/);
  assert.equal(unseen.sent().length, 0);
  const beyond = shownCheckout(t, { 'checkout get': [ok(checkout())] });
  assert.match(lines(beyond.run(...PAY.map(word => (word === '1' ? '3' : word))))[1], /payment entry 3 was not shown/);
  assert.equal(beyond.sent().length, 0);
});

test('a checkout that can not be read stops with nothing sent', t => {
  const f = shownCheckout(t, { 'checkout get': [failed('auth_required', {}, 3), { text: 'not json', status: 1 }] });
  for (const shows of [true, false]) {
    const out = f.run(...PAY);
    assert.equal(out.status, 1);
    assert.match(out.stdout, /SHOP_ERROR=the checkout could not be read\. Nothing was sent\n$/);
    assert.equal(out.stdout.includes('auth_required'), shows, 'Shop\'s own error is shown when it gave one');
  }
  assert.equal(f.sent().length, 0);
});

test('after a transport error pay reads once more, prints SHOP_PAY=unknown, and a later pay sends nothing', t => {
  const f = shownCheckout(t, { 'checkout get': [ok(checkout())], 'checkout complete': [failed('transport', { retryable: true })] });
  const out = f.run(...PAY);
  assert.equal(out.status, 1, everything(out));
  assert.deepEqual(lines(out), ['SHOP_PAY=unknown', `SHOP_CHECKOUT_URL=${LINK}`]);
  assert.deepEqual(f.calls().slice(1).map(call => call.argv.slice(0, 2).join(' ')), ['checkout get', 'checkout complete', 'checkout get']);
  assert.doesNotMatch(everything(out), /SECRET/);

  const again = f.run(...PAY);
  assert.deepEqual(lines(again), ['SHOP_PAY=unknown', `SHOP_CHECKOUT_URL=${LINK}`]);
  assert.equal(f.sent().length, 1, 'exactly one completion is ever sent');
  assert.equal(f.calls().length, 5, 'the later pay only reads');
  f.run(...READ);
  assert.equal(JSON.parse(readFileSync(f.kept()[0], 'utf8')).sent, 'unanswered', 'a read keeps the note that a payment was sent');

  f.reply({ 'checkout get': [ok(checkout({ status: 'completed', order: ORDER }))] });
  assert.deepEqual(lines(f.run(...PAY))[0], 'SHOP_PAY=completed', 'a later read that shows the order counts');
  assert.equal(f.sent().length, 1);
});

test('no answer within the deadline, or an answer that is not JSON, is unknown too, whatever the read after it says', t => {
  for (const [reply, env] of [[{ hang: true }, { SHOP_CALL_MS: '4000' }], [{ text: 'Bad gateway', status: 1 }, {}]]) {
    const f = shownCheckout(t, { 'checkout get': [ok(checkout()), ok(checkout()), failed('transport')], 'checkout complete': [reply] });
    const out = f.runWith({ env }, ...PAY);
    assert.deepEqual(lines(out), ['SHOP_PAY=unknown', `SHOP_CHECKOUT_URL=${LINK}`]);
    assert.equal(f.sent().length, 1);
    assert.deepEqual(lines(f.run(...PAY)), ['SHOP_PAY=unknown', `SHOP_CHECKOUT_URL=${LINK}`], 'a failed read after a sent payment is unknown, and still gives the link');
    assert.equal(f.sent().length, 1);
  }
});

test('a completed order found by the read after an unsure answer counts as paid', t => {
  const f = shownCheckout(t, { 'checkout get': [ok(checkout()), ok(checkout({ status: 'completed', order: ORDER, payment: undefined }))], 'checkout complete': [failed('transport')] });
  const out = f.run(...PAY);
  assert.equal(out.status, 0, everything(out));
  assert.deepEqual(lines(out), ['SHOP_PAY=completed', 'SHOP_ORDER=order-1042', 'SHOP_ORDER_URL=https://store.example.com/orders/1042']);
  assert.equal(f.sent().length, 1);
  assert.deepEqual(f.kept(), []);
});

test('when Shop answers and the checkout is not paid, pay prints SHOP_PAY=not-completed with the link and never sends again', t => {
  const declined = failed('payment_declined', { details: { structuredContent: checkout({ status: 'incomplete' }) } });
  const f = shownCheckout(t, { 'checkout get': [ok(checkout()), ok(checkout({ status: 'requires_escalation', continue_url: `${LINK}?step=review` }))], 'checkout complete': [declined] });
  const out = f.run(...PAY);
  assert.equal(out.status, 1, everything(out));
  assert.deepEqual(lines(out), ['SHOP_PAY=not-completed', `SHOP_CHECKOUT_URL=${LINK}?step=review`]);
  assert.doesNotMatch(everything(out), /SECRET/);
  assert.equal(JSON.parse(readFileSync(f.kept()[0], 'utf8')).sent, 'answered');
  assert.deepEqual(lines(f.run(...PAY)), ['SHOP_PAY=not-completed', `SHOP_CHECKOUT_URL=${LINK}?step=review`]);
  assert.equal(f.sent().length, 1);

  const pending = shownCheckout(t, { 'checkout get': [ok(checkout()), ok(checkout({ status: 'complete_in_progress' }))], 'checkout complete': [ok(checkout({ status: 'complete_in_progress' }))] });
  assert.deepEqual(lines(pending.run(...PAY)), ['SHOP_PAY=unknown', `SHOP_CHECKOUT_URL=${LINK}`], 'a payment still in progress is not called unpaid');
  const refused = shownCheckout(t, { 'checkout get': [ok(checkout())], 'checkout complete': [failed('invalid_input', {}, 2)] });
  assert.deepEqual(lines(refused.run(...PAY)), ['SHOP_PAY=not-completed', `SHOP_CHECKOUT_URL=${LINK}`], 'an input the command refused was never sent');
});
