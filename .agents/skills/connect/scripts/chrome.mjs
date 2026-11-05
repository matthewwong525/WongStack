#!/usr/bin/env node
// The one way the connect skill touches the person's own Chrome: only tabs it opened, keys hidden from every
// reading, and a key sent to the app unseen. wiki/stack/connect-your-tools.md
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir, userInfo } from 'node:os';
import { join } from 'node:path';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { primaryRoot } from '../../memory/scripts/lib/primary-root.mjs';
import { findKeys, maskKeys, masked } from './mask-keys.mjs';

const USAGE = `usage: chrome.mjs <command>
  attach                       connect to your open Chrome; CHROME=none when none allows it
  open <url>                   a new tab at an https address
  read                         the tab's page, every key hidden
  click <ref> | fill <ref> <text> | select <ref> <value> | wait <ref|ms>
  take-key [<ref>] --tool <id> send a new tool's key, the page's one or the one at <ref>, to the live app;
                               prints only its last four characters
  picture <path>               a picture of the tab, refused while a key shows
  done                         close the tabs it opened and let go of Chrome, which stays open
Every command but attach and open acts on a tab this helper opened, never another.`;
const STEP = 'In Chrome, open chrome://inspect/#remote-debugging, switch it on, then choose Allow when Chrome asks.';
const REF = /^@?e\d+$/;
const TOOL = /^[a-z][a-z0-9-]*$/;
const SIGN_IN = /password|passcode|one-time|verification code|2fa|sign-in code/i;

/** One session per workspace, so each command of one chat finds the same tabs. */
const root = () => { try { return primaryRoot().root; } catch { return process.cwd(); } };
const session = () => `connect-${createHash('sha256').update(root()).digest('hex').slice(0, 10)}`;
const stateFile = () => {
  const dir = join(tmpdir(), `wong-connect-${userInfo().uid}`);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
  return join(dir, `${session()}.json`);
};
/** The target ids of the tabs this helper opened: never a value read from a page. */
const own = () => existsSync(stateFile()) ? JSON.parse(readFileSync(stateFile(), 'utf8')).own : [];
const keep = (ids) => writeFileSync(stateFile(), JSON.stringify({ own: ids }), { mode: 0o600 });

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

/** The active tab, when this helper opened it; anything else is refused. */
function ownTab() {
  const active = tabs().find(tab => tab.active);
  if (!active || !own().includes(active.targetId)) throw new Error('The active tab is not one this helper opened. Open the page with `open <url>`.');
  return active;
}

/** The page's snapshot with every key hidden, and how many it hid. */
function reading(tab) {
  const title = browser(['get', 'title']).trim();
  return maskKeys(browser(['snapshot']), { url: tab.url, title });
}

const ref = (value) => {
  if (!REF.test(value ?? '')) throw new Error(`"${value}" is not a ref from read, such as @e3.`);
  return value.startsWith('@') ? value : `@${value}`;
};

function attach() {
  let list;
  try { list = tabs(); } catch { return `CHROME=none\n${STEP}`; }
  const blank = list.find(tab => tab.active && tab.url === 'about:blank');
  // Attaching opens one blank tab of its own: it is ours, and done closes it.
  if (blank && !own().includes(blank.targetId)) keep([...own(), blank.targetId]);
  return 'CHROME=attached';
}

function open(url) {
  if (!/^https:\/\/[^\s]+$/.test(url ?? '')) throw new Error('open takes one https address.');
  // `tab new`, never `open`: `open` would load the address in whatever tab is in front, maybe the person's.
  const tab = browser(['tab', 'new', url], { json: true });
  keep([...own(), tab.targetId]);
  return `opened ${tab.tabId}`;
}

function fill(target, text) {
  const tab = ownTab();
  const line = reading(tab).text.split('\n').find(row => row.includes(`ref=${target.slice(1)}]`)) ?? '';
  if (SIGN_IN.test(line)) throw new Error('That box takes a password or a sign-in code: ask the person to type it in the tab.');
  return browser(['fill', target, text]);
}

function picture(path) {
  if (reading(ownTab()).found) throw new Error('A key shows on this page, so no picture is taken.');
  return browser(['screenshot', path]);
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

/** What an element shows: an input's value, else its text. */
const field = (what, target) => { try { return String(browser(['get', what, target], { json: true })[what] ?? ''); } catch { return ''; } };
const shownAt = (target) => (field('value', target) || field('text', target)).trim();

/** The one key the page shows; none or several is refused, so the person's choice is never guessed. */
function onlyKey(tab) {
  const keys = findKeys(browser(['snapshot']), { url: tab.url, title: browser(['get', 'title']).trim() });
  if (keys.length !== 1) throw new Error(`${keys.length ? 'Several keys show' : 'No key shows'} on this page: name its box, as take-key @e3 --tool <id>.`);
  return keys[0];
}

/** Reads the key in this process, saves it in the primary checkout's ignored app/.dev.vars, and sends it on stdin to
 *  the live app. Only its last four characters ever print. */
function takeKey(target, tool) {
  if (!TOOL.test(tool ?? '')) throw new Error('take-key needs --tool <id>, in lowercase letters, digits and hyphens.');
  const tab = ownTab();
  const value = target ? shownAt(target) : onlyKey(tab);
  if (value.length < 8 || /\s/.test(value)) throw new Error(`No key shows at ${target}. Read the page again and pick the key's own box.`);
  const name = secretName(tool);
  const { primary, root: worktree } = primaryRoot();
  setVar(join(primary, 'app', '.dev.vars'), name, value);
  const sent = spawnSync(process.execPath, [join(worktree, 'scripts', 'cf-secrets.mjs'), 'put-tool', name],
    { cwd: worktree, input: value, encoding: 'utf8' });
  if (sent.status !== 0) {
    const why = `${sent.stdout}${sent.stderr}`.split(value).join(masked(value)).trim().split('\n').at(-1);
    throw new Error(`${name} is saved on this computer, ends in …${value.slice(-4)}, but not on the live app: ${why}`);
  }
  const ends = `ends in …${value.slice(-4)}`;
  // A put refused while a newer version waits lands on that version: say so, never that the live app has it.
  return /next publish/.test(sent.stdout) ? `${name} saved on this computer, ${ends}; it reaches the live app at the next publish` : `${name} saved, ${ends}`;
}

function done() {
  const mine = own();
  let closed = 0;
  try {
    for (const tab of tabs().filter(tab => mine.includes(tab.targetId)).reverse()) { browser(['tab', 'close', tab.tabId]); closed += 1; }
    browser(['close']);
  } catch { /* Chrome already gone: nothing left of ours to close. */ }
  rmSync(stateFile(), { force: true });
  return `closed ${closed} tab(s); Chrome stays open`;
}

/** Runs one command and returns what the chat may see. */
export function run([command, ...args], { tool } = {}) {
  const [first, second] = args;
  const commands = {
    attach: [0, () => attach()],
    open: [1, () => open(first)],
    read: [0, () => reading(ownTab()).text],
    click: [1, () => { const target = ref(first); ownTab(); return browser(['click', target]); }],
    fill: [2, () => fill(ref(first), second)],
    select: [2, () => { const target = ref(first); ownTab(); return browser(['select', target, second]); }],
    wait: [1, () => { const target = /^\d+$/.test(first ?? '') ? first : ref(first); ownTab(); return browser(['wait', target]); }],
    'take-key': [args.length <= 1 ? args.length : -1, () => takeKey(first === undefined ? null : ref(first), tool)],
    picture: [1, () => picture(first)],
    done: [0, () => done()],
  };
  const entry = Object.hasOwn(commands, command) ? commands[command] : null;
  if (!entry || args.length !== entry[0]) usageError(USAGE);
  return entry[1]();
}

if (isMain(import.meta.url)) {
  const { positionals, values } = parseCli({ usage: USAGE, allowPositionals: true, options: { tool: { type: 'string' } } });
  try {
    // A page's text can hold a key the snapshot did not, so every answer passes the mask once more.
    console.log(maskKeys(String(run(positionals, values)).trimEnd()).text);
  } catch (error) {
    console.error(maskKeys(String(error.message)).text);
    process.exitCode = 1;
  }
}
