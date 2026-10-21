// A stand-in for camofox's server.js, answering browse.mjs's routes with camofox 1.18.1's shapes; tabs live in memory.
// Tests steer it with files in `globalThis.FAKE_CAMOFOX_DIR`: each `has`, `once`, `text` or `held` call names one.
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once as heard } from 'node:events';
import { appendFileSync, existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { MARK_SCRIPT, SECRETS_SCRIPT } from '../../../.agents/skills/browser/scripts/browse.mjs';

const DIR = globalThis.FAKE_CAMOFOX_DIR;
const file = name => join(DIR, name);
const has = name => existsSync(file(name));
const text = name => readFileSync(file(name), 'utf8').trim();
const once = name => has(name) && (rmSync(file(name)), true);
const sleep = ms => new Promise(done => setTimeout(done, ms));
const held = async name => { while (has(name)) await sleep(10); };
// Written beside, then renamed in, so a test never reads half a file.
const writeWhole = (name, value) => { writeFileSync(file(`${name}.${process.pid}.tmp`), value); renameSync(file(`${name}.${process.pid}.tmp`), file(name)); };
// A crash's stack goes to errors.log, which a failing test prints.
process.on('uncaughtException', error => { appendFileSync(file('errors.log'), `${error.stack}\n`); process.exit(1); });

const tabs = new Map();
const KEPT = ['CAMOFOX_PORT', 'CAMOFOX_BIND_HOST', 'CAMOFOX_CRASH_REPORT_ENABLED', 'CAMOFOX_CRASH_REPORT_URL', 'SENTRY_DSN', 'CAMOFOX_PROFILE_DIR', 'CAMOFOX_API_KEY', 'TMPDIR', ...Object.keys(process.env).filter(name => name.startsWith('PROXY_'))];
writeWhole('env.json', JSON.stringify({ ...Object.fromEntries(KEPT.map(name => [name, process.env[name]])), cwd: process.cwd(), pid: process.pid, argv: process.argv.slice(1) }));
// The pretend browser ends with this server: its input closes when the server goes, however it goes.
const browser = has('display') ? spawn(process.execPath, ['-e', "process.title = 'camoufox-bin'; console.log('named'); process.stdin.resume().on('end', () => process.exit());"], { stdio: ['pipe', 'pipe', 'ignore'], env: { ...process.env, DISPLAY: text('display') } }) : null;

/** Replies, writing tabs.json first, so a test reads the tabs as they are once its command returns. */
function send(response, status, body) {
  writeWhole('tabs.json', JSON.stringify([...tabs.values()]));
  response.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
}
const refuse = (response, status, error, more = {}) => send(response, status, { error, ...more });

/** The page text a read gives, by how many reads this tab has had. */
function pageText(tab) {
  if (has('snapshots.json')) {
    const list = JSON.parse(text('snapshots.json'));
    return list[Math.min(tab.reads, list.length - 1)];
  }
  return has('snapshot') ? text('snapshot') : `- heading "Page at ${tab.url}"\n- textbox "Name" [e1]\n- button "Go" [e2]`;
}

/** One piece of a page as camofox 1.18.1's lib/snapshot.js cuts a long one: a part, a marker, and the page's end. */
function windowSnapshot(page, offset) {
  if (page.length <= 80_000) return { snapshot: page, truncated: false, totalChars: page.length };
  const budget = 80_000 - 5000 - 200;
  const start = Math.min(offset, page.length - 5000);
  const end = start + budget;
  const hasMore = end < page.length - 5000;
  const marker = hasMore ? `\n[... truncated at char ${end} of ${page.length}. Call snapshot with offset=${end} to see more. Pagination links below. ...]\n` : '\n';
  return { snapshot: page.slice(start, end) + marker + page.slice(-5000), truncated: true, totalChars: page.length, hasMore, nextOffset: hasMore ? end : null };
}

/** True when a step's target is the tick box: the ref the `box` file names, or `#agree`; `{ticked}` shows its state. */
const isBox = body => has('box') && (body.ref === text('box') || body.selector === '#agree');
const toggle = tab => { tab.ticked = !tab.ticked; };

/** The element a box read finds: the tick box, else a button; a Playwright-only selector doesn't parse. */
function element(tab, selector) {
  if (selector.includes('>>')) throw new SyntaxError(`'${selector}' is not a valid selector`);
  const attributes = { getAttribute: () => null };
  return isBox({ selector }) ? { ...attributes, tagName: 'INPUT', type: 'checkbox', checked: tab.ticked } : { ...attributes, tagName: 'BUTTON', type: 'submit' };
}

/** What an expression browse.mjs sends evaluates to on this tab. */
function evaluate(tab, expression) {
  if (expression.startsWith('(function boxAt(')) return new Function('document', `return ${expression}`)({ querySelectorAll: selector => [element(tab, selector)] });
  if (expression === 'location.href') return tab.url;
  if (expression === '[innerWidth, innerHeight]') return tab.size;
  if (expression === '1') return 1;
  // The page's secret boxes hold `secrets.json`'s values and what was typed into a marked box.
  if (expression === SECRETS_SCRIPT) return [...(has('secrets.json') ? JSON.parse(text('secrets.json')) : []), ...tab.marked.map(target => tab.typed[target])];
  if (expression === MARK_SCRIPT) return void (tab.focused && tab.marked.push(tab.focused));
  if (/^document\.querySelectorAll\(.*\)\.length$/.test(expression)) return has('count') ? Number(text('count')) : 1;
  if (!/document\.querySelector\(".*"\)\) \?\? null$/.test(expression)) throw new Error(`the fake evaluates no such expression: ${expression}`);
  // A field read runs as written, on a page whose picked fields are dropdowns and the rest plain text boxes.
  const querySelector = selector => {
    if (has('no-field')) return null;
    const picked = tab.picked[selector];
    const box = { tagName: 'INPUT', value: tab.typed[selector] ?? '', placeholder: '', title: '', labels: [], matches: () => false, getAttribute: () => null };
    return picked === undefined ? box : { tagName: 'SELECT', value: `value of ${picked}`, selectedOptions: [{ label: picked }] };
  };
  return new Function('document', `return ${expression}`)({ querySelector });
}

const STEPS = {
  async click(tab, body, response) {
    await held('hold-click');
    if (once('timeout-click-once')) return refuse(response, 500, 'click timed out after 30000ms');
    if (has('fail-click')) return refuse(response, 500, 'click failed');
    if (has('click-url')) tab.url = text('click-url');
    if (has('click-count')) writeFileSync(file('count'), text('click-count'));
    if (isBox(body) && !has('box-ignores-click')) toggle(tab);
    // A click that redraws the page, so camofox's next read numbers other things.
    if (has('click-snapshot')) writeWhole('snapshot', text('click-snapshot'));
    return send(response, 200, { ok: true });
  },
  async type(tab, body, response) {
    await held('hold-type');
    // Playwright's call log quotes what was to be typed, as the real server's refusal can.
    if (has('fail-type')) return refuse(response, 422, `locator.fill: Timeout 10000ms exceeded. Call log: fill("${body.text}")`);
    tab.typed[body.ref ?? body.selector] = body.text;
    if (has('type-url')) tab.url = text('type-url');
    tab.focused = body.ref ?? body.selector;
    if (body.mode === 'keyboard') tab.focus = body;
    return send(response, 200, { ok: true });
  },
  select(tab, body, response) {
    if (has('fail-select') || !body.option) return refuse(response, 422, 'no such option');
    tab.picked[body.ref ?? body.selector] = body.option;
    return send(response, 200, { ok: true });
  },
  press(tab, body, response) {
    if (has('press-url')) tab.url = text('press-url');
    if (body.key === 'Space' && tab.focus && isBox(tab.focus) && !has('box-ignores-space')) toggle(tab);
    return send(response, 200, { ok: true });
  },
  navigate(tab, body, response) {
    Object.assign(tab, { url: body.url, reads: 0 });
    return send(response, 200, { ok: true, tabId: tab.id, url: tab.url });
  },
  evaluate: (tab, body, response) => send(response, 200, { ok: true, result: evaluate(tab, body.expression) }),
  viewport(tab, body, response) {
    if (has('fail-viewport')) return refuse(response, 500, 'viewport failed');
    tab.size = [body.width, body.height];
    return send(response, 200, { ok: true, width: body.width, height: body.height });
  },
  snapshot(tab, _, response, query) {
    // A later piece is cut from the last whole read, as camofox keeps it.
    if (Number(query.get('offset'))) return send(response, 200, { url: tab.url, ...windowSnapshot(tab.last, Number(query.get('offset'))) });
    tab.last = pageText(tab).replaceAll('{ticked}', tab.ticked ? ' [checked]' : '');
    tab.reads++;
    // camofox's count is its ref list's size, which a frame page's marks can fall short of.
    const refsCount = has('refs-count') ? Number(text('refs-count')) : (tab.last.match(/\[e\d+\]/g) ?? []).length;
    return send(response, 200, { url: tab.url, refsCount, ...windowSnapshot(tab.last, 0) });
  },
  screenshot: (_, __, response) => (has('fail-shot') ? refuse(response, 500, 'screenshot failed') : response.writeHead(200, { 'content-type': 'image/png' }).end(has('shot') ? text('shot') : 'png-1')),
};

/** A request on one tab: its step, or the tab closed, or the reply camofox gives for a tab it lost. */
function onTab(request, response, [id, step], body, query) {
  const lost = once('gone-once') || has('gone');
  if (lost) tabs.delete(id);
  const tab = tabs.get(id);
  if (request.method === 'DELETE' && !step) {
    tabs.delete(id);
    return send(response, 200, { ok: true });
  }
  if (!tab) return lost ? refuse(response, 410, 'Tab no longer exists (browser was restarted). Create a new tab.', { code: 'browser_restarted' }) : refuse(response, 404, 'Tab not found');
  return STEPS[step](tab, body, response, query);
}

function route(request, response, path, body, query) {
  const parts = path.split('/').filter(Boolean);
  if (path === '/tabs' && request.method === 'POST') {
    if (has('fail-open')) return refuse(response, 500, 'tab create failed');
    const tab = { id: randomUUID(), session: body.sessionKey, user: body.userId, url: body.url, reads: 0, typed: {}, picked: {}, marked: [], ticked: false, size: has('size') ? JSON.parse(text('size')) : [2560, 1328] };
    tabs.set(tab.id, tab);
    return send(response, 200, { tabId: tab.id, url: tab.url, httpStatus: 200, navigationOk: true });
  }
  if (path === '/tabs') return send(response, 200, { running: true, tabs: [...tabs.values()].map(tab => ({ tabId: tab.id, url: tab.url, listItemId: tab.session })) });
  if (parts[0] === 'tabs') return onTab(request, response, parts.slice(1), body, query);
  if (parts[0] === 'sessions' && parts[2] === 'cookies') return has('fail-save') ? refuse(response, 500, 'cookie import failed') : send(response, 200, { ok: true, userId: parts[1], count: body.cookies.length });
  if (parts[0] === 'sessions') {
    tabs.clear();
    return send(response, 200, { ok: true });
  }
  return refuse(response, 404, 'no such route');
}

const server = createServer(async (request, response) => {
  const { pathname, searchParams } = new URL(request.url, 'http://camofox');
  if (pathname === '/health') return send(response, 200, { ok: true, engine: 'camoufox' });
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : null;
  appendFileSync(file('requests.jsonl'), `${JSON.stringify({ method: request.method, path: pathname, query: searchParams.toString(), body, auth: request.headers.authorization ?? null })}\n`);
  if (request.headers.authorization !== `Bearer ${process.env.CAMOFOX_API_KEY}`) return refuse(response, 403, 'Forbidden');
  try {
    await route(request, response, pathname, body, searchParams);
  } catch (error) {
    refuse(response, 500, error.message);
  }
});
// The server answers only once its pretend browser carries its name, so no test reads the name too soon.
if (browser) await heard(browser.stdout, 'data');
// `die-once` stands in for a taken port: the start exits before listening. starts.log counts starts that listened.
if (once('die-once')) process.exit(1);
server.listen(Number(process.env.CAMOFOX_PORT), process.env.CAMOFOX_BIND_HOST, () => appendFileSync(file('starts.log'), `${process.pid}\n`));

process.on('SIGTERM', () => {
  writeFileSync(file('stopped'), 'SIGTERM');
  process.exit(0);
});
