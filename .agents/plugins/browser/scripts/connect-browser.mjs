#!/usr/bin/env node
// The one way the connect skill touches a browser: the assistant's Camoufox, in a window or watched on a server.
// Only pages it opened, keys hidden from every reading, a key sent to the app unseen: wiki/stack/connect-your-tools.md
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir, userInfo } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { client, installed, windowSetting } from './browse.mjs';
import { setLine, startTurn, watchControl } from '../skills/hand-over/scripts/hand-over.mjs';
import { checkView } from '../skills/hand-over/scripts/view.mjs';
import { isMain, parseCli, usageError } from './lib/cli.mjs';
import { primaryRoot } from './lib/primary-root.mjs';
import { slot } from './lib/profile.mjs';
import { isIgnored } from '../skills/hand-over/scripts/keys.mjs';
import { findKeys, knownKey, maskKeys, masked } from './mask-keys.mjs';

const USAGE = `usage: connect-browser.mjs <command>
  where                        where to connect, connecting to nothing: WHERE=window|server|link
  attach                       use the assistant's browser, Camoufox: BROWSER=camoufox, or BROWSE_NEEDS=install;
                               --server is accepted and changes nothing
  open <url>                   a new page at an https address
  read                         the page, every key hidden
  click <ref> | fill <ref> <text> | select <ref> <value> | wait <ref|ms>
  wait-click                   wait for a click held for the person's turn in another chat's tab: Done once it ran,
                               or No click waits.
  take-key [<ref>] --tool <id> [--id]
                               send a tool's key, the page's one or the one at <ref>, as TOOL_<ID>, or its ID as
                               TOOL_<ID>_ID, by the profile's sendKey; with none, it stays in this computer's
                               ignored .env; prints only its last four characters
  picture <path>               a picture of the page, refused while a key shows
  watch                        open the watch link when the person asks: HANDOVER_LINK, or HANDOVER_VIEW=window
                               and nothing opened where the browser shows in a window
  sign-in --tool <title>       give the person a turn to sign in, in the browser window or on the watch link,
                               opening it first when none is open, then CONNECT_PAUSED=your-turn
  done [--stopped]             close the page it opened and the watch link; the browser stays open
Every command but where, attach and open acts on the page this helper opened, never another. While a watch link is
open, a command the person holds the browser for prints CONNECT_PAUSED=taken-over|your-turn.`;
const REF = /^@?e\d+$/;
const TOOL = /^[a-z][a-z0-9-]*$/;
const SIGN_IN = /password|passcode|one-time|verification code|2fa|sign-in code/i;
const SIGN_IN_PAGE = /password|passcode|sign.?in|log.?in/i;
const HAND_OVER = join(dirname(fileURLToPath(import.meta.url)), '../skills/hand-over/scripts/hand-over.mjs');
const WATCH_NOTE = 'The assistant is connecting your tools.';
const WAIT_MS = 10_000;
const CLICK_WAITS = 'The person is using the browser in another chat\'s tab, so this click runs when their turn ends. Run `browser.mjs wait-click` in the background with the host\'s longest limit, and take no other step until it ends.';
const PAUSES = {
  person: ['CONNECT_PAUSED=taken-over', 'The person took over the browser. Run `hand-over.mjs wait` in the background and send the browser nothing until it prints handed-back.'],
  turn: ['CONNECT_PAUSED=your-turn', 'It is the person\'s turn to sign in. Run `hand-over.mjs wait` in the background until it prints handed-back; in a browser window, run `hand-over.mjs close` once they say done.'],
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
/** What this helper opened: Camoufox's last opened address. */
const state = () => existsSync(stateFile()) ? JSON.parse(readFileSync(stateFile(), 'utf8')) : {};
const save = (next) => writeFileSync(stateFile(), JSON.stringify({ ...state(), ...next }), { mode: 0o600 });
/** An attach starts the state afresh: nothing an earlier attach opened is the helper's now. */
const begin = (next) => writeFileSync(stateFile(), JSON.stringify(next), { mode: 0o600 });

/** Where a connect can run here: the assistant's browser in a window, watched on a server, or only the key link.
 *  Off Linux the browser shows in a window from its next start unless the person turned that off. */
export function whereIs({ platform = process.platform, env = process.env, view = checkView, shown = windowSetting } = {}) {
  const screen = ['darwin', 'win32'].includes(platform) || (platform === 'linux' && Boolean(env.DISPLAY || env.WAYLAND_DISPLAY));
  const how = view({ platform, env });
  if (screen && (how.window || (platform !== 'linux' && shown()))) return 'window';
  return platform === 'linux' && !how.unsupported ? 'server' : 'link';
}

/** The assistant's Camoufox over browse.mjs: its own session, whose one page is the helper's. */
const page = () => client(session());
const camoufox = {
  check() {
    if (!state().opened) throw new Error('No page is one this helper opened. Open the page with `open <url>`.');
  },
  async page() {
    const { snapshot, url } = await page().snapshot();
    return { text: snapshot, url: url ?? state().opened, title: '' };
  },
  attach() {
    if (!installed()) throw new Paused(['BROWSE_NEEDS=install', 'Camoufox, the assistant\'s browser, is not installed. Ask the person, then run `browse.mjs install`.']);
    begin({});
    return 'BROWSER=camoufox';
  },
  async open(url) {
    const landed = await page().open(url);
    save({ opened: url });
    return `opened ${new URL(landed ?? url).host}`;
  },
  async act(kind, target, value) {
    if (kind === 'wait') return /^\d+$/.test(target) ? new Promise(done => setTimeout(done, Number(target), 'Done')) : shows(target);
    if (kind === 'click') return await page().click(target) === 'queued' ? CLICK_WAITS : 'Done';
    await ({ fill: () => page().type(target, value), select: () => page().select(target, value) })[kind]();
    return 'Done';
  },
  /** A click that waited for the person's turn: `Done` once it ran, its error if it failed, or that none waits. */
  waitClick: async () => await page().waitClick() === 'none' ? 'No click waits.' : 'Done',
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

/** The page's snapshot with every key hidden, and how many it hid. */
async function reading() {
  const { text, url, title } = await camoufox.page();
  return maskKeys(text, { url, title });
}

const ref = (value) => {
  if (!REF.test(value ?? '')) throw new Error(`"${value}" is not a ref from read, such as @e3.`);
  return value.startsWith('@') ? value : `@${value}`;
};

/** The reading's line for `target`, in either way of writing a ref. */
const lineAt = (text, target) => text.split('\n').find(row => row.includes(`ref=${target.slice(1)}]`) || row.includes(`[${target.slice(1)}]`)) ?? '';

/** Sets the watch link's line, when one is open, from words already masked. */
const tell = (text) => watchControl() && setLine(maskKeys(text).text);

/** Names `target` for the watch link's line, from a masked reading; costs a reading only while a watch is open. */
async function named(target) {
  if (!watchControl()) return '';
  return /"([^"]+)"/.exec(lineAt((await reading()).text, target))?.[1] ?? target;
}

/** Refuses while the person holds the watch link's browser. */
function holding() {
  const holder = watchControl();
  if (PAUSES[holder]) throw new Paused(PAUSES[holder]);
}

function open(url) {
  if (!/^https:\/\/[^\s]+$/.test(url ?? '')) throw new Error('open takes one https address.');
  tell(`Opening ${new URL(url).host}…`);
  return camoufox.open(url);
}

async function act(kind, target, value) {
  camoufox.check();
  const name = await named(target);
  if (name) tell(kind === 'click' ? `Clicking ${name}…` : `Choosing ${value} in ${name}…`);
  return camoufox.act(kind, target, value);
}

async function fill(target, text) {
  camoufox.check();
  const line = lineAt((await reading()).text, target);
  if (SIGN_IN.test(line)) throw new Error('That box takes a password or a sign-in code: ask the person to type it in the browser.');
  tell(`Typing in ${/"([^"]+)"/.exec(line)?.[1] ?? target}…`);
  return camoufox.act('fill', target, text);
}

async function picture(path) {
  camoufox.check();
  if ((await reading()).found) throw new Error('A key shows on this page, so no picture is taken.');
  return camoufox.picture(path);
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
async function onlyKey() {
  const { text, url, title } = await camoufox.page();
  const found = findKeys(text, { url, title });
  const known = found.filter(knownKey);
  const keys = found.length > 1 && known.length === 1 ? known : found;
  if (keys.length !== 1) throw new Error(`${keys.length ? 'Several keys show' : 'No key shows'} on this page: name its box, as take-key @e3 --tool <id>.`);
  return keys[0];
}

/** With no `sendKey` slot, the key stays in the primary checkout's `.env`, only when Git ignores it. */
function keepHere(name, value, ends) {
  const { primary } = primaryRoot();
  if (!isIgnored(primary, '.env')) throw new Error(`${name} is not saved: .env is not git-ignored here. Add .env to .gitignore first.`);
  setVar(join(primary, '.env'), name, value);
  tell(`Key saved, ${ends}`);
  return `${name} saved on this computer only, ${ends}, in .env`;
}

/** Reads the key here and hands it to the profile's `sendKey`: null once sent, `{ said }` once kept another way, or
 *  `{ code, why }` when refused; with `id`, as the tool's ID. Only its last four characters ever print. */
async function takeKey(target, tool, id) {
  if (!TOOL.test(tool ?? '')) throw new Error('take-key needs --tool <id>, in lowercase letters, digits and hyphens.');
  camoufox.check();
  const value = target ? await camoufox.valueAt(target) : await onlyKey();
  if (value.length < 8 || /\s/.test(value)) throw new Error(`No key shows at ${target}. Read the page again and pick the key's own box.`);
  const name = `${secretName(tool)}${id ? '_ID' : ''}`;
  const ends = `ends in …${value.slice(-4)}`;
  const send = await slot('sendKey');
  if (!send) return keepHere(name, value, ends);
  const answer = await send(name, value);
  if (!answer) {
    tell(`Key sent, ${ends}`);
    return `${name} sent, ${ends}, goes live at the next publish`;
  }
  const hide = text => String(text).split(value).join(masked(value));
  if (answer.said) {
    tell(`Key saved, ${ends}`);
    return `${name} ${hide(answer.said)}`;
  }
  throw new Error(`${name} is saved on this computer, ${ends}, but not sent to the app: ${hide(answer.why)}`);
}

/** Opens the watch link on the helper's page, its output passed through; true once it is open. */
function openWatch() {
  const opened = spawnSync(process.execPath, [HAND_OVER, 'open', '--watch', '--session', session(), '--note', WATCH_NOTE], { stdio: 'inherit' });
  process.exitCode = opened.status ?? 1;
  return opened.status === 0;
}

/** `watch`: the link, only when the person asks to watch; a browser window is in view already, so it opens none. */
function watch() {
  camoufox.check();
  if (checkView().window) return 'HANDOVER_VIEW=window';
  openWatch();
  return '';
}

/** Gives the person a turn to sign in, in the browser window or on the watch link, opened first when none is, until
 * they tap Hand back or say done. A link that does not open passes its answer, such as HANDOVER_NEEDS, through. */
async function signIn(tool) {
  if (!/^[^\n]{1,60}$/.test(tool ?? '')) throw new Error('sign-in needs --tool <title>, the tool\'s name as the person knows it.');
  camoufox.check();
  if (!SIGN_IN_PAGE.test((await reading()).text)) throw new Error('This page shows no sign-in. Read it again.');
  const window = Boolean(checkView().window);
  const already = Boolean(watchControl());
  if (!already && !openWatch()) return '';
  // A Mac's window may sit behind the person's app: the Dock brings it up.
  const dock = process.platform === 'darwin' ? ' If it\'s behind, click Camoufox in the Dock.' : '';
  const note = window ? `Sign in to ${tool} in the browser window, then say done.${dock}` : `Sign in to ${tool}, then tap Hand back.`;
  if (!startTurn(note)) throw new Error('The watch link did not stay open: run `sign-in` again.');
  // A watch opened here printed HANDOVER_VIEW itself; one open already says it again, so the chat names the window.
  return already && window ? `HANDOVER_VIEW=window\n${PAUSES.turn[0]}` : PAUSES.turn[0];
}

/** Closes the helper's page and its watch link; `stopped` says the chat stopped the run. */
async function done(stopped) {
  // The watch closes first: its close puts the page back as it found it.
  if (watchControl()) spawnSync(process.execPath, [HAND_OVER, 'close', ...(stopped ? ['--stopped'] : [])], { stdio: 'ignore' });
  let said = '';
  try { said = await camoufox.done(); } catch { /* the browser already let go of the page */ }
  rmSync(stateFile(), { force: true });
  return said || 'closed the page; the browser stays open';
}

/** Runs one command and resolves to what the chat may see. */
export async function run([command, ...args], { tool, server = false, stopped = false, id = false } = {}) {
  const [first, second] = args;
  const commands = {
    where: [0, () => `WHERE=${whereIs()}`],
    attach: [0, () => camoufox.attach()],
    open: [1, () => open(first)],
    read: [0, async () => { camoufox.check(); return (await reading()).text; }],
    click: [1, () => act('click', ref(first))],
    fill: [2, () => fill(ref(first), second)],
    select: [2, () => act('select', ref(first), second)],
    'wait-click': [0, () => camoufox.waitClick()],
    wait: [1, () => { const target = /^\d+$/.test(first ?? '') ? first : ref(first); camoufox.check(); return camoufox.act('wait', target); }],
    'take-key': [args.length <= 1 ? args.length : -1, () => takeKey(first === undefined ? null : ref(first), tool, id)],
    picture: [1, () => picture(first)],
    watch: [0, () => watch()],
    'sign-in': [0, () => signIn(tool)],
    done: [0, () => done(stopped)],
  };
  const entry = Object.hasOwn(commands, command) ? commands[command] : null;
  const misplaced = (server && command !== 'attach') || (stopped && command !== 'done') || (id && command !== 'take-key');
  if (!entry || args.length !== entry[0] || misplaced) usageError(USAGE);
  // wait-click sends the page nothing: it only claims a click already sent, so a hold never leaves it unclaimed.
  if (!['where', 'attach', 'watch', 'done', 'wait-click'].includes(command)) holding();
  return entry[1]();
}

if (isMain(import.meta.url)) {
  const { positionals, values } = parseCli({ usage: USAGE, allowPositionals: true,
    options: { tool: { type: 'string' }, server: { type: 'boolean' }, stopped: { type: 'boolean' }, id: { type: 'boolean' } } });
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
