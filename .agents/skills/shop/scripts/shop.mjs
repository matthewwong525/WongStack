#!/usr/bin/env node
// Installs Shop's command and stands between it and the agent: which commands run, what the agent reads back,
// and the one pay step. The shop skill's SKILL.md owns the rules. Node built-ins, plus `tar`.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';

const USAGE = `usage: shop.mjs <command> [...]
  install                       download Shop's command in the one tried version; prints SHOP_INSTALLED=
  guide [references/<name>.md]  Shop's own guide, read from the command
  search | catalog search|lookup|get | cart create|get|update | checkout create|get | checkout update --patch
  account | account login|logout | order search | tools
                                passed to Shop's command; add --help or --schema for its inputs
  pay <checkout-id> --shop <seller.domain> --instrument <n> --total <minor units> --currency <code>
                                pay once; prints SHOP_PAY=completed|changed|unknown|not-completed`;

// The only version installed, its package's fingerprint, and the Node lines it runs on.
// Moved together, by a release.
export const SHOP = { version: '1.1.0', integrity: 'sha512-tWFsBAWQFWLUdvRiuYzFCrF9leAaIyoHRuZRMbUMH451dw6la1/SkoBFMAMWvjYtIxxbubXFSetVUn1+qRfYUA==', node: [[22, 21], [24, 5]] };
const NODE_RANGE = SHOP.node.map(([major, minor]) => `${major}.${minor} or newer in the ${major} line`).join(', or ');
const NEEDS = {
  install: 'Shop\'s command is not installed. It is about 2 MB and goes into your home folder. Ask the person, then run `shop.mjs install`.',
  node: `Shop's command needs Node ${NODE_RANGE}. Say so and fall back; do not install Node.`,
};
const DAY_MS = 24 * 60 * 60_000;
const DOWNLOAD_MS = 120_000;
const CALL_MS = Number(process.env.SHOP_CALL_MS ?? 120_000);
/** What the agent reads of a saved payment method: enough to name it to the person. */
const SHOWN = ['id', 'type', 'display', 'selected'];
/** Statuses that say a checkout is not paid and not being paid. */
const UNPAID = new Set(['incomplete', 'requires_escalation', 'ready_for_complete', 'canceled']);
/** Errors the command raises before it sends anything. */
const UNSENT = new Set(['invalid_input', 'usage', 'auth_required']);

/** A stop with a plain reason; `needs` is what to install. */
export class ShopError extends Error {
  constructor(reason, needs = null) {
    super(reason);
    this.needs = needs;
  }
}

// ---------------------------------------------------------------------------
// Pure helpers

const places = (home = homedir()) => {
  const dir = join(home, '.wong-stack', 'shop');
  return { dir, auth: join(dir, 'credentials.json'), kept: join(dir, 'checkouts') };
};
const binOf = (home, version) => join(places(home).dir, version, 'package', 'bin', 'shop.mjs');

/** True when Node `version` is in one of the command's lines. */
export function nodeFits(version = process.env.SHOP_NODE ?? process.versions.node, lines = SHOP.node) {
  const [major, minor] = version.split('.').map(Number);
  return lines.some(([line, from]) => major === line && minor >= from);
}

// The environment the command starts in: no `SHOP_` setting but the sign-in file, which Windows leaves to
// the command.
export function shopEnv(env = process.env, { platform = process.platform, home = homedir() } = {}) {
  const clean = Object.fromEntries(Object.entries(env).filter(([name]) => !name.startsWith('SHOP_')));
  return platform === 'win32' ? clean : { ...clean, SHOP_AUTH_FILE: places(home).auth };
}

const isMarkdown = args => args.some((arg, at) => arg === '--format=md' || (arg === '--format' && args[at + 1] === 'md'));
/** True for a command whose answer can list saved payment methods: a checkout, or the account read. */
const listsPayment = ([group, word]) => group === 'checkout' || (group === 'account' && word !== 'login' && word !== 'logout');

const GROUPS = { catalog: ['search', 'lookup', 'get'], cart: ['create', 'get', 'update'], checkout: ['create', 'get', 'update'], order: ['search'], account: ['login', 'logout'] };
const ALONE = ['search', 'tools', 'skill'];
const FLAGS = {
  '--verbose': '--verbose may print the sign-in header; it is refused until someone checks',
  '--as': '--as curl may print the sign-in header; it is refused until someone checks',
  '--url': '--url sends the request, and the sign-in with it, to another address',
};

/** Why `args` is not passed to Shop's command, or null when it is. */
export function refusal(args) {
  const [group, word] = args;
  const sub = word && !word.startsWith('-') ? word : null;
  const flags = new Set(args.filter(arg => arg.startsWith('--')).map(arg => arg.split('=')[0]));
  if (group === 'spend-request') return 'a spend request hands the assistant a card number; a website\'s own card form gets the private form';
  if (group === 'call' || (group === 'checkout' && sub === 'complete')) return '`shop.mjs pay` is the one pay step';
  if (group === 'skill' && (flags.has('--install') || flags.has('--dir'))) return 'skill --install writes a copy of Shop\'s guide into agent folders; read it with `shop.mjs guide`';
  if (group === 'checkout' && sub === 'update' && flags.has('--arguments')) return 'a full checkout document would carry the hidden payment entries back; use --patch';
  const flag = Object.keys(FLAGS).find(name => flags.has(name));
  if (flag) return FLAGS[flag];
  if (isMarkdown(args) && listsPayment(args)) return '--format md is refused on a checkout and on the account: a payment detail can be hidden only in JSON';
  const known = ALONE.includes(group) || (Object.hasOwn(GROUPS, group) && (sub === null || GROUPS[group].includes(sub)));
  return known ? null : `unknown command: ${[group, sub].filter(Boolean).join(' ')}. A command stays off until someone has read it`;
}

/** Every text a credential holds but its `type`, long enough to be a secret and to search for. */
function secretsIn(node, found = []) {
  if (typeof node === 'string' && node.length >= 16) found.push(node);
  else if (node && typeof node === 'object') for (const [key, value] of Object.entries(node)) if (key !== 'type') secretsIn(value, found);
  return found;
}

/** Every text the sign-in file holds under a name that says token, code, secret, or key. */
function signInSecrets(node = readJson(places().auth), found = [], secret = false) {
  if (typeof node === 'string' && secret && node.length >= 16) found.push(node);
  else if (node && typeof node === 'object') for (const [key, value] of Object.entries(node)) signInSecrets(value, found, secret || /token|code|secret|key/i.test(key));
  return found;
}

// `doc` as the agent may read it, as `{doc, checkouts, secrets}`: `checkouts` is each checkout's
// `{id, instruments}` in full, and `secrets` every credential text that was dropped.
export function mask(doc) {
  const checkouts = [];
  const secrets = [];
  const shown = (entry, at) => ({ n: at + 1, ...Object.fromEntries(SHOWN.filter(key => entry?.[key] !== undefined).map(key => [key, walk(entry[key])])) });
  const walk = node => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== 'object') return node;
    if (typeof node.id === 'string' && Array.isArray(node.payment?.instruments)) checkouts.push({ id: node.id, instruments: node.payment.instruments });
    const kept = {};
    for (const [key, value] of Object.entries(node)) {
      if (key === 'credential') secretsIn(value, secrets);
      else if (key.endsWith('instruments') && Array.isArray(value)) { secretsIn(value.map(entry => entry?.credential), secrets); kept[key] = value.map(shown); }
      else kept[key] = walk(value);
    }
    return kept;
  };
  return { doc: walk(doc), checkouts, secrets };
}

/** `text` with each of `secrets` written `[hidden]`. */
export const scrub = (text, secrets) => secrets.reduce((out, secret) => out.split(secret).join('[hidden]'), text);

/** The checkout a result carries: its data, or the state a tool error kept. Null when it carries none. */
function checkoutOf(result) {
  const state = result?.ok ? result.data : result?.error?.details?.structuredContent;
  return state && typeof state === 'object' && typeof state.status === 'string' ? state : null;
}
const paid = checkout => checkout?.status === 'completed' && Boolean(checkout.order);
const totalOf = checkout => `${checkout.totals?.find?.(line => line?.type === 'total')?.amount ?? 'unknown'} ${checkout.currency ?? 'unknown'}`;

/** The seller a checkout command names, from `--shop` or its `--arguments` object. */
function shopOf(args) {
  const value = name => { const at = args.findIndex(arg => arg === name || arg.startsWith(`${name}=`)); return at < 0 ? null : args[at].includes('=') ? args[at].slice(name.length + 1) : args[at + 1]; };
  if (value('--shop')) return value('--shop');
  try { return JSON.parse(value('--arguments')).shop ?? null; } catch { return null; }
}

// ---------------------------------------------------------------------------
// Install

/** Downloads `pin`'s package and unpacks it only when its fingerprint matches; resolves to the version. */
export async function install({ home = homedir(), pin = SHOP, download = fetch } = {}) {
  const { dir } = places(home);
  const response = await download(`https://registry.npmjs.org/@shopify/shop/-/shop-${pin.version}.tgz`, { signal: AbortSignal.timeout(DOWNLOAD_MS) }).catch(() => null);
  if (!response?.ok) throw new ShopError('the download failed. Nothing was installed');
  const archive = Buffer.from(await response.arrayBuffer());
  const found = `sha512-${createHash('sha512').update(archive).digest('base64')}`;
  if (found !== pin.integrity) throw new ShopError(`the download is not the one WongStack tried: its fingerprint is ${found}, not ${pin.integrity}. Nothing was installed`);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const scratch = mkdtempSync(join(dir, 'unpack-'));
  try {
    writeFileSync(join(scratch, 'shop.tgz'), archive);
    const unpacked = spawnSync('tar', ['-xzf', 'shop.tgz'], { cwd: scratch, stdio: 'ignore' });
    rmSync(join(scratch, 'shop.tgz'));
    if (unpacked.status !== 0 || !existsSync(join(scratch, 'package', 'bin', 'shop.mjs'))) throw new ShopError('the download did not unpack. Nothing was installed');
    for (const name of readdirSync(dir)) if (/^\d+\.\d+\.\d+/.test(name)) rmSync(join(dir, name), { recursive: true, force: true });
    renameSync(scratch, join(dir, pin.version));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  return pin.version;
}

/** Stops unless Node fits and the pinned version is installed. */
function ready() {
  if (!nodeFits()) throw new ShopError(NEEDS.node, 'node');
  if (!existsSync(binOf(homedir(), SHOP.version))) throw new ShopError(NEEDS.install, 'install');
}

// ---------------------------------------------------------------------------
// Kept payment entries

const readJson = file => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } };
const keptFile = (shop, id) => join(places().kept, `${createHash('sha256').update(`${shop}\n${id}`).digest('hex')}.json`);

// Replaces a checkout's kept file, 0600, with what it held and `more` over it: new entries keep the note that
// a payment was sent.
function keep(shop, id, more) {
  const file = keptFile(shop, id);
  const next = { ...readJson(file), ...more };
  mkdirSync(places().kept, { recursive: true, mode: 0o700 });
  rmSync(file, { force: true });
  writeFileSync(file, `${JSON.stringify(next)}\n`, { mode: 0o600 });
}

/** Removes each kept file older than a day. */
function sweep(now = Date.now()) {
  const { kept } = places();
  if (!existsSync(kept)) return;
  for (const name of readdirSync(kept)) if (now - statSync(join(kept, name)).mtimeMs > DAY_MS) rmSync(join(kept, name), { force: true });
}

// ---------------------------------------------------------------------------
// Running the command

// One run of Shop's command. `input` is its stdin; without one it reads this script's.
// `result` is its JSON answer, if it gave one.
function call(args, { input, timeout } = {}) {
  const done = spawnSync(process.execPath, [binOf(homedir(), SHOP.version), ...args], { env: shopEnv(), encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout, input, stdio: [input === undefined ? 'inherit' : 'pipe', 'pipe', 'pipe'] });
  return { status: done.status ?? 1, stdout: done.stdout ?? '', stderr: done.stderr ?? '', result: readAnswer(done.stdout) };
}

function readAnswer(text) {
  try {
    const answer = JSON.parse(text);
    return answer && typeof answer === 'object' ? answer : null;
  } catch {
    return null;
  }
}

/** Prints a run as the agent may read it, and keeps each checkout's payment entries under `shop`. */
function show({ stdout, stderr, result }, { shop = null, hideText = false } = {}) {
  const signIn = signInSecrets();
  if (!result) {
    if (hideText) throw new ShopError('Shop\'s answer was not JSON, so it is not shown: it could hold a payment detail');
    process.stderr.write(scrub(stderr, signIn));
    process.stdout.write(scrub(stdout, signIn));
    return;
  }
  const { doc, checkouts, secrets } = mask(result);
  if (shop) for (const { id, instruments } of checkouts) keep(shop, id, { instruments });
  process.stderr.write(scrub(stderr, [...secrets, ...signIn]));
  console.log(scrub(JSON.stringify(doc), [...secrets, ...signIn]));
}

function through(args) {
  const why = refusal(args);
  if (why) {
    console.log(`SHOP_REFUSED=${why}`);
    return 2;
  }
  ready();
  const run = call(args);
  show(run, { shop: args[0] === 'checkout' ? shopOf(args) : null, hideText: listsPayment(args) && !args.includes('--help') });
  return run.status;
}

// ---------------------------------------------------------------------------
// Pay

// Why a checkout can not be paid as the person agreed, or null when it can.
// `entry` is the agreed payment entry as now offered.
function changed(checkout, entry, { n, total, currency }) {
  if (checkout.status !== 'ready_for_complete') return `the checkout is ${checkout.status}, not ready_for_complete`;
  if (totalOf(checkout) !== `${total} ${currency}`) return `the total is ${totalOf(checkout)}, not ${total} ${currency}`;
  return entry ? null : `payment entry ${n} was not shown for this checkout, or is no longer offered; read the entries below and ask again`;
}

// Pays checkout `id` at `shop` once with entry `n`, when its total is still `total` `currency`.
// Returns the exit code.
function pay(id, { shop, n, total, currency }) {
  const read = () => call(['checkout', 'get', id, '--shop', shop], { input: '', timeout: CALL_MS });
  const first = read();
  const now = checkoutOf(first.result);
  const key = now?.id ?? id;
  const before = readJson(keptFile(shop, key));
  let link = now?.continue_url ?? before?.link;
  // Prints where the checkout stands in `run`, which follows a sent payment.
  // `answered`: Shop answered that payment.
  const settle = (run, answered) => {
    const checkout = checkoutOf(run.result);
    link = checkout?.continue_url ?? link;
    if (paid(checkout)) console.log(`SHOP_PAY=completed\nSHOP_ORDER=${checkout.order.id ?? ''}\nSHOP_ORDER_URL=${checkout.order.permalink_url ?? ''}`);
    else console.log(`SHOP_PAY=${answered && UNPAID.has(checkout?.status) ? 'not-completed' : 'unknown'}\nSHOP_CHECKOUT_URL=${link ?? ''}`);
    if (run.result) show(run, { shop: paid(checkout) ? null : shop });
    if (paid(checkout)) rmSync(keptFile(shop, key), { force: true });
    return paid(checkout) ? 0 : 1;
  };

  if (before?.sent) return settle(first, before.sent === 'answered');
  if (!now) {
    if (first.result) show(first);
    throw new ShopError('the checkout could not be read. Nothing was sent');
  }
  if (paid(now)) return settle(first, true);
  const agreed = before?.instruments?.[n - 1]?.id;
  const entry = agreed === undefined ? null : now.payment?.instruments?.find(offered => offered?.id === agreed);
  const why = changed(now, entry, { n, total, currency });
  if (why) {
    console.log(`SHOP_PAY=changed\nSHOP_WHY=${why}\nSHOP_TOTAL=${totalOf(now)}\nSHOP_CHECKOUT_URL=${link ?? ''}`);
    show(first, { shop });
    return 1;
  }

  keep(shop, key, { instruments: now.payment.instruments, sent: 'unanswered', link });
  const sent = call(['checkout', 'complete', id, '--shop', shop, '--instrument', '-'], { input: JSON.stringify(entry), timeout: CALL_MS });
  const answered = Boolean(sent.result?.ok || sent.result?.error?.details?.structuredContent || UNSENT.has(sent.result?.error?.code));
  if (answered) keep(shop, key, { sent: 'answered' });
  return paid(checkoutOf(sent.result)) ? settle(sent, true) : settle(read(), answered);
}

// ---------------------------------------------------------------------------
// CLI

async function main([command, ...rest]) {
  sweep();
  if (command === 'install') {
    parseCli({ usage: USAGE, args: rest });
    if (!nodeFits()) throw new ShopError(NEEDS.node, 'node');
    console.log(`SHOP_INSTALLED=yes ${await install()}`);
    return 0;
  }
  if (command === 'pay') {
    const { values, positionals: [id, ...extra] } = parseCli({ usage: USAGE, args: rest, allowPositionals: true, options: { shop: { type: 'string' }, instrument: { type: 'string' }, total: { type: 'string' }, currency: { type: 'string' } } });
    const fits = id && !extra.length && values.shop && /^[1-9]\d*$/.test(values.instrument ?? '') && /^\d+$/.test(values.total ?? '') && /^[A-Z]{3}$/.test(values.currency ?? '');
    if (!fits) usageError(USAGE, 'pay takes a checkout id, --shop, --instrument <n>, --total <minor units>, and --currency <code>');
    ready();
    return pay(id, { shop: values.shop, n: Number(values.instrument), total: values.total, currency: values.currency });
  }
  return through(command === 'guide' ? ['skill', ...rest] : [command, ...rest]);
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  if (!args.length || args[0].startsWith('-')) {
    parseCli({ usage: USAGE, args });
    usageError(USAGE, 'missing command');
  }
  try {
    process.exitCode = await main(args);
  } catch (error) {
    if (!(error instanceof ShopError)) throw error;
    console.log(error.needs ? `SHOP_NEEDS=${error.needs}` : `SHOP_ERROR=${error.message.replace(/\s+/g, ' ')}`);
    if (error.needs) console.error(error.message);
    process.exitCode = error.needs ? 3 : 1;
  }
}
