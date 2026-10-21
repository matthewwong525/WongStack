#!/usr/bin/env node
// Installs, starts, and drives camofox, the browser the agent uses websites in as the person; the only script
// that talks to it. Exit codes: 0 ok · 1 failed · 2 usage · 3 camofox is not installed. Node built-ins only.
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { homedir, tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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
  screenshot [--if-changed] [--full-page]
                                prints BROWSE_SHOT=<temp path>, or none when unchanged;
                                --full-page takes the whole page, not just what shows
  logins                        each saved login's name, host, and username
  login <name> [--username <ref>] [--password <ref>] [--submit <ref>]
                                type a saved login; prints BROWSE_LOGIN=accepted|rejected|missing|typed|wrong-site
  forget <name>                 delete a saved login
  save                          keep the logins now, with every tab open
  close                         close this task's tab
  status | install | stop       the install and the server`;

/** The only versions installed, moved together and only with a passing save on a real camofox. That check also
 * compares the two lists below with the installed `lib/interactive-roles.js` and `server.js`'s `SKIP_PATTERNS`. */
export const CAMOFOX = { '@askjo/camofox-browser': '1.18.1', 'playwright-core': '1.58.2' };
// camofox's roles that get a ref (lib/interactive-roles.js), and names it gives none (server.js SKIP_PATTERNS).
const INTERACTIVE_ROLES = ['button', 'link', 'textbox', 'checkbox', 'radio', 'menuitem', 'listitem', 'combobox', 'tab', 'searchbox', 'slider', 'spinbutton', 'switch'];
const SKIP_PATTERNS = [/datepicker/i, /date.?picker/i, /calendar/i, /^date$/i];
const MAX_REFS = 500;
const CHECKS = ['checkbox', 'radio', 'switch', 'menuitemcheckbox'];
export const NO_REF_NOTE = '- note: some boxes have no ref; read the page again or use a selector';
const DRIVER_LINE = CAMOFOX['playwright-core'].split('.').slice(0, 2).join('.');
const NEEDS = 'camofox is not installed. It needs about 1.4 GB of disk and about 700 MB of memory while it runs. Ask the person, then run `browse.mjs install`.';
const USER = 'me';
const DIR = join(homedir(), '.wong-stack', 'camofox');
const FILES = { server: join(DIR, 'server.json'), key: join(DIR, 'api-key'), lock: join(DIR, 'start.lock'), tmp: join(DIR, 'tmp'), tabs: join(DIR, 'tabs'), profiles: join(DIR, 'profiles') };
const packageDir = name => join(DIR, 'node_modules', name);
const SERVER_SCRIPT = join(packageDir('@askjo/camofox-browser'), 'server.js');
const LAUNCHER = fileURLToPath(new URL('./server.mjs', import.meta.url));
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

/** The session a task's tab is keyed by: the name given, else the checkout's folder name. */
export function sessionName(given) {
  const top = given ?? spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).stdout?.trim();
  return basename(top || process.cwd()).replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 64) || 'default';
}

/** A snapshot ref (`e12` or `@e12`) or a selector, as camofox's routes take it. */
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
/** A secret box by its kind, or by the mark `login` leaves on the box it typed a password into. */
const SECRET_FIELDS = ['input[type=password]', ...['cc-number', 'cc-csc', 'cc-exp', 'cc-exp-month', 'cc-exp-year', 'one-time-code'].map(kind => `[autocomplete~="${kind}"]`), '[data-wong-hidden]'].join(', ');
/** A snapshot line: its indent, its start quoted or bare, and its value, or a lone `:` when it sits on a child line. */
const LINE = /^(\s*)- (?:'((?:[^']|'')*)'(?: \[[^\]]*\])*|([^'].*?))(?:: (.*)|(:))?$/;
/** A box's start: its role, its name, and its marks, camofox's ref among them. A dropdown is a combobox too, but its
 * pick sits on an option line, which no rule here hides. */
const BOX_KEY = /^(?:textbox|searchbox|spinbutton|combobox)(?: "((?:[^"\\]|\\.)*)")?(?: \[[^\]]*\])*$/;
/** The values of the page's secret boxes, dropdowns left out, in the page, same-origin frames, and shadow roots. */
export const SECRETS_SCRIPT = `(() => { const found = []; const walk = root => { for (const field of root.querySelectorAll(${JSON.stringify(SECRET_FIELDS)})) if (field.tagName !== 'SELECT' && field.value) found.push(field.value); for (const inner of root.querySelectorAll('*')) { if (inner.shadowRoot) walk(inner.shadowRoot); try { if (inner.contentDocument) walk(inner.contentDocument); } catch { /* another site's frame */ } } }; walk(document); return found; })()`;
/** Marks the box a password was just typed into, the focused one, so it stays secret once the site shows it as text. */
export const MARK_SCRIPT = `(() => { let field = document.activeElement; for (let inner; (inner = field?.contentDocument?.activeElement ?? field?.shadowRoot?.activeElement);) field = inner; field?.setAttribute('data-wong-hidden', ''); })()`;
/** Reads one field by selector: a dropdown's picked choice, `[hidden]` for a filled secret box, else its text. */
export const fieldScript = selector => `(field => field && (field.tagName === 'SELECT' ? field.selectedOptions[0]?.label ?? '' : field.value && (field.matches(${JSON.stringify(SECRET_FIELDS)}) || ${SECRET_NAME}.test([field.getAttribute('aria-label'), field.placeholder, field.title, ...(field.getAttribute('aria-labelledby') ?? '').split(/\\s+/).filter(Boolean).map(id => field.getRootNode().getElementById?.(id)?.textContent), ...[...(field.labels ?? [])].map(label => label.textContent)].join(' '))) ? '[hidden]' : field.value))(document.querySelector(${JSON.stringify(selector)})) ?? null`;

/** A box's text as the snapshot quotes it, unquoted, with its spaces as Playwright collapses them. */
function plain(text) {
  let unquoted = text;
  if (/^".*"$/.test(text)) try { unquoted = JSON.parse(text); } catch { unquoted = text.slice(1, -1); }
  return unquoted.replace(/\s+/g, ' ').trim();
}

/** A box line's indent, name, and inline value, else null. Playwright single-quotes a start whose name holds `: `,
 * ` #`, `{`, `}` or a backtick, and camofox gives that line no ref. */
function boxOf(line) {
  const parts = LINE.exec(line);
  const box = parts && BOX_KEY.exec(parts[3] ?? parts[2].replaceAll("''", "'"));
  return box ? { indent: parts[1].length, name: box[1] ?? '', value: parts[4], children: Boolean(parts[5]) } : null;
}

/** A box's value on its own child line, as Playwright prints it beside a `/placeholder` line. */
const valueLine = (line, box) => line.search(/\S/) === box.indent + 2 ? /^(\s*- text: )(.+)$/.exec(line) : null;

/** The snapshot with each filled secret box's value shown as `[hidden]`: a box named like one, or one holding a
 * value in `secretValues`. Empty boxes, dropdown picks, and every other line read as given. */
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

/** A long page whole again. Past 80,000 characters camofox sends a page in pieces, each its part, a marker, and the
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

// A line's role and name as camofox reads them, its ref mark where camofox writes one, and a frame block's first line.
const HEAD = /^(\s*-\s+(\w+)(?:\s+"([^"]*)")?)/;
const MARK = /^(\s*-\s+\w+(?:\s+"[^"]*")?) \[(e\d+)\]/;
const FRAME = /^- iframe "[^\n]*":$/;

/** The `role:name` camofox numbers a line by, or null for a line it gives no ref. */
function refKey(line) {
  const [, , role = '', name = ''] = HEAD.exec(line) ?? [];
  if (!INTERACTIVE_ROLES.includes(role.toLowerCase()) || (name && SKIP_PATTERNS.some(skip => skip.test(name)))) return null;
  return `${role.toLowerCase()}:${name}`;
}

/** True on a Google results page, which camofox reads its own way, numbering every line it marks. */
export function googleResults(url) {
  try { const { hostname, pathname } = new URL(url); return hostname.includes('google.') && pathname === '/search'; } catch { return false; }
}

/** Page text whose refs act on the line they mark: frame pages renumber in camofox's order; if `refsCount` disagrees,
 * marks shared across blocks go, and on any page so does a main-page mark that isn't the line's place. */
export function relabel(snapshot, refsCount) {
  const lines = snapshot.split('\n');
  const keys = lines.map(refKey);
  const frames = lines.map((line, at) => FRAME.test(line) && lines[at + 1]?.startsWith('  '));
  const firstFrame = frames.indexOf(true);
  const count = keys.filter(Boolean).length;
  if (firstFrame >= 0 && count === refsCount && count <= MAX_REFS) {
    let next = 0;
    return lines.map((line, at) => (keys[at] ? line.replace(MARK, '$1').replace(HEAD, `$1 [e${++next}]`) : line)).join('\n');
  }
  // camofox numbers the main page first, so a frame it counted but didn't print leaves its ref on a main-page namesake.
  // A windowed read, with no count, skips this; a page with nothing dropped reads byte for byte.
  const mainEnd = refsCount == null ? 0 : firstFrame >= 0 ? firstFrame : lines.length;
  const wrong = new Set();
  let place = 0;
  lines.slice(0, mainEnd).forEach((line, at) => {
    if (!keys[at]) return;
    place++;
    const mark = MARK.exec(line)?.[2];
    if (mark && mark !== `e${place}`) wrong.add(at);
  });
  if (firstFrame < 0 && !wrong.size) return snapshot;
  const blocks = new Map();
  let block = 0;
  lines.forEach((line, at) => {
    if (frames[at]) block++;
    if (keys[at]) blocks.set(keys[at], (blocks.get(keys[at]) ?? new Set()).add(block));
  });
  return [...lines.map((line, at) => (wrong.has(at) || blocks.get(keys[at])?.size > 1 ? line.replace(MARK, '$1') : line)), NO_REF_NOTE].join('\n');
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

/** A selector's element as `[role, '', ticked]` when it is a tick box, radio, or switch, else null, also when camofox's
 * click and focus would take different matches. It runs in the page, so it uses nothing outside itself. */
export function boxAt(document, selector, checks) {
  let found;
  try { found = [...document.querySelectorAll(selector)]; } catch { return null; }
  // camofox's click takes the only visible match when exactly one is, a selector list left alone
  // (`visibleSelectorCandidate`), else the first. Visible is Playwright's: a size, and shown.
  const visible = element => {
    const { width, height } = element.getBoundingClientRect();
    return width > 0 && height > 0 && document.defaultView.getComputedStyle(element).visibility === 'visible';
  };
  const shown = found.length > 1 && !selector.includes(',') ? found.filter(visible) : [];
  // camofox's keyboard focus takes the first match, so a visible pick behind it gets no read, and so no Space retry.
  if (shown.length === 1 && shown[0] !== found[0]) return null;
  const box = found[0];
  const native = /^(checkbox|radio)$/.test(box?.type) && box.tagName === 'INPUT';
  const role = box?.getAttribute('role') || (native ? box.type : '');
  if (!checks.includes(role)) return null;
  const aria = box.getAttribute('aria-checked');
  return [role, '', native ? box.checked : aria === 'mixed' ? 'mixed' : aria === 'true'];
}

/** True when `now`, a box's state after a click, shows the click took: a radio picked, else any change. Another role or
 * name means camofox renumbered and the ref holds another thing: a change, so Space never lands on it. */
export function boxChanged(before, now) {
  if (!now || now[0] !== before[0] || now[1] !== before[1]) return true;
  return before[0] === 'radio' ? now[2] === true : now[2] !== before[2];
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
    const child = spawn(process.execPath, [LAUNCHER, SERVER_SCRIPT], { cwd: DIR, detached: true, stdio: 'ignore', env: serverEnv(port, apiKey()) });
    child.unref();
    writeFileSync(FILES.server, `${JSON.stringify({ pid: child.pid, port, proxy: 'local' })}\n`, { mode: 0o600 });
    const { live, died } = await awaitServer(child.pid, end);
    if (live) return live;
    if (!died) await terminate(child.pid);
    rmSync(FILES.server, { force: true });
    if (!died) break;
  }
  throw new BrowseError('the browser did not start');
}

/** A live server, else one this task starts. While another task holds the start, it looks again;
 * if that start fails, this task takes it over. */
async function startServer() {
  if (!installed()) throw new BrowseError(NEEDS, { needs: 'install' });
  if (!driver().startsWith(`${DRIVER_LINE}.`)) throw new BrowseError(`the browser driver is ${driver()}, not ${DRIVER_LINE}.x, and a login does not save on any other; run \`browse.mjs install\``);
  privateDirs();
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

async function stop() {
  await terminate(readJson(FILES.server)?.pid);
  rmSync(FILES.server, { force: true });
  console.log('BROWSE_SERVER=stopped');
}

async function status() {
  console.log(`BROWSE_INSTALLED=${installed() ? `yes camofox ${readJson(join(packageDir('@askjo/camofox-browser'), 'package.json'))?.version} driver ${driver()}` : 'no'}`);
  console.log(`BROWSE_SERVER=${(await liveServer()) ? 'running' : 'stopped'}`);
}

/** One call to camofox, with a deadline. A refusal throws a BrowseError with camofox's reason, or with
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
  const reason = quiet ? '' : (await response.json().catch(() => ({}))).error ?? '';
  throw new BrowseError(reason || `the browser refused the step (HTTP ${response.status})`, { status: response.status, timedOut: /timed out|Timeout/.test(reason) });
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
    // A long page comes in windows, each repeating its end, so its lines can't be counted as camofox counted them.
    const refsCount = pieces[0].hasMore ? null : pieces[0].refsCount;
    while (pieces.at(-1).hasMore) pieces.push(await json('GET', `/tabs/${tabId}/snapshot?userId=${USER}&offset=${pieces.at(-1).nextOffset}`));
    const { url } = pieces.at(-1);
    const text = pieces.length > 1 ? joinPieces(pieces) : pieces[0].snapshot ?? '';
    return { url, snapshot: googleResults(url) ? text : relabel(text, refsCount) };
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

  const page = {
    session,
    async open(url) {
      const tab = readTab();
      if (tab) {
        try {
          const moved = await json('POST', `/tabs/${tab.tabId}/navigate`, { userId: USER, url }, { wait: COMMAND_MS + SETTLE_MS });
          await settle(tab.tabId);
          // The last page's tick boxes don't hold here.
          writeTab({ ...tab, url: moved.url ?? url, refs: undefined });
          return moved.url ?? url;
        } catch (error) {
          if (!reopens(error, false)) throw error;
        }
      }
      return (await newTab(url)).url;
    },
    /** The page as text, every secret box's value hidden; `settle` alone reads it raw, to compare. The tab file keeps
     * its tick boxes, so a click on one knows what it clicks. */
    async snapshot() {
      const { url, snapshot, secrets } = await onTab(async tabId => ({ ...(await read(tabId)), secrets: await evaluateOn(tabId, SECRETS_SCRIPT) }));
      const seen = { url, snapshot: hideSecrets(snapshot, secrets ?? []) };
      writeTab({ ...readTab(), ...(url && { url }), refs: boxesIn(seen.snapshot) });
      return seen;
    },
    /** Clicks; a tick box, radio, or switch that didn't change gets Space, as a person would press, then a stop. */
    async click(target) {
      const { ref, selector } = targetOf(target);
      const box = async () => (ref ? boxesIn((await page.snapshot()).snapshot)[ref] : await evaluate(`(${boxAt})(document, ${JSON.stringify(selector)}, ${JSON.stringify(CHECKS)})`)) ?? null;
      const before = ref ? readTab()?.refs?.[ref] : await box();
      await act('click', target);
      if (!before || boxChanged(before, await box())) return;
      await act('type', target, { text: '', mode: 'keyboard' });
      await page.press('Space');
      if (!boxChanged(before, await box())) throw new BrowseError('the box did not change');
    },
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
    /** Marks the focused box as secret, as `login` does after typing a password. */
    mark: () => evaluate(MARK_SCRIPT),
    async value(target) {
      const { ref, selector } = targetOf(target);
      // A dropdown reads as its picked choice's text, as a ref's snapshot shows it.
      const value = ref ? valueIn((await page.snapshot()).snapshot, ref) : await evaluate(fieldScript(selector));
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

/** The saved logins; an unreadable file stops with a plain reason. */
function savedLogins() {
  try { return readLogins(); } catch (error) { throw new BrowseError(error.message); }
}

/** Whether hosts `a` and `b` are one site: equal, or one sits under the other, as `login.x.com` under `x.com`. */
export function sameSite(a, b) {
  return Boolean(a && b) && (a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`));
}

/** Types the saved login `name` and submits: `typed` a step with no password box, `accepted` the address left the
 * page, `missing` none saved, `wrong-site` the tab is off the login's site. Only this reads passwords. */
export async function login(page, name, { username, password, submit }) {
  const entry = savedLogins().find(saved => saved.name === name);
  if (!entry || (password && !entry.password)) return { result: 'missing' };
  const onSite = url => sameSite(hostOf(url), hostOf(entry.url));
  const before = await page.url();
  if (!onSite(before)) return { result: 'wrong-site' };
  if (username) await page.type(username, entry.username);
  // A page that moved after the email step gets no password.
  if (password && username && !onSite(await page.url())) return { result: 'wrong-site' };
  if (password) {
    await page.type(password, entry.password);
    // Best effort: a password box is secret by its kind anyway; the mark covers one a site later shows as text.
    await page.mark().catch(() => {});
  }
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

/** Each command: how many words follow it, and what it runs. */
const COMMANDS = {
  open: [1, async (page, [url]) => console.log(`BROWSE_URL=${await page.open(url)}`)],
  snapshot: [0, async page => { const { url, snapshot } = await page.snapshot(); console.log(`BROWSE_URL=${url}\n${snapshot}`); }],
  click: [1, (page, [target]) => page.click(target)],
  type: [2, (page, [target, text]) => page.type(target, text)],
  press: [1, (page, [key]) => page.press(key)],
  select: [2, (page, [target, option]) => page.select(target, option)],
  screenshot: [0, async (page, _, flags) => console.log(`BROWSE_SHOT=${(await page.screenshot({ ifChanged: flags['if-changed'], fullPage: flags['full-page'] })) ?? 'none'}`)],
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
  const { values: flags, positionals: [command, ...words] } = parseCli({ usage: USAGE, allowPositionals: true, options: { session: { type: 'string' }, 'if-changed': { type: 'boolean' }, 'full-page': { type: 'boolean' }, username: { type: 'string' }, password: { type: 'string' }, submit: { type: 'string' } } });
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
