// A stand-in for camofox's server.js, started by browse.mjs as the real one is. It answers the routes
// browse.mjs calls with the shapes camofox 1.18.1 sends, and keeps its tabs in memory. fake-camofox.mjs
// installs it and sets `globalThis.FAKE_CAMOFOX_DIR`, the control folder:
//
//   env.json        what it was started with; starts.log  a line per start; requests.jsonl  each request, in order
//   snapshot        the page text every read gives; snapshots.json  a list, one per read, the last repeating
//   snapshot-more   a second chunk, so a read is paged
//   count           what a count gives (default 1); no-field  a value read finds no field
//   shot            the picture's bytes
//   click-url, click-count, press-url   where a click or a key press moves the address or the count
//   gone-once       the next tab request loses its tab (410), once; gone  every tab request does
//   timeout-click-once  the next click times out, once
//   fail-open, fail-click, fail-type, fail-select, fail-save   that step is refused
//   hold-click, hold-type   that step waits until the file is removed
import { randomUUID } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';

const DIR = globalThis.FAKE_CAMOFOX_DIR;
const file = name => join(DIR, name);
const has = name => existsSync(file(name));
const text = name => readFileSync(file(name), 'utf8').trim();
const once = name => has(name) && (rmSync(file(name)), true);
const sleep = ms => new Promise(done => setTimeout(done, ms));
const held = async name => { while (has(name)) await sleep(10); };

const tabs = new Map();
const KEPT = ['CAMOFOX_PORT', 'CAMOFOX_BIND_HOST', 'CAMOFOX_CRASH_REPORT_ENABLED', 'CAMOFOX_CRASH_REPORT_URL', 'SENTRY_DSN', 'CAMOFOX_PROFILE_DIR', 'CAMOFOX_API_KEY', 'TMPDIR', ...Object.keys(process.env).filter(name => name.startsWith('PROXY_'))];
writeFileSync(file('env.json'), JSON.stringify({ ...Object.fromEntries(KEPT.map(name => [name, process.env[name]])), cwd: process.cwd(), pid: process.pid, argv: process.argv.slice(1) }));
appendFileSync(file('starts.log'), `${process.pid}\n`);

/** Replies, writing tabs.json first, so a test reads the tabs as they are once its command returns. */
function send(response, status, body) {
  writeFileSync(file('tabs.json'), JSON.stringify([...tabs.values()]));
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

/** What an expression browse.mjs sends evaluates to on this tab. */
function evaluate(tab, expression) {
  if (expression === 'location.href') return tab.url;
  if (/^document\.querySelectorAll\(.*\)\.length$/.test(expression)) return has('count') ? Number(text('count')) : 1;
  const field = /^document\.querySelector\((".*")\)\?\.value \?\? null$/.exec(expression);
  if (!field) throw new Error(`the fake evaluates no such expression: ${expression}`);
  const selector = JSON.parse(field[1]);
  return has('no-field') ? null : tab.typed[selector] ?? tab.picked[selector] ?? '';
}

const STEPS = {
  async click(tab, _, response) {
    await held('hold-click');
    if (once('timeout-click-once')) return refuse(response, 500, 'click timed out after 30000ms');
    if (has('fail-click')) return refuse(response, 500, 'click failed');
    if (has('click-url')) tab.url = text('click-url');
    if (has('click-count')) writeFileSync(file('count'), text('click-count'));
    return send(response, 200, { ok: true });
  },
  async type(tab, body, response) {
    await held('hold-type');
    // Playwright's call log quotes what was to be typed, as the real server's refusal can.
    if (has('fail-type')) return refuse(response, 422, `locator.fill: Timeout 10000ms exceeded. Call log: fill("${body.text}")`);
    tab.typed[body.ref ?? body.selector] = body.text;
    return send(response, 200, { ok: true });
  },
  select(tab, body, response) {
    if (has('fail-select') || !body.option) return refuse(response, 422, 'no such option');
    tab.picked[body.ref ?? body.selector] = body.option;
    return send(response, 200, { ok: true });
  },
  press(tab, _, response) {
    if (has('press-url')) tab.url = text('press-url');
    return send(response, 200, { ok: true });
  },
  navigate(tab, body, response) {
    Object.assign(tab, { url: body.url, reads: 0 });
    return send(response, 200, { ok: true, tabId: tab.id, url: tab.url });
  },
  evaluate: (tab, body, response) => send(response, 200, { ok: true, result: evaluate(tab, body.expression) }),
  snapshot(tab, _, response, query) {
    if (query.get('offset')) return send(response, 200, { url: tab.url, snapshot: text('snapshot-more'), hasMore: false });
    const snapshot = pageText(tab);
    tab.reads++;
    return send(response, 200, { url: tab.url, snapshot, hasMore: has('snapshot-more'), nextOffset: snapshot.length });
  },
  screenshot: (_, __, response) => response.writeHead(200, { 'content-type': 'image/png' }).end(has('shot') ? text('shot') : 'png-1'),
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
    const tab = { id: randomUUID(), session: body.sessionKey, user: body.userId, url: body.url, reads: 0, typed: {}, picked: {} };
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

createServer(async (request, response) => {
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
}).listen(Number(process.env.CAMOFOX_PORT), process.env.CAMOFOX_BIND_HOST);

process.on('SIGTERM', () => {
  writeFileSync(file('stopped'), 'SIGTERM');
  process.exit(0);
});
