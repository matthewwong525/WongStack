// Access for any app whose server runs JavaScript: one object of slots in, the gate, the decisions and the routes
// out. The project's slots say who is signed in, where the data is kept, who the owner is, and what the app holds.
import { AccessError, boundedJson, reply } from './errors.mjs';
import { keyIds, keyTitle } from './levels.mjs';
import { manage, reconcile, refused } from './management.mjs';
import { namesFile, pageHtml, PATH } from './page.mjs';
import { managerPass, scheduledPass } from './pass.mjs';
import { currentPolicy, ownerOf, policyAllows, policyDenied, refusal } from './policy.mjs';
import { keysRoute } from './sealed.mjs';
import { servicesRoute } from './services.mjs';
import { startAll } from './start.mjs';
import { readTools, toolsRoute } from './tools.mjs';

const LEVELS = ['read', 'write'];
const ENVIRONMENTS = ['live', 'preview', 'local'];
const isFunction = value => typeof value === 'function';

/** Refuse slots that can not work, before any request: a missing required slot, or an extra with no `need`. */
function checkSlots(slots) {
  for (const name of ['signIn', 'store', 'owner']) {
    if (!isFunction(slots?.[name])) throw new TypeError(`access: the ${name} slot is required`);
  }
  for (const name of ['prefix', 'page']) {
    if (slots[name] !== undefined && !PATH.test(slots[name])) throw new TypeError(`access: the ${name} slot is a path such as /apps/access/`);
  }
  for (const extra of slots.extras ?? []) {
    const need = extra?.need;
    const known = need === 'manage' || (typeof need?.key === 'string' && LEVELS.includes(need.level ?? 'write'));
    if (typeof extra?.path !== 'string' || !isFunction(extra.handle) || !known) {
      throw new TypeError(`access: the extra ${JSON.stringify(extra?.path)} needs a path, a handle and a need`);
    }
  }
}

const signInFirst = () => reply({ error: { code: 'unauthenticated', message: 'Sign in first' } }, 401);

/** Whether a route's path is an extra's: the path itself or anything under it. */
const under = (path, base) => path === base || path.startsWith(base.endsWith('/') ? base : `${base}/`);

export function access(slots) {
  checkSlots(slots);
  const prefix = slots.prefix ?? '/api/access/';
  const page = slots.page ?? '/apps/access/';
  const extras = slots.extras ?? [];
  const environment = (() => {
    try { const value = slots.environment?.() ?? 'live'; return ENVIRONMENTS.includes(value) ? value : 'local'; }
    catch { return 'local'; }
  })();
  // A request with no caller is refused, unless the project says its app is open to anyone for now.
  const open = () => { try { return slots.open?.() === true; } catch { return false; } };
  const callers = new WeakMap();
  const runs = new WeakMap();
  const decided = new WeakMap();

  /** The signed-in caller, once per request: `{ email, subject }`, `{ machine }`, or null. A throwing sign-in is
   *  unreadable, so the caller is refused once permissions start. */
  function signedIn(request) {
    if (!callers.has(request)) {
      callers.set(request, Promise.resolve().then(() => slots.signIn(request)).then(who => ({ who: who ?? null }), () => ({ who: null, failed: true })));
    }
    return callers.get(request);
  }

  /** What every rule reads for one request, each slot read at most once, however many ask at the same time. */
  function runFor(request) {
    const key = request ?? {};
    if (!runs.has(key)) runs.set(key, makeRun(request));
    return runs.get(key);
  }
  async function makeRun(request) {
    const { who, failed } = request ? await signedIn(request) : { who: null, failed: false };
    let store;
    let registry;
    const run = {
      slots, who, failed, environment,
      owner: () => ownerOf(slots.owner()),
      store: () => (store ??= slots.store()),
      apps: () => slots.apps?.() ?? [],
      catalogue: () => run.apps().map(app => app.id),
      registry: () => (registry ??= buildRegistry(run)),
    };
    return run;
  }

  /** The project's keys, then each tool added from a chat whose id no project key takes. Tools are the live app's
   *  alone, and only a signed-in person's request reads them: a machine is refused before anything is read. */
  async function buildRegistry(run) {
    const code = slots.keys?.() ?? {};
    if (environment !== 'live' || !run.who?.email) return code;
    let tools = {};
    try { tools = await readTools(run.store(), run.who.email); } catch { /* no store: the project's keys alone */ }
    return { ...code, ...Object.fromEntries(Object.entries(tools).filter(([id]) => !Object.hasOwn(code, id))) };
  }
  /** The registry for a refusal's words: none when it can not be read. */
  const quietRegistry = async run => { try { return await run.registry(); } catch { return {}; } };

  async function decide(request) {
    if (!decided.has(request)) {
      decided.set(request, runFor(request).then(run => run.failed ? { state: 'unavailable' }
        : !run.who && !open() ? { state: 'denied' } : currentPolicy(run))
        .catch(() => ({ state: 'unavailable' })));
    }
    return decided.get(request);
  }

  async function gate(request, need, level = 'write') {
    // Public infrastructure is a reviewed route with no business data.
    if (need && 'kind' in need && need.kind === 'infrastructure') return null;
    const [run, policy] = await Promise.all([runFor(request), decide(request)]);
    if (!run.failed && !run.who && !open()) return signInFirst();
    const registry = await quietRegistry(run);
    const lacking = refusal(policy, need, level, registry, !!slots.apps);
    return lacking ? policyDenied(policy, lacking, registry) : null;
  }

  /** The route context a module route or an extra is handed. */
  function context(run, request, path, pass, registry) {
    let store = null;
    try { store = run.store(); } catch { /* a route with no store answers as it can */ }
    return { request, url: request && new URL(request.url), path, pass, caller: run.who, store, registry, slots,
      json: limit => boundedJson(request, limit), reply,
      refuse: (code, status, message) => reply({ error: { code, ...(message && { message }) } }, status),
      start: () => startAll(run, pass), reconcile: () => reconcile(run, pass), wait: () => {} };
  }

  /** What a signed-in person can open: their apps, and their level for each saved key used by itself. */
  async function appsAnswer(request, run) {
    if (request.method !== 'GET') return Response.json({ error: 'Not found' }, { status: 404 });
    const policy = await decide(request);
    if (policy.state === 'unavailable' || policy.state === 'denied') return policyDenied(policy);
    if (policy.state === 'legacy') return reply({ state: 'legacy' });
    const catalogue = (() => { try { return run.catalogue(); } catch { return []; } })();
    // Before permissions start everyone keeps every app; `manages` still says who manages people.
    if (policy.state === 'not_started') return reply({ state: 'not_started', role: policy.role, manages: policy.manages, apps: catalogue });
    const registry = await quietRegistry(run);
    return reply({ state: 'current', role: policy.role, manages: policy.manages, revision: policy.revision,
      // Opening a screen needs its app. Access itself is everyone's own page.
      apps: catalogue.filter(name => policyAllows(policy, name === 'access' ? { kind: 'self-service' } : { apps: [name] }, 'write', registry, !!slots.apps)),
      // The caller's own level for each saved key, by name: none until key levels start.
      keys: keyIds(registry).flatMap(id => { const level = policy.keys?.get(id); return level ? [{ id, title: keyTitle(registry, id), level }] : []; }) });
  }

  /** An extra's answer: a manager's pass for `manage`, else the caller's level on the key. */
  async function extra(entry, request, run, path, wait) {
    if (entry.need === 'manage') {
      let pass;
      try { pass = await managerPass(run, request); } catch (error) { return refused(error); }
      return entry.handle({ ...context(run, request, path, pass, await quietRegistry(run)), wait });
    }
    const denied = await gate(request, { keys: [entry.need.key] }, entry.need.level ?? 'write');
    if (denied) return denied;
    return entry.handle({ ...context(run, request, path, null, await quietRegistry(run)), policy: await decide(request), wait });
  }

  /** keys/ and tools/: a manager's pass first, refused in those routes' own shape. */
  async function managed(route, request, run, path) {
    let pass;
    try { pass = await managerPass(run, request); }
    catch (error) {
      const code = error instanceof AccessError ? error.code : 'access_unavailable';
      return reply({ error: { code } }, error instanceof AccessError ? error.status : 503);
    }
    return route(context(run, request, path, pass, await quietRegistry(run)));
  }

  async function services(request, run) {
    const policy = await decide(request);
    const registry = await quietRegistry(run);
    return servicesRoute({ request, caller: run.who, policy, registry, secret: slots.secret, leaks: slots.leaks,
      refusal: policyAllows(policy, { kind: 'self-service' }) ? null : policyDenied(policy) });
  }

  return {
    caller: async request => (await signedIn(request)).who,
    decide,
    gate,
    allows: (policy, need, level = 'write', registry = slots.keys?.() ?? {}) => policyAllows(policy, need, level, registry, !!slots.apps),
    denied: (policy, lacking = 'app', registry = slots.keys?.() ?? {}) => policyDenied(policy, lacking, registry),
    registry: async request => (await runFor(request)).registry(),
    /** The management pass of the owner or an Admin for this request, or null. */
    manages: async request => { try { return await managerPass(await runFor(request), request); } catch { return null; } },
    async serve(request, { wait = () => {} } = {}) {
      const url = new URL(request.url);
      if (url.pathname === '/api/services') return services(request, await runFor(request));
      // The API wins over the page, so a prefix under the page's path still answers JSON.
      if (!url.pathname.startsWith(prefix) && `${url.pathname}/`.startsWith(page) && !namesFile(url.pathname) && ['GET', 'HEAD'].includes(request.method)) {
        const { who, failed } = await signedIn(request);
        if (!failed && !who && !open()) return signInFirst();
        return new Response(pageHtml(page, prefix), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
      }
      if (!url.pathname.startsWith(prefix)) return null;
      const path = url.pathname.slice(prefix.length);
      const run = await runFor(request);
      const found = extras.find(entry => under(path, entry.path));
      if (found) return extra(found, request, run, path, wait);
      if (path === 'apps') return appsAnswer(request, run);
      if (path.startsWith('keys/')) return managed(keysRoute, request, run, path);
      if (path.startsWith('tools/')) return managed(toolsRoute, request, run, path);
      return manage(run, request, path);
    },
    /** The timed job on the live app: `work(ctx)` first, such as a project's own refresh, then the sign-in list
     *  brought to the saved people. Nothing off the live app or before the owner first opened Access. */
    async scheduled(work) {
      const run = await runFor(null);
      const pass = await scheduledPass(run);
      if (!pass) return;
      if (work) await work(context(run, null, '', pass, await quietRegistry(run)));
      await reconcile(run, pass).catch(() => {});
    },
  };
}
