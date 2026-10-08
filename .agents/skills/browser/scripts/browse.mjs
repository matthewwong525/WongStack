#!/usr/bin/env node
// Installs, starts, and drives camofox, the browser the agent uses websites in as the person.
//
//     node .claude/skills/browser/scripts/browse.mjs open <url>
//     node .claude/skills/browser/scripts/browse.mjs snapshot
//     node .claude/skills/browser/scripts/browse.mjs click|type|press|select <ref-or-selector|key> [text]
//     node .claude/skills/browser/scripts/browse.mjs get url | get count <selector> | get value <ref-or-selector>
//     node .claude/skills/browser/scripts/browse.mjs screenshot [--if-changed]
//     node .claude/skills/browser/scripts/browse.mjs logins | forget <name>
//     node .claude/skills/browser/scripts/browse.mjs login <name> [--username <ref>] [--password <ref>] [--submit <ref>]
//     node .claude/skills/browser/scripts/browse.mjs save | close | status | install | stop
//
// camofox (`@askjo/camofox-browser`) is a local REST server over a Firefox build. This script is the only
// thing that talks to it. `install` puts the two versions in CAMOFOX, and no others, into
// ~/.wong-stack/camofox/ with `npm install --prefix`, its temp folder on disk beside it, since the 660 MB
// browser download fails on a small RAM disk. Any command that finds no install prints
// `BROWSE_NEEDS=install` and exits 3: the agent asks the person, runs `install`, and retries.
//
// The server starts on demand, detached, on a free loopback port recorded in `server.json`. Each start
// binds 127.0.0.1, switches camofox's failure reporting off, keeps logins under `profiles/`, and passes
// an API key made once into a 0600 file. It keeps no log: camofox logs a failed step's detail, which
// can hold what was typed. A start is refused when the installed `playwright-core` is not the pinned
// minor: a newer driver fails to save a login.
//
// A task's page is a tab keyed by `--session <name>` (default: the checkout's folder name), camofox's
// `sessionKey`; the `userId` is always `me`, so every task shares the saved logins and none shares a
// page. The tab's id and last address sit in `tabs/<session>.json`. `open` waits until two snapshots a
// gap apart match. A command answered 404 or 410 (the tab is gone), or a click that times out, reopens
// the tab at its last address and retries once. Every call has a deadline. A failure prints one
// `BROWSE_ERROR=<reason>` line and exits 1.
//
// `logins` prints each saved login's name, host, and username, never a password. `login <name>` reads
// logins.mjs's file in this process and posts each value to camofox's `/type` for the box the agent
// named, over loopback, then presses `--submit` or Enter. It prints only
// `BROWSE_LOGIN=accepted|rejected|missing|typed`: accepted once the address leaves the login page within
// 15 seconds, typed for a step with no password box, such as an email then Continue. An accepted login
// is saved at once (`BROWSE_SAVED=yes|no`). `save` checkpoints the logins with every tab open, by
// posting an empty cookie list. `close` removes this task's tab, and closes camofox's session, which
// also saves, when no tab is left. No stored value reaches argv, env, output, or a file.
//
// `client(session, {retry, start})` is the same driver for hand-over.mjs's private form and live view,
// which retry nothing and start nothing. Three of its calls have no command and serve those links alone:
// `size` reads the page's size, `resize` sets it through camofox's `/viewport`, which resizes the page's
// window too, and `keepAlive` evaluates a constant, so camofox counts a use and an idle page stays open
// while nothing on it is read or changed. `serverPid` is the running server's process, whose browser
// child a live view finds the screen from.
//
// Exit codes: 0 ok · 1 failed · 2 usage · 3 camofox is not installed. Node built-ins only. For tests:
// BROWSE_SETTLE_MS and BROWSE_SETTLE_GAP_MS override the 8-second settle and its 1-second gap,
// BROWSE_LOGIN_WAIT_MS the 15 seconds, BROWSE_COMMAND_MS a call's 45-second deadline, and
// BROWSE_START_MS the 60-second start.
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { homedir, tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { hostOf, readLogins, writeLogins } from './logins.mjs';

const USAGE = `usage: browse.mjs <command> [--session <name>]
  open <url>                    open the page in this task's tab; prints BROWSE_URL=
  snapshot                      the page as text with refs (e1, e2…)
  click <ref-or-selector>
  type <ref-or-selector> <text>
  press <key>
  select <ref-or-selector> <option>
  get url | get count <selector> | get value <ref-or-selector>
  screenshot [--if-changed]     prints BROWSE_SHOT=<temp path>, or none when unchanged
  logins                        each saved login's name, host, and username
  login <name> [--username <ref>] [--password <ref>] [--submit <ref>]
                                type a saved login; prints BROWSE_LOGIN=accepted|rejected|missing|typed
  forget <name>                 delete a saved login
  save                          keep the logins now, with every tab open
  close                         close this task's tab
  status | install | stop       the install and the server`;

/** The only versions installed, moved together and only with a passing save on a real camofox. */
export const CAMOFOX = { '@askjo/camofox-browser': '1.18.1', 'playwright-core': '1.58.2' };
const DRIVER_LINE = CAMOFOX['playwright-core'].split('.').slice(0, 2).join('.');
const NEEDS = 'camofox is not installed. It needs about 1.4 GB of disk and about 700 MB of memory while it runs. Ask the person, then run `browse.mjs install`.';
const USER = 'me';
const DIR = join(homedir(), '.wong-stack', 'camofox');
const FILES = { server: join(DIR, 'server.json'), key: join(DIR, 'api-key'), lock: join(DIR, 'start.lock'), tmp: join(DIR, 'tmp'), tabs: join(DIR, 'tabs'), profiles: join(DIR, 'profiles') };
const packageDir = name => join(DIR, 'node_modules', name);
const SERVER_SCRIPT = join(packageDir('@askjo/camofox-browser'), 'server.js');
const ms = (name, normal) => Number(process.env[name] ?? normal);
const SETTLE_MS = ms('BROWSE_SETTLE_MS', 8000);
const SETTLE_GAP_MS = ms('BROWSE_SETTLE_GAP_MS', 1000);
const LOGIN_WAIT_MS = ms('BROWSE_LOGIN_WAIT_MS', 15_000);
const COMMAND_MS = ms('BROWSE_COMMAND_MS', 45_000);
const START_MS = ms('BROWSE_START_MS', 60_000);
const INSTALL_MS = 30 * 60_000;
const sleep = wait => new Promise(done => setTimeout(done, wait));

/** A stop with a plain reason. `status` is camofox's HTTP status; `needs` is what to install. */
export class BrowseError extends Error {
  constructor(reason, { status = null, timedOut = false, needs = null } = {}) {
    super(reason);
    Object.assign(this, { status, timedOut, needs });
  }
}

// ---------------------------------------------------------------------------
// Pure helpers

/** The session a task's tab is keyed by: the name given, else the checkout's folder name. */
export function sessionName(given) {
  const top = given ?? spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).stdout?.trim();
  return basename(top || process.cwd()).replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 64) || 'default';
}

/** A snapshot ref (`e12` or `@e12`) or a selector, as camofox's routes take it. */
export function targetOf(target) {
  return /^@?e\d+$/.test(target) ? { ref: target.replace(/^@/, '') } : { selector: target };
}

/** What a field holds, read from a snapshot: a text box's text, or a dropdown's picked choice. Null when the ref is absent. */
export function valueIn(snapshot, ref) {
  const lines = snapshot.split('\n');
  const at = lines.findIndex(line => line.includes(`[${ref}]`));
  if (at < 0) return null;
  const inline = /\[e\d+\](?: \[[^\]]*\])*: (.*)$/.exec(lines[at]);
  if (inline) return inline[1].replace(/^"(.*)"$/, '$1');
  const depth = lines[at].search(/\S/);
  for (const line of lines.slice(at + 1)) {
    if (line.search(/\S/) <= depth) break;
    const picked = /option "([^"]*)".*\[selected\]/.exec(line);
    if (picked) return picked[1];
  }
  return '';
}

/** True when `now` is another page than `before`: the address differs with its query left out. */
export function leftPage(before, now) {
  const page = address => address.replace(/\?[^#]*/, '');
  return page(before) !== page(now);
}

/** The environment camofox starts in: loopback only, nothing reported, its files under one folder. */
export function serverEnv(port, key, env = process.env) {
  return {
    ...env,
    CAMOFOX_PORT: String(port),
    CAMOFOX_BIND_HOST: '127.0.0.1',
    CAMOFOX_CRASH_REPORT_ENABLED: 'false',
    CAMOFOX_CRASH_REPORT_URL: '',
    SENTRY_DSN: '',
    CAMOFOX_PROFILE_DIR: FILES.profiles,
    CAMOFOX_API_KEY: key,
    TMPDIR: FILES.tmp,
  };
}

// ---------------------------------------------------------------------------
// Install and server

const readJson = file => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } };
const alive = pid => { try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; } };
const tabFile = session => join(FILES.tabs, `${session}.json`);
const installed = () => existsSync(SERVER_SCRIPT);
/** The camofox server's process id as last recorded, or null. */
export const serverPid = () => readJson(FILES.server)?.pid ?? null;
const driver = () => readJson(join(packageDir('playwright-core'), 'package.json'))?.version ?? 'missing';

function privateDirs() {
  for (const dir of [DIR, FILES.tmp, FILES.tabs, FILES.profiles]) mkdirSync(dir, { recursive: true, mode: 0o700 });
}

function install() {
  privateDirs();
  const specs = Object.entries(CAMOFOX).map(([name, version]) => `${name}@${version}`);
  const done = spawnSync('npm', ['install', '--prefix', DIR, '--no-audit', '--no-fund', ...specs], { stdio: ['ignore', 2, 2], env: { ...process.env, TMPDIR: FILES.tmp }, timeout: INSTALL_MS, shell: process.platform === 'win32' });
  if (done.status !== 0 || !installed()) throw new BrowseError('the install failed; see npm\'s lines above');
  console.log('BROWSE_INSTALLED=yes');
}

/** The API key, made once into a 0600 file. */
function apiKey() {
  if (!existsSync(FILES.key)) writeFileSync(FILES.key, `${randomBytes(32).toString('hex')}\n`, { mode: 0o600 });
  return readFileSync(FILES.key, 'utf8').trim();
}

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer().once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

/** The running server's `{port, key}`, or null when none answers. */
async function liveServer() {
  const info = readJson(FILES.server);
  if (!info || !alive(info.pid)) return null;
  try {
    await fetch(`http://127.0.0.1:${info.port}/health`, { signal: AbortSignal.timeout(2000) });
  } catch {
    return null;
  }
  return { port: info.port, key: apiKey() };
}

/** Polls for a server that answers until START_MS passes, or `pid` is given and dies. */
async function awaitServer(pid = null) {
  const end = Date.now() + START_MS;
  while (Date.now() < end && (pid === null || alive(pid))) {
    const live = await liveServer();
    if (live) return live;
    await sleep(200);
  }
  throw new BrowseError('the browser did not start');
}

/** Takes the start lock; false when another task is starting the server. A lock left by a dead start is cleared. */
function takeLock() {
  try {
    if (Date.now() - statSync(FILES.lock).mtimeMs > 2 * START_MS) rmSync(FILES.lock, { recursive: true, force: true });
  } catch { /* no lock */ }
  try { mkdirSync(FILES.lock); return true; } catch { return false; }
}

async function startServer() {
  if (!installed()) throw new BrowseError(NEEDS, { needs: 'install' });
  if (!driver().startsWith(`${DRIVER_LINE}.`)) throw new BrowseError(`the browser driver is ${driver()}, not ${DRIVER_LINE}.x, and a login does not save on any other; run \`browse.mjs install\``);
  privateDirs();
  if (!takeLock()) return awaitServer();
  try {
    // Another task may have started the server between this task's look and its lock.
    const live = await liveServer();
    if (live) return live;
    const port = await freePort();
    const child = spawn(process.execPath, [SERVER_SCRIPT], { cwd: DIR, detached: true, stdio: 'ignore', env: serverEnv(port, apiKey()) });
    child.unref();
    writeFileSync(FILES.server, `${JSON.stringify({ pid: child.pid, port })}\n`, { mode: 0o600 });
    return await awaitServer(child.pid);
  } finally {
    rmSync(FILES.lock, { recursive: true, force: true });
  }
}

async function stop() {
  const pid = readJson(FILES.server)?.pid;
  if (pid && alive(pid)) {
    process.kill(pid, 'SIGTERM');
    for (let i = 0; i < 100 && alive(pid); i++) await sleep(100);
    if (alive(pid)) process.kill(pid, 'SIGKILL');
  }
  rmSync(FILES.server, { force: true });
  console.log('BROWSE_SERVER=stopped');
}

async function status() {
  console.log(`BROWSE_INSTALLED=${installed() ? `yes camofox ${readJson(join(packageDir('@askjo/camofox-browser'), 'package.json'))?.version} driver ${driver()}` : 'no'}`);
  console.log(`BROWSE_SERVER=${(await liveServer()) ? 'running' : 'stopped'}`);
}

// ---------------------------------------------------------------------------
// The driver

/**
 * One call to camofox, with a deadline. A refusal throws a BrowseError with camofox's reason, or with
 * none of its words when `quiet`: a failed typing step can quote what was typed.
 */
async function call(server, method, path, body, { wait = COMMAND_MS, quiet = false } = {}) {
  let response;
  try {
    const content = body ? { headers: { authorization: `Bearer ${server.key}`, 'content-type': 'application/json' }, body: JSON.stringify(body) } : { headers: { authorization: `Bearer ${server.key}` } };
    response = await fetch(`http://127.0.0.1:${server.port}${path}`, { method, ...content, signal: AbortSignal.timeout(wait) });
  } catch (error) {
    const timedOut = error.name === 'TimeoutError';
    throw new BrowseError(timedOut ? 'the browser took too long' : 'the browser did not answer', { timedOut });
  }
  if (response.ok) return response;
  const reason = quiet ? '' : (await response.json().catch(() => ({}))).error ?? '';
  throw new BrowseError(reason || `the browser refused the step (HTTP ${response.status})`, { status: response.status, timedOut: /timed out|Timeout/.test(reason) });
}

/** True when the tab is gone, or a click hung: both end by reopening the page. */
const reopens = (error, click) => error instanceof BrowseError && (error.status === 404 || error.status === 410 || (click && error.timedOut));

/**
 * The driver for one session's tab. `retry` reopens a lost tab and tries the step once more; `start`
 * starts the server when none runs. Each method throws a BrowseError on failure.
 */
export function client(given, { retry = true, start = true } = {}) {
  const session = sessionName(given);
  let server = null;
  const connect = async () => {
    server ??= (await liveServer()) ?? (start ? await startServer() : null);
    if (!server) throw new BrowseError('the browser is not running');
    return server;
  };
  const send = async (method, path, body, options) => call(await connect(), method, path, body, options);
  const json = async (...args) => (await send(...args)).json();
  const readTab = () => readJson(tabFile(session));
  const writeTab = tab => { privateDirs(); writeFileSync(tabFile(session), `${JSON.stringify(tab)}\n`, { mode: 0o600 }); return tab; };
  const noteUrl = url => { const tab = readTab(); if (tab && url && tab.url !== url) writeTab({ ...tab, url }); return url; };

  const read = async tabId => {
    let page = await json('GET', `/tabs/${tabId}/snapshot?userId=${USER}`);
    let text = page.snapshot ?? '';
    while (page.hasMore) {
      page = await json('GET', `/tabs/${tabId}/snapshot?userId=${USER}&offset=${page.nextOffset}`);
      text += page.snapshot ?? '';
    }
    return { url: page.url, snapshot: text };
  };
  /** Waits until two reads a gap apart match, so a half-loaded page is not read as the page. */
  const settle = async tabId => {
    const end = Date.now() + SETTLE_MS;
    for (let last = null; ;) {
      const { snapshot } = await read(tabId);
      if (snapshot === last || Date.now() >= end) return;
      last = snapshot;
      await sleep(SETTLE_GAP_MS);
    }
  };
  const newTab = async url => {
    const made = await json('POST', '/tabs', { userId: USER, sessionKey: session, url }, { wait: COMMAND_MS + SETTLE_MS });
    const tab = writeTab({ tabId: made.tabId, url: made.url ?? url });
    await settle(tab.tabId);
    return tab;
  };
  /** Runs a step on this session's tab; a lost tab is reopened at its last address and the step tried once more. */
  const onTab = async (step, { click = false } = {}) => {
    const tab = readTab();
    if (!tab) throw installed() ? new BrowseError('no page is open in this session; run `browse.mjs open <url>` first') : new BrowseError(NEEDS, { needs: 'install' });
    try {
      return await step(tab.tabId);
    } catch (error) {
      if (!retry || !reopens(error, click)) throw error;
      return step((await newTab(tab.url)).tabId);
    }
  };
  const act = (route, target, more = {}, options) => onTab(tabId => send('POST', `/tabs/${tabId}/${route}`, { userId: USER, ...targetOf(target), ...more }, options), { click: route === 'click' });
  const evaluate = expression => onTab(async tabId => (await json('POST', `/tabs/${tabId}/evaluate`, { userId: USER, expression })).result);

  const page = {
    session,
    async open(url) {
      const tab = readTab();
      if (tab) {
        try {
          const moved = await json('POST', `/tabs/${tab.tabId}/navigate`, { userId: USER, url }, { wait: COMMAND_MS + SETTLE_MS });
          await settle(tab.tabId);
          return noteUrl(moved.url ?? url);
        } catch (error) {
          if (!reopens(error, false)) throw error;
        }
      }
      return (await newTab(url)).url;
    },
    async snapshot() {
      const seen = await onTab(read);
      noteUrl(seen.url);
      return seen;
    },
    click: target => act('click', target),
    type: (target, text) => act('type', target, { text }, { quiet: true }),
    select: (target, option) => act('select', target, { option }),
    press: key => onTab(tabId => send('POST', `/tabs/${tabId}/press`, { userId: USER, key })),
    url: async () => noteUrl(await evaluate('location.href')),
    count: selector => evaluate(`document.querySelectorAll(${JSON.stringify(selector)}).length`),
    /** The page's size, `[width, height]`. */
    size: () => evaluate('[innerWidth, innerHeight]'),
    /** Sets the page's size; camofox resizes the page's window with it. */
    resize: (width, height) => onTab(tabId => send('POST', `/tabs/${tabId}/viewport`, { userId: USER, width, height })),
    /** A use camofox counts, so it keeps an idle page open; it reads and changes nothing on the page. */
    keepAlive: () => evaluate('1'),
    async value(target) {
      const { ref, selector } = targetOf(target);
      const value = ref ? valueIn((await page.snapshot()).snapshot, ref) : await evaluate(`document.querySelector(${JSON.stringify(selector)})?.value ?? null`);
      if (value === null) throw new BrowseError(`no field ${target} on the page`);
      return value;
    },
    /** A picture of the page in the temp folder; null when `ifChanged` and it shows what the last one did. */
    async screenshot(ifChanged = false) {
      const png = Buffer.from(await (await onTab(tabId => send('GET', `/tabs/${tabId}/screenshot?userId=${USER}`))).arrayBuffer());
      const shot = createHash('sha256').update(png).digest('hex');
      const tab = readTab();
      if (ifChanged && tab.shot === shot) return null;
      writeTab({ ...tab, shot });
      const file = join(tmpdir(), `browse-${session}-${shot.slice(0, 12)}.png`);
      writeFileSync(file, png, { mode: 0o600 });
      return file;
    },
    /** Keeps the logins now, with every tab open: an empty cookie import makes camofox checkpoint. */
    save: () => send('POST', `/sessions/${USER}/cookies`, { cookies: [] }),
    /** Closes this task's tab, and camofox's session, which saves, when no tab is left. */
    async close() {
      const tab = readTab();
      rmSync(tabFile(session), { force: true });
      server ??= await liveServer();
      if (!server) return;
      if (tab) await send('DELETE', `/tabs/${tab.tabId}?userId=${USER}`);
      const { tabs = [] } = await json('GET', `/tabs?userId=${USER}`);
      if (!tabs.length) await send('DELETE', `/sessions/${USER}`);
    },
  };
  return page;
}

// ---------------------------------------------------------------------------
// Saved logins

/** The saved logins; an unreadable file stops with a plain reason. */
function savedLogins() {
  try { return readLogins(); } catch (error) { throw new BrowseError(error.message); }
}

/**
 * Types the saved login `name` into the boxes named and submits. Resolves to `{result, saved}`:
 * `missing`, `typed` for a step with no password box, `accepted` once the address leaves the login page,
 * else `rejected`. Only this function reads a stored password.
 */
export async function login(page, name, { username, password, submit }) {
  const entry = savedLogins().find(saved => saved.name === name);
  if (!entry) return { result: 'missing' };
  const before = await page.url();
  if (username) await page.type(username, entry.username);
  if (password) await page.type(password, entry.password);
  await (submit ? page.click(submit) : page.press('Enter'));
  if (!password) return { result: 'typed' };
  for (const end = Date.now() + LOGIN_WAIT_MS; ;) {
    const now = await page.url().catch(() => null);
    if (now && leftPage(before, now)) return { result: 'accepted', saved: await page.save().then(() => true, () => false) };
    if (Date.now() >= end) return { result: 'rejected' };
    await sleep(Math.min(500, LOGIN_WAIT_MS));
  }
}

function logins() {
  const saved = savedLogins();
  console.log(`BROWSE_LOGINS=${saved.length}`);
  for (const { name, url, username } of saved) console.log([name, hostOf(url), username].join('\t'));
}

function forget(name) {
  const saved = savedLogins();
  if (!saved.some(entry => entry.name === name)) return console.log('BROWSE_LOGIN=missing');
  writeLogins(saved.filter(entry => entry.name !== name));
  console.log(`BROWSE_FORGOT=${name}`);
}

// ---------------------------------------------------------------------------
// CLI

/** Each command: how many words follow it, and what it runs. */
const COMMANDS = {
  open: [1, async (page, [url]) => console.log(`BROWSE_URL=${await page.open(url)}`)],
  snapshot: [0, async page => { const { url, snapshot } = await page.snapshot(); console.log(`BROWSE_URL=${url}\n${snapshot}`); }],
  click: [1, (page, [target]) => page.click(target)],
  type: [2, (page, [target, text]) => page.type(target, text)],
  press: [1, (page, [key]) => page.press(key)],
  select: [2, (page, [target, option]) => page.select(target, option)],
  screenshot: [0, async (page, _, flags) => console.log(`BROWSE_SHOT=${(await page.screenshot(flags['if-changed'])) ?? 'none'}`)],
  logins: [0, logins],
  forget: [1, (_, [name]) => forget(name)],
  save: [0, async page => { await page.save(); console.log('BROWSE_SAVED=yes'); }],
  close: [0, async page => { await page.close(); console.log(`BROWSE_CLOSED=${page.session}`); }],
  status: [0, status],
  install: [0, install],
  stop: [0, stop],
  async login(page, [name], flags) {
    const { result, saved } = await login(page, name, flags);
    console.log(`BROWSE_LOGIN=${result}`);
    if (saved !== undefined) console.log(`BROWSE_SAVED=${saved ? 'yes' : 'no'}`);
  },
  async get(page, [what, target]) {
    console.log(await { url: () => page.url(), count: () => page.count(target), value: () => page.value(target) }[what]());
  },
};
const QUIET = new Set(['click', 'type', 'press', 'select']);

/** The command's runner, or a usage error when its words don't fit. */
function runnerFor(command, words, flags) {
  const usage = message => usageError(USAGE, message);
  if (!Object.hasOwn(COMMANDS, command)) usage(command ? `unknown command: ${command}` : 'missing command');
  if (command === 'login') {
    if (words.length !== 1 || !(flags.username || flags.password)) usage('login takes a name and --username, --password, or both');
    return COMMANDS.login;
  }
  if (command === 'get') {
    const fits = words[0] === 'url' ? words.length === 1 : ['count', 'value'].includes(words[0]) && words.length === 2;
    if (!fits) usage('get takes url, count <selector>, or value <ref-or-selector>');
    return COMMANDS.get;
  }
  const [count, runner] = COMMANDS[command];
  if (words.length !== count) usage(`${command} takes ${count} word${count === 1 ? '' : 's'} after it`);
  if (command === 'open' && !/^https?:\/\//.test(words[0])) usage('open takes an http(s) address');
  return runner;
}

if (isMain(import.meta.url)) {
  const { values: flags, positionals: [command, ...words] } = parseCli({ usage: USAGE, allowPositionals: true, options: { session: { type: 'string' }, 'if-changed': { type: 'boolean' }, username: { type: 'string' }, password: { type: 'string' }, submit: { type: 'string' } } });
  const runner = runnerFor(command, words, flags);
  try {
    await runner(client(flags.session, { retry: command !== 'login' }), words, flags);
    if (QUIET.has(command)) console.log(`BROWSE_DONE=${command}`);
  } catch (error) {
    if (!(error instanceof BrowseError)) throw error;
    console.log(error.needs ? `BROWSE_NEEDS=${error.needs}` : `BROWSE_ERROR=${error.message.replace(/\s+/g, ' ')}`);
    if (error.needs) console.error(error.message);
    process.exitCode = error.needs ? 3 : 1;
  }
}
