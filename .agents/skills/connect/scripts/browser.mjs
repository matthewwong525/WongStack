#!/usr/bin/env node
// The one way the connect skill touches a browser: the person's own Chrome, or on a server the assistant's Camoufox.
// Only pages it opened, keys hidden from every reading, a key sent to the app unseen: wiki/stack/connect-your-tools.md
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir, userInfo } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { client, installed } from '../../browser/scripts/browse.mjs';
import { finished, seen, setLine, startTurn, watchControl } from '../../hand-over/scripts/hand-over.mjs';
import { checkView } from '../../hand-over/scripts/view.mjs';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { primaryRoot } from '../../memory/scripts/lib/primary-root.mjs';
import { findKeys, knownKey, maskKeys, masked } from './mask-keys.mjs';

const USAGE = `usage: browser.mjs <command>
  where                        where to connect, connecting to nothing: WHERE=chrome|server|link
  attach                       connect to your open Chrome; CHROME=none when none allows it, then
                               SERVER=possible when the assistant's browser can be watched here
  attach --server              use the assistant's browser, Camoufox: BROWSER=camoufox, or BROWSE_NEEDS=install
  open <url>                   a new page at an https address
  read                         the page, every key hidden
  click <ref> | fill <ref> <text> | select <ref> <value> | wait <ref|ms>
  take-key [<ref>] --tool <id> send a new tool's key, the page's one or the one at <ref>, to the live app;
                               prints only its last four characters
  picture <path>               a picture of the page, refused while a key shows
  watch                        Camoufox only: open the watch link when the person asks; prints HANDOVER_LINK
  sign-in --tool <title>       Camoufox only: give the person a turn to sign in on the watch link, opening it first
                               when none is open (HANDOVER_LINK, then CONNECT_PAUSED=your-turn)
  done [--stopped]             close the pages it opened and the watch link; the browser stays open
Every command but where, attach and open acts on a page this helper opened, never another. While a watch link is
open, a command the person holds the browser for prints CONNECT_PAUSED=taken-over|your-turn.`;
const STEP = 'In Chrome, open chrome://inspect/#remote-debugging, switch it on, then choose Allow when Chrome asks.';
const REF = /^@?e\d+$/;
const TOOL = /^[a-z][a-z0-9-]*$/;
const SIGN_IN = /password|passcode|one-time|verification code|2fa|sign-in code/i;
const SIGN_IN_PAGE = /password|passcode|sign.?in|log.?in/i;
/** Every box a sign-in asks in, on any of its steps: none may show when a turn ends. */
const SIGN_IN_BOXES = 'input[type=password], input[type=email], input[autocomplete~=username], input[autocomplete~=one-time-code]';
const HAND_OVER = join(dirname(fileURLToPath(import.meta.url)), '../../hand-over/scripts/hand-over.mjs');
const WATCH_NOTE = 'The assistant is connecting your tools.';
const WAIT_MS = 10_000;
const PAUSES = {
  person: ['CONNECT_PAUSED=taken-over', 'The person took over the browser. Run `hand-over.mjs wait` in the background and send the browser nothing until it prints handed-back.'],
  turn: ['CONNECT_PAUSED=your-turn', 'It is the person\'s turn to sign in. Run `hand-over.mjs wait` in the background until it prints signed-in or handed-back.'],
};

/** An error whose first line, a marker such as CONNECT_PAUSED=taken-over, goes to stdout for the chat to act on. */
class Paused extends Error {
  constructor([marker, message]) { super(message); this.marker = marker; }
}

/** One session per workspace, so each command of one chat finds the same pages. */
const root = () => { try { return primaryRoot().root; } catch { return process.cwd(); } };
const session = () => `connect-${createHash('sha256').update(root()).digest('hex').slice(0, 10)}`;
const stateFile = () => {
  const dir = join(tmpdir(), `wong-connect-${userInfo().uid}`);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
  return join(dir, `${session()}.json`);
};
/** The backend and what this helper opened: Chrome's target ids, or Camoufox's last opened address. */
const state = () => existsSync(stateFile()) ? JSON.parse(readFileSync(stateFile(), 'utf8')) : {};
const save = (next) => writeFileSync(stateFile(), JSON.stringify({ ...state(), ...next }), { mode: 0o600 });
/** An attach starts the state afresh: nothing an earlier attach opened, in either browser, is the helper's now. */
const begin = (next) => writeFileSync(stateFile(), JSON.stringify(next), { mode: 0o600 });
const own = () => state().own ?? [];
const keep = (ids) => save({ backend: 'chrome', own: ids });

/** Where a connect can run here: the person's Chrome, the assistant's watched browser, or only the key link. */
export function whereIs({ platform = process.platform, env = process.env, view = checkView } = {}) {
  if (platform === 'linux' && !env.DISPLAY && !env.WAYLAND_DISPLAY) return view({ platform, env }).unsupported ? 'link' : 'server';
  return ['darwin', 'win32', 'linux'].includes(platform) ? 'chrome' : 'link';
}

/** One agent-browser call on the person's running Chrome; without --auto-connect it starts a browser of its own. */
function browser(args, { json = false } = {}) {
  let out;
  try {
    out = execFileSync('agent-browser', ['--auto-connect', '--session', session(), ...(json ? ['--json'] : []), ...args],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    throw new Error(String(error.stderr ?? '').trim().split('\n').at(-1) || said(error.stdout) || 'agent-browser did not answer');
  }
  if (!json) return out;
  const answer = JSON.parse(out);
  if (!answer.success) throw new Error(answer.error ?? 'agent-browser refused');
  return answer.data;
}
/** The error a --json answer names. */
const said = (out) => { try { return JSON.parse(out).error; } catch { return ''; } };

const tabs = () => browser(['tab', 'list'], { json: true }).tabs;

/** What an element shows: an input's value, else its text. */
const field = (what, target) => { try { return String(browser(['get', what, target], { json: true })[what] ?? ''); } catch { return ''; } };

/** The person's Chrome over agent-browser: the tabs it opened, by target id. */
const chrome = {
  /** The active tab, when this helper opened it; anything else is refused. */
  check() {
    const active = tabs().find(tab => tab.active);
    if (!active || !own().includes(active.targetId)) throw new Error('The active tab is not one this helper opened. Open the page with `open <url>`.');
    return active;
  },
  page(tab) {
    const title = browser(['get', 'title']).trim();
    return { text: browser(['snapshot']), url: tab.url, title };
  },
  attach() {
    let list;
    try { list = tabs(); } catch {
      rmSync(stateFile(), { force: true });
      return `CHROME=none\n${STEP}${checkView().unsupported ? '' : '\nSERVER=possible'}`;
    }
    const blank = list.find(tab => tab.active && tab.url === 'about:blank');
    // Attaching opens one blank tab of its own: it is ours, and done closes it.
    begin({ backend: 'chrome', own: blank ? [blank.targetId] : [] });
    return 'CHROME=attached';
  },
  open(url) {
    // `tab new`, never `open`: `open` would load the address in whatever tab is in front, maybe the person's.
    const tab = browser(['tab', 'new', url], { json: true });
    keep([...own(), tab.targetId]);
    return `opened ${tab.tabId}`;
  },
  act: (kind, target, value) => browser([kind, target, ...(value === undefined ? [] : [value])]),
  valueAt: (target) => (field('value', target) || field('text', target)).trim(),
  picture: (path) => browser(['screenshot', path]),
  done() {
    const mine = own();
    let closed = 0;
    try {
      for (const tab of tabs().filter(tab => mine.includes(tab.targetId)).reverse()) { browser(['tab', 'close', tab.tabId]); closed += 1; }
      browser(['close']);
    } catch { /* Chrome already gone: nothing left of ours to close. */ }
    return `closed ${closed} tab(s); Chrome stays open`;
  },
};

/** The assistant's Camoufox over browse.mjs: its own session, whose one page is the helper's. */
const page = () => client(session());
const camoufox = {
  check() {
    if (!state().opened) throw new Error('No page is one this helper opened. Open the page with `open <url>`.');
    return {};
  },
  async page() {
    const { snapshot, url } = await page().snapshot();
    return { text: snapshot, url: url ?? state().opened, title: '' };
  },
  attach() {
    if (!installed()) throw new Paused(['BROWSE_NEEDS=install', 'Camoufox, the assistant\'s browser, is not installed. Ask the person, then run `browse.mjs install`.']);
    begin({ backend: 'camoufox' });
    return 'BROWSER=camoufox';
  },
  async open(url) {
    const landed = await page().open(url);
    save({ opened: url });
    return `opened ${new URL(landed ?? url).host}`;
  },
  async act(kind, target, value) {
    if (kind === 'wait') return /^\d+$/.test(target) ? new Promise(done => setTimeout(done, Number(target), 'Done')) : shows(target);
    await ({ fill: () => page().type(target, value), select: () => page().select(target, value), click: () => page().click(target) })[kind]();
    return 'Done';
  },
  valueAt: (target) => page().valueOf(target).then(value => value.trim(), () => ''),
  async picture(path) {
    writeFileSync(path, await page().png(), { mode: 0o600 });
    return path;
  },
  async done() {
    await page().close();
    return 'closed the page; the browser stays open';
  },
};

/** Waits until the page shows `target`'s ref, or says it never came. */
async function shows(target) {
  const id = target.slice(1);
  for (const end = Date.now() + WAIT_MS; Date.now() < end; await new Promise(done => setTimeout(done, 250))) {
    if ((await page().snapshot()).snapshot.includes(`[${id}]`)) return 'Done';
  }
  throw new Error(`${target} did not show on the page.`);
}

const backend = () => (state().backend === 'camoufox' ? camoufox : chrome);

/** The page's snapshot with every key hidden, and how many it hid. */
async function reading(tab) {
  const { text, url, title } = await backend().page(tab);
  return maskKeys(text, { url, title });
}

const ref = (value) => {
  if (!REF.test(value ?? '')) throw new Error(`"${value}" is not a ref from read, such as @e3.`);
  return value.startsWith('@') ? value : `@${value}`;
};

/** The reading's line for `target`, in either browser's way of writing a ref. */
const lineAt = (text, target) => text.split('\n').find(row => row.includes(`ref=${target.slice(1)}]`) || row.includes(`[${target.slice(1)}]`)) ?? '';

/** Sets the watch link's line, when one is open, from words already masked. */
const tell = (text) => watchControl() && setLine(maskKeys(text).text);

/** Names `target` for the watch link's line, from a masked reading; costs a reading only while a watch is open. */
async function named(tab, target) {
  if (!watchControl()) return '';
  return /"([^"]+)"/.exec(lineAt((await reading(tab)).text, target))?.[1] ?? target;
}

/** Refuses while the person holds the watch link's browser. */
function holding() {
  const holder = watchControl();
  if (PAUSES[holder]) throw new Paused(PAUSES[holder]);
}

function open(url) {
  if (!/^https:\/\/[^\s]+$/.test(url ?? '')) throw new Error('open takes one https address.');
  tell(`Opening ${new URL(url).host}…`);
  return backend().open(url);
}

async function act(kind, target, value) {
  const tab = await backend().check();
  const name = await named(tab, target);
  if (name) tell(kind === 'click' ? `Clicking ${name}…` : `Choosing ${value} in ${name}…`);
  return backend().act(kind, target, value);
}

async function fill(target, text) {
  const tab = await backend().check();
  const line = lineAt((await reading(tab)).text, target);
  if (SIGN_IN.test(line)) throw new Error('That box takes a password or a sign-in code: ask the person to type it in the tab.');
  tell(`Typing in ${/"([^"]+)"/.exec(line)?.[1] ?? target}…`);
  return backend().act('fill', target, text);
}

async function picture(path) {
  const tab = await backend().check();
  if ((await reading(tab)).found) throw new Error('A key shows on this page, so no picture is taken.');
  return backend().picture(path);
}

/** The key's name in the app: `TOOL_` and the id in capitals. */
export const secretName = (id) => `TOOL_${id.toUpperCase().replaceAll('-', '_')}`;

/** Sets `name` in a dotenv file, readable by its owner alone, keeping every other line. */
export function setVar(file, name, value) {
  const lines = existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(line => !line.startsWith(`${name}=`)) : [];
  while (lines.at(-1) === '') lines.pop();
  writeFileSync(file, `${[...lines, `${name}=${value}`].join('\n')}\n`, { mode: 0o600 });
  chmodSync(file, 0o600);
}

/** The one key the page shows, or among several the one that starts like a service's key; none or several is
 *  refused, so the person's choice is never guessed. */
async function onlyKey(tab) {
  const { text, url, title } = await backend().page(tab);
  const found = findKeys(text, { url, title });
  const known = found.filter(knownKey);
  const keys = found.length > 1 && known.length === 1 ? known : found;
  if (keys.length !== 1) throw new Error(`${keys.length ? 'Several keys show' : 'No key shows'} on this page: name its box, as take-key @e3 --tool <id>.`);
  return keys[0];
}

/** This computer's Cloudflare login from the primary `.env`, under the environment's own, so wrangler can save. */
function cloudflareEnv(primary) {
  const file = join(primary, '.env');
  const saved = existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {};
  const login = Object.fromEntries(['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'].filter(name => saved[name]).map(name => [name, saved[name]]));
  return { ...login, ...process.env };
}

/** Reads the key in this process, saves it in the primary checkout's ignored app/.dev.vars, and sends it on stdin to
 *  the live app. Only its last four characters ever print. */
async function takeKey(target, tool) {
  if (!TOOL.test(tool ?? '')) throw new Error('take-key needs --tool <id>, in lowercase letters, digits and hyphens.');
  const tab = await backend().check();
  const value = target ? await backend().valueAt(target) : await onlyKey(tab);
  if (value.length < 8 || /\s/.test(value)) throw new Error(`No key shows at ${target}. Read the page again and pick the key's own box.`);
  const name = secretName(tool);
  const { primary, root: worktree } = primaryRoot();
  setVar(join(primary, 'app', '.dev.vars'), name, value);
  const sent = spawnSync(process.execPath, [join(worktree, 'scripts', 'cf-secrets.mjs'), 'put-tool', name],
    { cwd: worktree, env: cloudflareEnv(primary), input: value, encoding: 'utf8' });
  if (sent.status !== 0) {
    const why = `${sent.stdout}${sent.stderr}`.split(value).join(masked(value)).trim().split('\n').at(-1);
    throw new Error(`${name} is saved on this computer, ends in …${value.slice(-4)}, but not on the live app: ${why}`);
  }
  const ends = `ends in …${value.slice(-4)}`;
  tell(`Key saved, ${ends}`);
  // A put refused while a newer version waits lands on that version: say so, never that the live app has it.
  return /next publish/.test(sent.stdout) ? `${name} saved on this computer, ${ends}; it reaches the live app at the next publish` : `${name} saved, ${ends}`;
}

/** Camoufox only, on a page this helper opened. */
function ownCamoufox() {
  if (backend() !== camoufox) throw new Error('This works only in the assistant\'s browser: run `attach --server` first.');
  return camoufox.check();
}

/** Opens the watch link on the helper's page, its output passed through; true once it is open. */
function openWatch() {
  const opened = spawnSync(process.execPath, [HAND_OVER, 'open', '--watch', '--session', session(), '--note', WATCH_NOTE], { stdio: 'inherit' });
  process.exitCode = opened.status ?? 1;
  return opened.status === 0;
}

/** `watch`: the link, only when the person asks to watch; resolves to nothing to print. */
function watch() {
  ownCamoufox();
  openWatch();
  return '';
}

/** A sign-in turn's finish: the key page's own path, with or without a query, never a wider `**`, and no sign-in box,
 *  so an email-first step at that address, or a key page at a site's root, ends no turn. */
export function signInFinish(opened) {
  const { origin, pathname } = new URL(opened);
  return { until: [`${origin}${pathname}`, `${origin}${pathname}?**`], untilGone: SIGN_IN_BOXES, untilText: null };
}

/** Gives the person a turn to sign in on the watch link, opened first when none is, until the key page shows no
 * sign-in box. A link that does not open passes its own answer, such as HANDOVER_NEEDS, through. */
async function signIn(tool) {
  if (!/^[^\n]{1,60}$/.test(tool ?? '')) throw new Error('sign-in needs --tool <title>, the tool\'s name as the person knows it.');
  const tab = ownCamoufox();
  if (!SIGN_IN_PAGE.test((await reading(tab)).text)) throw new Error('This page shows no sign-in. Read it again.');
  const finish = signInFinish(state().opened);
  // A turn that would end at once ends before the person signs in: refuse it, as a view whose finish holds is.
  if (finished(finish, await seen(page(), finish))) throw new Error('The page already meets the sign-in finish: it is the key page with no sign-in box. Read it again.');
  if (!watchControl() && !openWatch()) return '';
  if (!startTurn(finish, `Sign in to ${tool}. I go on once you're in.`)) throw new Error('The watch link did not stay open: run `sign-in` again.');
  return PAUSES.turn[0];
}

/** Closes the helper's pages and its watch link; `stopped` says the chat stopped the run. */
async function done(stopped) {
  // The watch closes first: its close puts the page back as it found it.
  if (watchControl()) spawnSync(process.execPath, [HAND_OVER, 'close', ...(stopped ? ['--stopped'] : [])], { stdio: 'ignore' });
  let said = '';
  try { said = await backend().done(); } catch { /* the browser already let go of the page */ }
  rmSync(stateFile(), { force: true });
  return said || 'closed the page; the browser stays open';
}

/** Runs one command and resolves to what the chat may see. */
export async function run([command, ...args], { tool, server = false, stopped = false } = {}) {
  const [first, second] = args;
  const commands = {
    where: [0, () => `WHERE=${whereIs()}`],
    attach: [0, () => (server ? camoufox : chrome).attach()],
    open: [1, () => open(first)],
    read: [0, async () => (await reading(await backend().check())).text],
    click: [1, () => act('click', ref(first))],
    fill: [2, () => fill(ref(first), second)],
    select: [2, () => act('select', ref(first), second)],
    wait: [1, async () => { const target = /^\d+$/.test(first ?? '') ? first : ref(first); await backend().check(); return backend().act('wait', target); }],
    'take-key': [args.length <= 1 ? args.length : -1, () => takeKey(first === undefined ? null : ref(first), tool)],
    picture: [1, () => picture(first)],
    watch: [0, () => watch()],
    'sign-in': [0, () => signIn(tool)],
    done: [0, () => done(stopped)],
  };
  const entry = Object.hasOwn(commands, command) ? commands[command] : null;
  if (!entry || args.length !== entry[0] || (server && command !== 'attach') || (stopped && command !== 'done')) usageError(USAGE);
  if (!['where', 'attach', 'watch', 'done'].includes(command)) holding();
  return entry[1]();
}

if (isMain(import.meta.url)) {
  const { positionals, values } = parseCli({ usage: USAGE, allowPositionals: true,
    options: { tool: { type: 'string' }, server: { type: 'boolean' }, stopped: { type: 'boolean' } } });
  try {
    // A page's text can hold a key the snapshot did not, so every answer passes the mask once more.
    const out = String((await run(positionals, values)) ?? '').trimEnd();
    if (out) console.log(maskKeys(out).text);
  } catch (error) {
    if (error.marker) console.log(error.marker);
    console.error(maskKeys(String(error.message)).text);
    process.exitCode = error.marker === 'BROWSE_NEEDS=install' ? 3 : 1;
  }
}
