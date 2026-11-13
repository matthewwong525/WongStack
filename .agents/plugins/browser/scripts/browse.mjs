#!/usr/bin/env node
// Installs, starts, and drives Camoufox, the browser the agent uses websites in as the person; the only script that
// talks to its server. Exit codes: 0 ok · 1 failed · 2 usage · 3 the browser is not installed. Node built-ins only.
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, parseCli, usageError } from './lib/cli.mjs';
import { NETWORK_FILE, networkLine } from './forwarder.mjs';
import { MOVE_MS } from './login-move.mjs';
import { INTERACTIVE_ROLES, MAX_REFS, SKIP_PATTERNS, parseLine } from './refs.mjs';

const USAGE = `usage: browse.mjs <command> [--session <name>]
  open <url>                    open the page in this task's tab; prints BROWSE_URL=
  snapshot                      the page as text with refs (e1, e2…)
  click <ref-or-selector>       prints BROWSE_CLICK=script when only the page's own script took it; it runs at
                                once, also while the person uses another tab; key or queued come only from an
                                older running browser
  wait-click                    waits for this tab's queued click, at most 3 minutes; prints
                                BROWSE_CLICK=mouse|forced|script, or none (always none from a current browser)
  type <ref-or-selector> <text>
  press <key>
  select <ref-or-selector> <option>
  get url | get count <selector> | get value <ref-or-selector>
                                a selector reads only the main page; a box in a frame needs its ref
  screenshot [--if-changed] [--full-page]
                                prints BROWSE_SHOT=<temp path>, or none when unchanged;
                                --full-page takes the whole page, not just what shows
  save                          keep the sign-ins now, with every tab open
  front                         bring this task's tab to the front of the browser's window; prints
                                BROWSE_FRONT=yes, or behind while the person uses another tab, which stays in front
  show                          front, with no turn held, to show the person a page;
                                prints BROWSE_SHOWN=window|link|none, and BROWSE_FRONT=behind as front does
  window [on|off]               show the browser in a window on this computer's screen, from its next start;
                                on Linux, off (or no screen) sends a live-view link instead;
                                prints BROWSE_WINDOW=on|off; alone, the setting (on unless turned off)
  proxy [on|off]                reach sites through a local proxy on this computer, and on through the saved
                                first and backup proxies, from the browser's next start; prints
                                BROWSE_PROXY=on|off; alone, the setting (off unless turned on)
  close                         close this task's tab
  status | install | stop       the install and the server; status prints both settings, BROWSE_NETWORK=
                                the route in use, BROWSE_SHOWN=window|link|none for a running browser, and
                                BROWSE_ADDON=<name> for each add-on added
  addon find <name>             up to three Firefox add-ons: BROWSE_ADDON_FOUND=<slug> | <name> | <maker> |
                                <website> | <daily users> | featured or not; BROWSE_ADDON_WARN=<slug> when
                                not featured and under 10,000 daily users; BROWSE_ADDON_BUILT_IN=<slug> when
                                the browser ships it already
  addon add <slug>              add any add-on after the person's yes, its file checked, beside the others and in
                                place of the person's own copy of it; the browser stops so the next command
                                starts with it; BROWSE_ADDON_TELL= is what to tell the person; refuses one the
                                browser ships
  addon open                    open the newest password manager's page, else the newest add-on's, in this
                                task's tab, for the person in a live view
  addon logins                  the logins the password manager offers for this page, by name only, opening its
                                list by its icon in the login box when needed: BROWSE_ADDON_LOGIN=<n> | <name>
                                each, <n> | passkey: <name> for its passkey box, or BROWSE_ADDON_LOGIN=locked|none
  addon pick <n>                after the person's yes, pick login or passkey <n> from what addon logins read on
                                this page in the last 2 minutes, once; prints BROWSE_ADDON_PICKED=filled|passkey
  addon close                   close the password manager's boxes over the page, such as Save login?, by their
                                own close button, saving nothing; prints BROWSE_ADDON_CLOSED=<count>
  addon status                  BROWSE_ADDON=<name> for each added add-on, or BROWSE_ADDON=none
  addon remove [<name>]         take out the add-on its slug or name names, with its stored data; no name
                                takes out the only one`;

/** The only versions installed, moved together: the library's disguise is made for the build it pins, and
 * launch-config.py refuses a start when the library, its pin and the installed build disagree. */
export const CAMOUFOX = { python: '0.5.9', build: 'v158.0.1-beta.41' };
const CHECKS = ['checkbox', 'radio', 'switch', 'menuitemcheckbox'];
const SCRIPT_CLICK_NOTE = 'The click reached the page only through its own script, which a site may ignore: read the page again, then offer the live view that stays open, not more clicks.';
const QUEUED_NOTE = 'An older running browser holds this click for the person\'s turn in another chat\'s tab. Run `browse.mjs wait-click` in the background, and take no other step on this page until it ends; it stops by itself after 3 minutes.';
const BEHIND_NOTE = 'The person is using the browser in another chat\'s tab, so that tab stays in front. This tab keeps working behind it; run front again once their turn ends.';
export const NO_REF_NOTE = '- note: some boxes have no ref; read the page again or use a selector';
const NEEDS = 'the browser, Camoufox, is not installed. It needs Python 3.10 or newer, about 3 GB of disk, and about 700 MB of memory while it runs. Ask the person, then run `browse.mjs install`.';
const PYTHON_NEEDS = 'the browser needs Python 3.10 or newer with its venv module, and this computer has none. Install it (Debian or Ubuntu: `sudo apt install python3 python3-venv`), then run `browse.mjs install`.';
const USER = 'me';
const DIR = join(homedir(), '.wong-stack', 'camoufox');
/** The browser's files. A venv per library version keeps the last one until a new one installs and checks. */
export const FILES = {
  server: join(DIR, 'server.json'), key: join(DIR, 'api-key'), lock: join(DIR, 'start.lock'), tmp: join(DIR, 'tmp'), tabs: join(DIR, 'tabs'),
  profile: join(DIR, 'profile'), cache: join(DIR, 'cache'), marker: join(DIR, 'migrated'), fingerprint: join(DIR, 'fingerprint.json'), venv: join(DIR, 'venv', CAMOUFOX.python),
  settings: join(homedir(), '.wong-stack', 'browser-settings.json'),
  addons: join(DIR, 'addons'), added: join(DIR, 'addons.json'), log: join(DIR, 'server.log'),
  handBack: join(homedir(), '.wong-stack', 'browser', 'hand-back'),
};
/** The old camofox browser's profiles, read once for the login move. */
export const OLD_PROFILES = join(homedir(), '.wong-stack', 'camofox', 'profiles');
const PYTHON = join(FILES.venv, 'bin', 'python');
const LAUNCH_CONFIG = fileURLToPath(new URL('./launch-config.py', import.meta.url));
// BROWSE_SERVER_SCRIPT is for tests only: a stand-in server, so no real browser starts.
const SERVER_SCRIPT = process.env.BROWSE_SERVER_SCRIPT || fileURLToPath(new URL('./browser-server.mjs', import.meta.url));
const ms = (name, normal) => Number(process.env[name] ?? normal);
const SETTLE_MS = ms('BROWSE_SETTLE_MS', 8000);
const SETTLE_GAP_MS = ms('BROWSE_SETTLE_GAP_MS', 1000);
const COMMAND_MS = ms('BROWSE_COMMAND_MS', 45_000);
// How long wait-click waits for a click an older running browser holds for another chat's turn.
const CLICK_WAIT_MS = ms('BROWSE_CLICK_WAIT_MS', 3 * 60_000);
const CLICK_WAITS_TOO_LONG = 'the click still waits for another chat\'s turn in an older browser; it stops by itself once idle, or ask the person to hand back';
/** A start's parts: the launch config, the browser's launch, then the login move; a start waits for all three. */
export const CONFIG_MS = 180_000;
export const LAUNCH_MS = 60_000;
const START_MS = ms('BROWSE_START_MS', CONFIG_MS + LAUNCH_MS + MOVE_MS + 30_000);
const INSTALL_MS = 30 * 60_000;
const sleep = wait => new Promise(done => setTimeout(done, wait));

/** A stop with a plain reason. `status` is the server's HTTP status; `needs` is what to install. */
export class BrowseError extends Error {
  constructor(reason, { status = null, timedOut = false, needs = null, addonPage = false, size = null } = {}) {
    super(reason);
    Object.assign(this, { status, timedOut, needs, addonPage, size });
  }
}

/** The session a task's tab is keyed by: the name given, else the checkout's folder name. */
export function sessionName(given) {
  const top = given ?? spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).stdout?.trim();
  return basename(top || process.cwd()).replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 64) || 'default';
}

/** A snapshot ref (`e12` or `@e12`) or a selector, as the server's routes take it. */
export function targetOf(target) {
  return /^@?e\d+$/.test(target) ? { ref: target.replace(/^@/, '') } : { selector: target };
}

/** What a field holds, read from a snapshot: a text box's text or a dropdown's picked choice; null with no such ref. */
export function valueIn(snapshot, ref) {
  const lines = snapshot.split('\n');
  const at = lines.findIndex(line => line.includes(`[${ref}]`));
  if (at < 0) return null;
  const inline = /\[e\d+\](?: \[[^\]]*\])*: (.*)$/.exec(lines[at]);
  if (inline) return inline[1].replace(/^"(.*)"$/, '$1');
  const depth = lines[at].search(/\S/);
  // A box with a placeholder shows its text as a child line instead of after its ref.
  const box = boxOf(lines[at]);
  for (const line of lines.slice(at + 1)) {
    if (line.search(/\S/) <= depth) break;
    const text = box && valueLine(line, box);
    if (text) return text[2].replace(/^"(.*)"$/, '$1');
    const picked = /option "([^"]*)".*\[selected\]/.exec(line);
    if (picked) return picked[1];
  }
  return '';
}

/** A secret box's name, in the words sites use: a password, PIN, card, or one-time code. */
const SECRET_NAME = /password|passcode|passwort|\bpin\b|card (?:number|no\b)|\bcvc\b|\bcvv\b|\bcsc\b|security code|expir|one-time|verification code|\botp\b/i;
/** A secret box by its kind: a password, card, or one-time code box. */
const SECRET_FIELDS = ['input[type=password]', ...['cc-number', 'cc-csc', 'cc-exp', 'cc-exp-month', 'cc-exp-year', 'one-time-code'].map(kind => `[autocomplete~="${kind}"]`)].join(', ');
/** A snapshot line: its indent, its start quoted or bare, and its value, or a lone `:` when it sits on a child line. */
const LINE = /^(\s*)- (?:'((?:[^']|'')*)'(?: \[[^\]]*\])*|([^'].*?))(?:: (.*)|(:))?$/;
/** A box's start: its role, its name, and its marks, the server's ref among them. A dropdown is a combobox too, but its
 * pick sits on an option line, which no rule here hides. */
const BOX_KEY = /^(?:textbox|searchbox|spinbutton|combobox)(?: "((?:[^"\\]|\\.)*)")?(?: \[[^\]]*\])*$/;
/** The values of the page's secret boxes, dropdowns left out, in the page, same-origin frames, and shadow roots. */
export const SECRETS_SCRIPT = `(() => { const found = []; const walk = root => { for (const field of root.querySelectorAll(${JSON.stringify(SECRET_FIELDS)})) if (field.tagName !== 'SELECT' && field.value) found.push(field.value); for (const inner of root.querySelectorAll('*')) { if (inner.shadowRoot) walk(inner.shadowRoot); try { if (inner.contentDocument) walk(inner.contentDocument); } catch { /* another site's frame */ } } }; walk(document); return found; })()`;
/** What a page script returns for a selector the page can not read, as one naming a box inside a frame. */
export const BAD_SELECTOR = 'browse:bad-selector';
/** The plain stop for that selector. */
export const selectorError = selector => new BrowseError(`${selector} is not a selector this page can read; a selector reads only the main page, so use the box's ref`);
/** Reads one field by selector: a dropdown's picked choice, `[hidden]` for a filled secret box, else its text. */
export const fieldScript = selector => `(() => { let field; try { field = document.querySelector(${JSON.stringify(selector)}); } catch (error) { if (error.name === 'SyntaxError') return ${JSON.stringify(BAD_SELECTOR)}; throw error; } return (field => field && (field.tagName === 'SELECT' ? field.selectedOptions[0]?.label ?? '' : field.value && (field.matches(${JSON.stringify(SECRET_FIELDS)}) || ${SECRET_NAME}.test([field.getAttribute('aria-label'), field.placeholder, field.title, ...(field.getAttribute('aria-labelledby') ?? '').split(/\\s+/).filter(Boolean).map(id => field.getRootNode().getElementById?.(id)?.textContent), ...[...(field.labels ?? [])].map(label => label.textContent)].join(' '))) ? '[hidden]' : field.value))(field) ?? null; })()`;
/** Counts a selector's matches in the main page. */
export const countScript = selector => `(() => { try { return document.querySelectorAll(${JSON.stringify(selector)}).length; } catch (error) { if (error.name === 'SyntaxError') return ${JSON.stringify(BAD_SELECTOR)}; throw error; } })()`;

/** A box's text as the snapshot quotes it, unquoted, with its spaces as Playwright collapses them. */
function plain(text) {
  let unquoted = text;
  if (/^".*"$/.test(text)) try { unquoted = JSON.parse(text); } catch { unquoted = text.slice(1, -1); }
  return squash(unquoted);
}

const squash = text => text.replace(/\s+/g, ' ').trim();

/** A box line's indent, name, and inline value, else null. Playwright single-quotes a start whose name holds `: `,
 * ` #`, `{`, `}` or a backtick, and the server gives that line no ref. */
function boxOf(line) {
  const parts = LINE.exec(line);
  const box = parts && BOX_KEY.exec(parts[3] ?? parts[2].replaceAll("''", "'"));
  return box ? { indent: parts[1].length, name: box[1] ?? '', value: parts[4], children: Boolean(parts[5]) } : null;
}

/** A box's value on its own child line, as Playwright prints it beside a `/placeholder` line. */
const valueLine = (line, box) => line.search(/\S/) === box.indent + 2 ? /^(\s*- text: )(.+)$/.exec(line) : null;

/** The snapshot with each filled secret box's value shown as `[hidden]`: a box named like one, or one holding a value
 * in `secretValues`. Every other line reads as given. */
export function hideSecrets(snapshot, secretValues = []) {
  const secrets = new Set(secretValues.map(plain).filter(Boolean));
  const secret = (box, value) => SECRET_NAME.test(box.name) || secrets.has(plain(value));
  const lines = snapshot.split('\n');
  lines.forEach((line, at) => {
    const box = boxOf(line);
    if (box?.value && secret(box, box.value)) lines[at] = `${line.slice(0, -box.value.length)}[hidden]`;
    for (let next = at + 1; box?.children && lines[next]?.search(/\S/) > box.indent; next++) {
      const text = valueLine(lines[next], box);
      if (text && secret(box, text[2])) lines[next] = `${text[1]}[hidden]`;
    }
  });
  return lines.join('\n');
}

/** A long page whole again. Past 80,000 characters the server sends a page in pieces, each its part, a marker, and the
 * page's last 5,000 characters; a raw join would cut a line, a secret box's among them, past hiding. */
export function joinPieces(pieces) {
  const total = pieces[0].totalChars;
  const unknown = () => new BrowseError('the browser sent a long page in pieces this script can not join');
  let whole = '';
  let tail = null;
  for (const { snapshot: text = '', hasMore, nextOffset } of pieces) {
    if (hasMore) {
      const marker = `\n[... truncated at char ${nextOffset} of ${total}. Call snapshot with offset=${nextOffset} to see more. Pagination links below. ...]\n`;
      const cut = nextOffset - whole.length;
      if (text.slice(cut, cut + marker.length) !== marker || (tail !== null && text.slice(cut + marker.length) !== tail)) throw unknown();
      tail = text.slice(cut + marker.length);
      whole += text.slice(0, cut);
    } else {
      if (tail === null || !text.endsWith(`\n${tail}`)) throw unknown();
      whole += text.slice(0, -tail.length - 1);
      // The last part can stop short of the repeated end; the end finishes it.
      whole += tail.slice(tail.length - (total - whole.length));
    }
  }
  if (whole.length !== total) throw unknown();
  return whole;
}

// A line's role and name as the server reads them, its ref mark where it writes one, and a frame block's first line.
const FRAME = /^- iframe "[^\n]*":$/;

/** The ref the server marked on `line`'s box, right after its name, or null. */
const refOf = line => {
  const box = parseLine(line);
  return (box && /^ \[(e\d+)\]/.exec(line.slice(box.at))?.[1]) ?? null;
};
/** `line` with its box's ref taken off. */
const unmark = line => {
  const box = parseLine(line);
  return box ? line.slice(0, box.at) + line.slice(box.at).replace(/^ \[e\d+\]/, '') : line;
};
/** `line` with its box marked `ref`. */
const remark = (line, ref) => {
  const bare = unmark(line);
  const { at } = parseLine(bare);
  return `${bare.slice(0, at)} [${ref}]${bare.slice(at)}`;
};

/** The `role:name` the server numbers a line by, or null for a line it gives no ref. */
function refKey(line) {
  const box = parseLine(line);
  if (!box || !INTERACTIVE_ROLES.includes(box.role) || (box.name && SKIP_PATTERNS.some(skip => skip.test(box.name)))) return null;
  return `${box.role}:${box.name}`;
}

/** Page text whose refs act on the line they mark: frame pages renumber in the server's order; if `refsCount`
 * disagrees, marks shared across blocks go, and on any page so does a main-page mark that isn't the line's place. */
export function relabel(snapshot, refsCount) {
  const lines = snapshot.split('\n');
  const keys = lines.map(refKey);
  const frames = lines.map((line, at) => FRAME.test(line) && lines[at + 1]?.startsWith('  '));
  const firstFrame = frames.indexOf(true);
  const count = keys.filter(Boolean).length;
  if (firstFrame >= 0 && count === refsCount && count <= MAX_REFS) {
    let next = 0;
    return lines.map((line, at) => (keys[at] ? remark(line, `e${++next}`) : line)).join('\n');
  }
  // The server numbers the main page first: a frame it counted but didn't print leaves its ref on a main-page namesake.
  // A windowed read, with no count, skips this; a page with nothing dropped reads byte for byte.
  const mainEnd = refsCount == null ? 0 : firstFrame >= 0 ? firstFrame : lines.length;
  const wrong = new Set();
  let place = 0;
  lines.slice(0, mainEnd).forEach((line, at) => {
    if (!keys[at]) return;
    place++;
    const mark = refOf(line);
    if (mark && mark !== `e${place}`) wrong.add(at);
  });
  if (firstFrame < 0 && !wrong.size) return snapshot;
  const blocks = new Map();
  let block = 0;
  lines.forEach((line, at) => {
    if (frames[at]) block++;
    if (keys[at]) blocks.set(keys[at], (blocks.get(keys[at]) ?? new Set()).add(block));
  });
  return [...lines.map((line, at) => (wrong.has(at) || blocks.get(keys[at])?.size > 1 ? unmark(line) : line)), NO_REF_NOTE].join('\n');
}

/** The main page's frames as `[name, src]`, to tell each frame block's site; the browser names a frame with no
 * `name` by its `id`. */
export const FRAMES_SCRIPT = `[...document.querySelectorAll('iframe')].map(frame => [frame.getAttribute('name') || frame.id, frame.src])`;
/** A frame label as the server cleans it. */
const cleanLabel = label => label.replace(/card-fields-/, '').replace(/-[a-z0-9]{10,}$/, '');
const rawHost = url => { try { return new URL(url).hostname.toLowerCase(); } catch { return ''; } };

/** A URL's host, lowercased, with `www.` stripped; '' when it isn't an http(s) URL. */
export function hostOf(url) {
  try {
    const { protocol, hostname } = new URL(url);
    return /^https?:$/.test(protocol) ? hostname.toLowerCase().replace(/^www\./, '') : '';
  } catch {
    return '';
  }
}

/** Each frame block's label in the server's page text, mapped to its site's host, or '' when it can't be told: a label
 * that is no iframe's cleaned name or host, or that two iframes on different hosts share. */
export function frameSites(snapshot, frames) {
  const sites = new Map();
  for (const line of snapshot.split('\n')) {
    const label = FRAME.test(line) && /^- iframe "(.*)":$/.exec(line)[1];
    if (!label || sites.has(label)) continue;
    const hosts = new Set(frames.filter(([name, src]) => (name ? cleanLabel(name) : cleanLabel(rawHost(src))) === label).map(([, src]) => hostOf(src)));
    sites.set(label, hosts.size === 1 ? [...hosts][0] : '');
  }
  return sites;
}

/** The page text with each frame header naming its site, and a first-line note when a frame holds refs. */
export function labelFrames(snapshot, sites) {
  const listed = [];
  let block = null;
  const lines = snapshot.split('\n').map(line => {
    const label = FRAME.test(line) ? /^- iframe "(.*)":$/.exec(line)[1] : null;
    if (label !== null) {
      const site = sites.get(label) || 'unknown site';
      block = `${label} (${site})`;
      return `- iframe "${label}" (${site}):`;
    }
    if (!/^\s/.test(line)) block = null;
    else if (block && /\[e\d+\]/.test(line) && !listed.includes(block)) listed.push(block);
    return line;
  });
  if (listed.length) lines.unshift(`- note: boxes in frames are at the end: ${listed.join(', ')}`);
  return lines.join('\n');
}

/** Each tick box, radio, and switch in a snapshot by ref: `[role, name, ticked]`, ticked true, false, or `'mixed'`. */
export function boxesIn(snapshot) {
  const boxes = {};
  for (const line of snapshot.split('\n')) {
    const [, role, name = '', ref, rest] = /^\s*-\s+(\w+)(?:\s+"([^"]*)")? \[(e\d+)\](.*)$/.exec(line) ?? [];
    if (!CHECKS.includes(role)) continue;
    const ticked = /\[checked(?:=(\w+))?\]/.exec(rest);
    boxes[ref] = [role, name, ticked ? ticked[1] ?? true : false];
  }
  return boxes;
}

/** Each ref's box in a snapshot, `{e12: [role, name]}`: a later snapshot with another box at a ref has renumbered. */
export function refNames(snapshot) {
  const names = {};
  for (const line of snapshot.split('\n')) {
    const ref = refOf(line);
    const { role, name } = ref ? parseLine(line) : {};
    if (ref) names[ref] = [role, name];
  }
  return names;
}

/** A selector's element as `[role, '', ticked]` when it is a tick box, radio, or switch, else null, also when the
 * server's click and focus would take different matches. It runs in the page, so it uses nothing outside itself. */
export function boxAt(document, selector, checks) {
  let found;
  try { found = [...document.querySelectorAll(selector)]; } catch { return null; }
  // The server's click takes the only visible match when exactly one is, a selector list left alone
  // (`visibleSelectorCandidate`), else the first. Visible is Playwright's: a size, and shown.
  const visible = element => {
    const { width, height } = element.getBoundingClientRect();
    return width > 0 && height > 0 && document.defaultView.getComputedStyle(element).visibility === 'visible';
  };
  const shown = found.length > 1 && !selector.includes(',') ? found.filter(visible) : [];
  // The server's keyboard focus takes the first match, so a visible pick behind it gets no read, and so no Space retry.
  if (shown.length === 1 && shown[0] !== found[0]) return null;
  const box = found[0];
  const native = /^(checkbox|radio)$/.test(box?.type) && box.tagName === 'INPUT';
  const role = box?.getAttribute('role') || (native ? box.type : '');
  if (!checks.includes(role)) return null;
  const aria = box.getAttribute('aria-checked');
  return [role, '', native ? box.checked : aria === 'mixed' ? 'mixed' : aria === 'true'];
}

/** True when `now`, a box's state after a click, shows the click took: a radio picked, else any change. Another role or
 * name means the server renumbered and the ref holds another thing: a change, so Space never lands on it. */
export function boxChanged(before, now) {
  if (!now || now[0] !== before[0] || now[1] !== before[1]) return true;
  return before[0] === 'radio' ? now[2] === true : now[2] !== before[2];
}

/** The small environment Python runs in. The library copies it into the browser's, and with no `XDG_CACHE_HOME`
 * of its own it deletes `~/.cache/camoufox`, the old camofox build's folder. */
export function pythonEnv(env = process.env) {
  return { PATH: env.PATH ?? '/usr/bin:/bin', HOME: homedir(), LANG: 'C.UTF-8', XDG_CACHE_HOME: FILES.cache, TMPDIR: FILES.tmp };
}

/** launch-config.py's answer for `args`: `{library, build, ...}`, or `{error, needs}`. With no venv, the library
 * is missing. It runs without blocking, since its country lookup goes through this process's forwarder. */
export async function launchConfig(args, { python = PYTHON } = {}) {
  if (!existsSync(python)) return { error: 'the camoufox library is not installed', needs: 'library' };
  const child = spawn(python, ['-I', LAUNCH_CONFIG, '--library', CAMOUFOX.python, '--build', CAMOUFOX.build, ...args], { env: pythonEnv(), stdio: ['ignore', 'pipe', 'pipe'], timeout: CONFIG_MS });
  let out = '';
  let err = '';
  child.stdout.on('data', chunk => { out += chunk; });
  child.stderr.on('data', chunk => { err = (err + chunk).slice(-4000); });
  await new Promise(done => { child.once('close', done); child.once('error', done); });
  try { return JSON.parse(out.trim().split('\n').at(-1)); } catch { return { error: `the launch config gave no answer${err ? `: ${err.trim().split('\n').at(-1)}` : ''}`, needs: null }; }
}

/** The `BROWSE_INSTALLED=` value for a `--check` answer. */
export function installedLine(check) {
  if (!check) return 'no';
  if (check.error) return `no (${check.error}; the ${check.needs ?? 'browser'} part needs \`browse.mjs install\`)`;
  return `yes camoufox ${check.build} library ${check.library}`;
}

const readJson = file => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } };
const alive = pid => { try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; } };
const tabFile = session => join(FILES.tabs, `${session}.json`);
export const installed = () => existsSync(PYTHON);
/** The browser server's process id as last recorded, or null. */
export const serverPid = () => readJson(FILES.server)?.pid ?? null;
/** The X display the running browser draws on, as its server recorded it, or null. */
export const serverDisplay = () => readJson(FILES.server)?.display ?? null;
/** True when the running browser shows in a window on this computer's own screen, as its server recorded it. */
export const serverWindow = () => readJson(FILES.server)?.window === true;
/** How a running browser's `record` shows it to the person: a window, a live-view link, or none. */
const shownAs = record => (record?.window ? 'window' : record?.display ? 'link' : 'none');
/** Whether the browser shows in a window from its next start: on unless the person turned it off. */
export const windowSetting = () => readJson(FILES.settings)?.window !== false;
/** Whether the browser reaches sites through the local proxy from its next start: off unless turned on. */
export const proxySetting = () => readJson(FILES.settings)?.proxy === true;
const SETTINGS = { window: windowSetting, proxy: proxySetting };
const NEXT_START = 'This takes effect the next time the browser starts; a running browser stays as it is.';

function privateDirs() {
  for (const dir of [DIR, FILES.tmp, FILES.tabs, FILES.profile, FILES.cache]) mkdirSync(dir, { recursive: true, mode: 0o700 });
}

/** The first Python 3.10 or newer on PATH that can make a venv, or null. */
export function findPython(names = ['python3', 'python3.14', 'python3.13', 'python3.12', 'python3.11', 'python3.10', 'python']) {
  const probe = 'import sys, venv, ensurepip; sys.exit(0 if sys.version_info >= (3, 10) else 1)';
  return names.find(name => spawnSync(name, ['-I', '-c', probe], { stdio: 'ignore', timeout: 20_000 }).status === 0) ?? null;
}

/** Installs the pinned library in its own venv, then the build it pins, then checks both. */
async function install() {
  const system = findPython();
  if (!system) throw new BrowseError(PYTHON_NEEDS, { needs: 'python' });
  privateDirs();
  const run = (command, args, what) => {
    const done = spawnSync(command, args, { stdio: ['ignore', 2, 2], env: pythonEnv(), timeout: INSTALL_MS });
    if (done.status !== 0) throw new BrowseError(`the install failed at ${what}; see the lines above`);
  };
  if (!installed()) run(system, ['-m', 'venv', FILES.venv], 'the Python venv');
  run(PYTHON, ['-m', 'pip', 'install', '--disable-pip-version-check', '--quiet', `camoufox[geoip]==${CAMOUFOX.python}`], 'the camoufox library');
  run(PYTHON, ['-m', 'camoufox', 'fetch'], 'the Camoufox build');
  const check = await launchConfig(['--check']);
  if (check.error) throw new BrowseError(`the install finished, but ${check.error}`);
  // A running browser may be another chat's: its next start makes the default add instead.
  if (!(await liveServer())) await (await import('./addons.mjs')).addDefault().catch(() => null);
  console.log(`BROWSE_INSTALLED=${installedLine(check)}`);
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
    // A server still starting answers 503, so only an ok answer counts.
    if (!(await fetch(`http://127.0.0.1:${info.port}/health`, { signal: AbortSignal.timeout(2000) })).ok) return null;
  } catch {
    return null;
  }
  return { port: info.port, key: apiKey() };
}

/** Polls until `end`: `{ live }` once the server answers, `{ died }` if `pid` exits first, else `{}`. */
async function awaitServer(pid, end) {
  while (Date.now() < end) {
    const live = await liveServer();
    if (live) return { live };
    if (!alive(pid)) return { died: true };
    await sleep(200);
  }
  return {};
}

/** Takes the start lock; false when another task is starting the server. A lock left by a dead start is cleared. */
function takeLock() {
  try {
    if (Date.now() - statSync(FILES.lock).mtimeMs > 2 * START_MS) rmSync(FILES.lock, { recursive: true, force: true });
  } catch { /* no lock */ }
  try { mkdirSync(FILES.lock); return true; } catch { return false; }
}

/** Starts the server, holding the lock. A start that dies before answering, as on a taken port,
 * is tried on a new port, three starts in all; a slow one is not. */
async function spawnServer() {
  // Another task may have started the server between this task's look and its lock.
  const running = await liveServer();
  if (running) return running;
  const end = Date.now() + START_MS;
  for (let tries = 0; tries < 3; tries++) {
    const port = await freePort();
    apiKey();
    const child = spawn(process.execPath, [SERVER_SCRIPT], { cwd: DIR, detached: true, stdio: 'ignore', env: { ...process.env, BROWSE_SERVER_PORT: String(port), TMPDIR: FILES.tmp } });
    child.unref();
    writeFileSync(FILES.server, `${JSON.stringify({ pid: child.pid, port })}\n`, { mode: 0o600 });
    const { live, died } = await awaitServer(child.pid, end);
    if (live) return live;
    if (!died) await terminate(child.pid);
    // The server leaves its reason when the browser itself failed; only a start with none is tried again.
    const reason = readJson(FILES.server)?.error;
    rmSync(FILES.server, { force: true });
    if (reason) throw new BrowseError(`the browser did not start: ${reason}`);
    if (!died) break;
  }
  throw new BrowseError('the browser did not start');
}

/** A live server, else one this task starts. While another task holds the start, it looks again;
 * if that start fails, this task takes it over. */
async function startServer() {
  if (!installed()) throw new BrowseError(NEEDS, { needs: 'install' });
  privateDirs();
  // A library, pin and build that disagree would send a disguise made for another build, so nothing starts.
  const check = await launchConfig(['--check']);
  if (check.error) throw new BrowseError(`the browser will not start: ${check.error}; run \`browse.mjs install\``);
  const end = Date.now() + START_MS;
  do {
    const live = await liveServer();
    if (live) return live;
    if (takeLock()) {
      try {
        return await spawnServer();
      } finally {
        rmSync(FILES.lock, { recursive: true, force: true });
      }
    }
    await sleep(200);
  } while (Date.now() < end);
  throw new BrowseError('the browser did not start');
}

async function terminate(pid) {
  if (pid && alive(pid)) {
    process.kill(pid, 'SIGTERM');
    for (let i = 0; i < 100 && alive(pid); i++) await sleep(100);
    if (alive(pid)) process.kill(pid, 'SIGKILL');
  }
}

/** Stops the browser and its server; the next command starts them again. */
export async function stopServer() {
  await terminate(readJson(FILES.server)?.pid);
  rmSync(FILES.server, { force: true });
}

async function stop() {
  await stopServer();
  console.log('BROWSE_SERVER=stopped');
}

async function status() {
  const check = installed() ? await launchConfig(['--check']) : null;
  console.log(`BROWSE_INSTALLED=${installedLine(check)}`);
  const running = (await liveServer()) ? readJson(FILES.server) : null;
  console.log(`BROWSE_SERVER=${running ? 'running' : 'stopped'}`);
  if (!check || check.error) return;
  for (const [name, read] of Object.entries(SETTINGS)) console.log(`BROWSE_${name.toUpperCase()}=${read() ? 'on' : 'off'}`);
  console.log(`BROWSE_NETWORK=${networkLine(readJson(NETWORK_FILE), running?.pid ?? null)}`);
  if (running) {
    console.log(`BROWSE_SHOWN=${shownAs(running)}`);
    // A browser from before the proxy setting started with the proxy.
    const differs = (running.windowSetting ?? running.window === true) !== windowSetting() || (running.proxy ?? true) !== proxySetting();
    if (differs) console.log(`The running browser started with other settings. ${NEXT_START}`);
  }
  for (const name of (await import('./addons.mjs')).addonStatus()) console.log(`BROWSE_ADDON=${name}`);
}


/** One call to the server, with a deadline. A refusal throws a BrowseError with the server's reason, or with
 * none of its words when `quiet`: a failed typing step can quote what was typed. */
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
  const answer = await response.json().catch(() => ({}));
  const reason = quiet ? '' : answer.error ?? '';
  // `addonPage`: the tab shows the password manager's page, which the agent can not read; `size` is the page's own.
  const size = answer.addonPage === true && Array.isArray(answer.size) ? answer.size : null;
  throw new BrowseError(reason || `the browser refused the step (HTTP ${response.status})`, { status: response.status, timedOut: /timed out|Timeout/.test(reason), addonPage: answer.addonPage === true, size });
}

/** True when the tab is gone, or a click hung: both end by reopening the page. */
const reopens = (error, click) => error instanceof BrowseError && (error.status === 404 || error.status === 410 || (click && error.timedOut));

/** The driver for one session's tab. `retry` reopens a lost tab and tries the step once more; `start`
 * starts the server when none runs. Each method throws a BrowseError on failure. */
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
    const pieces = [await json('GET', `/tabs/${tabId}/snapshot?userId=${USER}`)];
    // A long page comes in windows, each repeating its end, so its lines can't be counted as the server counted them.
    const refsCount = pieces[0].hasMore ? null : pieces[0].refsCount;
    while (pieces.at(-1).hasMore) pieces.push(await json('GET', `/tabs/${tabId}/snapshot?userId=${USER}&offset=${pieces.at(-1).nextOffset}`));
    const { url } = pieces.at(-1);
    const text = pieces.length > 1 ? joinPieces(pieces) : pieces[0].snapshot ?? '';
    return { url, snapshot: relabel(text, refsCount) };
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
  const evaluateOn = async (tabId, expression) => (await json('POST', `/tabs/${tabId}/evaluate`, { userId: USER, expression })).result;
  const evaluate = expression => onTab(tabId => evaluateOn(tabId, expression));
  const bySelector = async (selector, expression) => {
    const result = await evaluate(expression);
    if (result === BAD_SELECTOR) throw selectorError(selector);
    return result;
  };

  const page = {
    session,
    async open(url) {
      const tab = readTab();
      if (tab) {
        try {
          const moved = await json('POST', `/tabs/${tab.tabId}/navigate`, { userId: USER, url }, { wait: COMMAND_MS + SETTLE_MS });
          await settle(tab.tabId);
          // The last page's tick boxes don't hold here.
          writeTab({ ...tab, url: moved.url ?? url, refs: undefined, names: undefined });
          return moved.url ?? url;
        } catch (error) {
          if (!reopens(error, false)) throw error;
        }
      }
      return (await newTab(url)).url;
    },
    /** The page as text, every secret box's value hidden; `settle` alone reads it raw, to compare. The tab file keeps
     * its tick boxes, so a click on one knows what it clicks, and each ref's box, for `names`. */
    async snapshot() {
      const { url, snapshot, found } = await onTab(async tabId => ({ ...(await read(tabId)), found: await evaluateOn(tabId, `[${SECRETS_SCRIPT}, ${FRAMES_SCRIPT}]`) }));
      const [secrets = [], frames = []] = found ?? [];
      const tab = readTab();
      const hidden = hideSecrets(snapshot, secrets);
      const seen = { url, snapshot: labelFrames(hidden, frameSites(hidden, frames)) };
      writeTab({ ...tab, ...(url && { url }), refs: boxesIn(seen.snapshot), names: refNames(seen.snapshot) });
      return seen;
    },
    /** Clicks; a tick box, radio, or switch that didn't change gets Space, then a stop. Resolves to how the click
     * landed: `mouse`, `forced`, or `script`; an older browser also says `key`, or `queued` while it waits. */
    async click(target) {
      const { ref, selector } = targetOf(target);
      const box = async () => (ref ? boxesIn((await page.snapshot()).snapshot)[ref] : await evaluate(`(${boxAt})(document, ${JSON.stringify(selector)}, ${JSON.stringify(CHECKS)})`)) ?? null;
      const before = ref ? readTab()?.refs?.[ref] : await box();
      const { via, queued } = await (await act('click', target)).json().catch(() => ({}));
      if (queued) {
        writeTab({ ...readTab(), clickQueued: true });
        return 'queued';
      }
      if (!before || boxChanged(before, await box())) return via;
      await act('type', target, { text: '', mode: 'keyboard' });
      await page.press('Space');
      if (!boxChanged(before, await box())) throw new BrowseError('the box did not change');
      return via;
    },
    /** Waits, up to `CLICK_WAIT_MS`, for the click an older browser queued here: how it landed, or `none`. A gone tab
     * is an error only when this session queued a click: the reaper also closes an idle tab with none. */
    async waitClick() {
      const tab = readTab();
      server ??= await liveServer();
      if (!tab || !server) return 'none';
      const reported = () => { const now = readTab(); if (now?.clickQueued) writeTab({ ...now, clickQueued: undefined }); };
      for (const end = Date.now() + CLICK_WAIT_MS; ;) {
        const answer = await json('GET', `/tabs/${tab.tabId}/click?userId=${USER}`).catch(error => {
          if (error.status) reported();
          if (error.status !== 404) throw error;
          if (tab.clickQueued) throw new BrowseError('this task\'s tab closed before its click ran');
          return { none: true };
        });
        if (answer.waiting) {
          if (Date.now() >= end) throw new BrowseError(CLICK_WAITS_TOO_LONG);
          continue;
        }
        reported();
        return answer.via ?? 'none';
      }
    },
    type: (target, text) => act('type', target, { text }, { quiet: true }),
    select: (target, option) => act('select', target, { option }),
    press: key => onTab(tabId => send('POST', `/tabs/${tabId}/press`, { userId: USER, key })),
    /** Presses Enter in a box, focused first: a key pressed on the page alone misses a box in another site's frame. */
    enter: target => act('type', target, { text: '', mode: 'keyboard', pressEnter: true }),
    url: async () => noteUrl(await evaluate('location.href')),
    count: selector => bySelector(selector, countScript(selector)),
    /** The page's size, `[width, height]`; on the password manager's page, the size the site gets back. */
    size: () => evaluate('[innerWidth, innerHeight]').catch(error => error.size ?? Promise.reject(error)),
    /** Each ref's box at the last snapshot, as `refNames` gives it; `{}` before one. */
    names: () => readTab()?.names ?? {},
    /** Shows this tab: `turn` holds or ends a turn, `raise: false` renews it, `reselect` keeps the person's tab,
     * `shared` joins other turns. Answers `handedBack` on Hand back, `behind` on a plain front during another turn. */
    front: ({ turn, raise, reselect, shared } = {}) => onTab(tabId => json('POST', `/tabs/${tabId}/front`, { userId: USER, ...(turn !== undefined && { turn }), ...(raise === false && { raise }), ...(reselect && { reselect }), ...(shared && { shared }) })),
    /** Whether the browser shows this tab now: a tab behind another reads hidden. */
    shown: () => evaluate("document.visibilityState === 'visible'"),
    /** Sets the page's size; resolves to its size. On the password manager's page the width applies, the height stays
     * under the bar, and the answer says `addonPage`. */
    resize: (width, height) => onTab(tabId => json('POST', `/tabs/${tabId}/viewport`, { userId: USER, width, height })),
    /** Starts the browser when it is not running. */
    ready: async () => { await connect(); },
    /** Opens the password manager's own page in this tab; the tab file keeps the site, for a reopen. */
    openAddon: url => onTab(tabId => json('POST', `/tabs/${tabId}/navigate`, { userId: USER, url }, { wait: COMMAND_MS + SETTLE_MS })),
    /** The login names the password manager's fill list offers for this page: `{state, names}`. */
    logins: () => onTab(tabId => json('POST', `/tabs/${tabId}/logins`, { userId: USER })),
    /** Picks login `n` from the list `logins` read last; the server refuses any other order. */
    pick: n => onTab(tabId => json('POST', `/tabs/${tabId}/pick`, { userId: USER, n })),
    /** Closes the password manager's boxes over the page by their own close buttons: `{closed}`. */
    closeBoxes: () => onTab(tabId => json('POST', `/tabs/${tabId}/closeBoxes`, { userId: USER })),
    /** A use the server counts, so it keeps an idle page open; it reads and changes nothing on the page. */
    keepAlive: () => evaluate('1'),
    async value(target) {
      const { ref, selector } = targetOf(target);
      // A dropdown reads as its picked choice's text, as a ref's snapshot shows it.
      const value = ref ? valueIn((await page.snapshot()).snapshot, ref) : await bySelector(selector, fieldScript(selector));
      if (value === null) throw new BrowseError(`no field ${target} on the page`);
      return value;
    },
    /** A box's value by ref with no secret check, for the connect helper's key read: the CLI never offers it. */
    async valueOf(target) {
      const { ref } = targetOf(target);
      const value = ref ? valueIn((await onTab(read)).snapshot, ref) : null;
      if (value === null) throw new BrowseError(`no field ${target} on the page`);
      return value;
    },
    /** A picture of the page as PNG bytes: what shows, or with `fullPage` the whole page. */
    png: async ({ fullPage = false } = {}) => Buffer.from(await (await onTab(tabId => send('GET', `/tabs/${tabId}/screenshot?userId=${USER}${fullPage ? '&fullPage=true' : ''}`))).arrayBuffer()),
    /** A picture of the page in the temp folder; null when `ifChanged` and it shows what the last one did. */
    async screenshot({ ifChanged = false, fullPage = false } = {}) {
      const png = await page.png({ fullPage });
      const shot = createHash('sha256').update(png).digest('hex');
      const tab = readTab();
      if (ifChanged && tab.shot === shot) return null;
      writeTab({ ...tab, shot });
      const file = join(tmpdir(), `browse-${session}-${shot.slice(0, 12)}.png`);
      writeFileSync(file, png, { mode: 0o600 });
      return file;
    },
    /** Checks the server answers for the sign-ins: the profile folder keeps them itself, with every tab open. */
    save: () => send('POST', `/sessions/${USER}/cookies`, { cookies: [] }),
    /** Closes this task's tab, and the session when no tab is left. */
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

/** Saves the setting `name` from the next start when `choice` is given, beside the other one, and prints it. The file
 * stays in the home folder, the person's alone, so each computer keeps its own. */
function settingCommand(name, choice) {
  if (choice) {
    mkdirSync(dirname(FILES.settings), { recursive: true, mode: 0o700 });
    writeFileSync(FILES.settings, `${JSON.stringify({ ...readJson(FILES.settings), [name]: choice === 'on' })}\n`, { mode: 0o600 });
    chmodSync(FILES.settings, 0o600);
  }
  console.log(`BROWSE_${name.toUpperCase()}=${SETTINGS[name]() ? 'on' : 'off'}`);
  if (choice) console.log(NEXT_START);
}

/** Brings the tab to the front: `yes`, or `behind` with its note while the person uses another tab. */
async function frontOf(page) {
  const { behind } = (await page.front()) ?? {};
  if (behind) console.error(BEHIND_NOTE);
  return behind ? 'behind' : 'yes';
}

/** The clicks `click` names, each with its note for the agent: a mouse or forced click is the plain one. */
const CLICK_NOTES = { script: SCRIPT_CLICK_NOTE, key: '', queued: QUEUED_NOTE };

/** Each command: how many words follow it, and what it runs. */
const COMMANDS = {
  open: [1, async (page, [url]) => console.log(`BROWSE_URL=${await page.open(url)}`)],
  snapshot: [0, async page => { const { url, snapshot } = await page.snapshot(); console.log(`BROWSE_URL=${url}\n${snapshot}`); }],
  click: [1, async (page, [target]) => {
    const via = await page.click(target);
    if (!Object.hasOwn(CLICK_NOTES, via)) return;
    console.log(`BROWSE_CLICK=${via}`);
    if (CLICK_NOTES[via]) console.error(CLICK_NOTES[via]);
  }],
  'wait-click': [0, async page => console.log(`BROWSE_CLICK=${await page.waitClick()}`)],
  type: [2, (page, [target, text]) => page.type(target, text)],
  press: [1, (page, [key]) => page.press(key)],
  select: [2, (page, [target, option]) => page.select(target, option)],
  screenshot: [0, async (page, _, flags) => console.log(`BROWSE_SHOT=${(await page.screenshot({ ifChanged: flags['if-changed'], fullPage: flags['full-page'] })) ?? 'none'}`)],
  save: [0, async page => { await page.save(); console.log('BROWSE_SAVED=yes'); }],
  front: [0, async page => console.log(`BROWSE_FRONT=${await frontOf(page)}`)],
  show: [0, async page => {
    if (await frontOf(page) === 'behind') console.log('BROWSE_FRONT=behind');
    console.log(`BROWSE_SHOWN=${shownAs(readJson(FILES.server))}`);
  }],
  close: [0, async page => { await page.close(); console.log(`BROWSE_CLOSED=${page.session}`); }],
  status: [0, status],
  install: [0, install],
  stop: [0, stop],
  window: (_, [choice]) => settingCommand('window', choice),
  proxy: (_, [choice]) => settingCommand('proxy', choice),
  async get(page, [what, target]) {
    console.log(await { url: () => page.url(), count: () => page.count(target), value: () => page.value(target) }[what]());
  },
};
const QUIET = new Set(['click', 'type', 'press', 'select']);

/** The `addon` verb's runner, from addons.mjs, loaded only when asked for. */
function addonRunner([verb, ...words], usage) {
  return async (page, _, flags) => {
    const { ADDON_VERBS } = await import('./addons.mjs');
    if (!Object.hasOwn(ADDON_VERBS, verb)) usage('addon takes find, add, open, logins, pick, close, status, or remove');
    const [count, runner] = ADDON_VERBS[verb];
    const [least, most = least] = [count].flat();
    const counted = least === most ? least : `${least} or ${most}`;
    if (words.length < least || words.length > most) usage(`addon ${verb} takes ${counted} word${most === 1 ? '' : 's'} after it`);
    await runner(page, words, flags);
  };
}

/** The command's runner, or a usage error when its words don't fit. */
function runnerFor(command, words) {
  const usage = message => usageError(USAGE, message);
  if (command === 'addon') return addonRunner(words, usage);
  if (!Object.hasOwn(COMMANDS, command)) usage(command ? `unknown command: ${command}` : 'missing command');
  if (Object.hasOwn(SETTINGS, command)) {
    if (words.length > 1 || (words.length && !['on', 'off'].includes(words[0]))) usage(`${command} takes on, off, or nothing`);
    return COMMANDS[command];
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

// The command line runs once this module has loaded: addons.mjs imports it, and a top-level await would deadlock.
async function cli() {
  const { values: flags, positionals: [command, ...words] } = parseCli({ usage: USAGE, allowPositionals: true, options: { session: { type: 'string' }, 'if-changed': { type: 'boolean' }, 'full-page': { type: 'boolean' } } });
  const runner = runnerFor(command, words);
  try {
    await runner(client(flags.session), words, flags);
    if (QUIET.has(command)) console.log(`BROWSE_DONE=${command}`);
  } catch (error) {
    if (!(error instanceof BrowseError)) throw error;
    console.log(error.needs ? `BROWSE_NEEDS=${error.needs}` : `BROWSE_ERROR=${error.message.replace(/\s+/g, ' ')}`);
    if (error.needs) console.error(error.message);
    process.exitCode = error.needs ? 3 : 1;
  }
}

if (isMain(import.meta.url)) cli();
