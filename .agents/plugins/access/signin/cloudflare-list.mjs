// The live app's own sign-in list on Cloudflare Access: exact applications and their human policies only. Its key
// can not run hosting or memory. The project's `signInList` slot is `cloudflareList(config)`.
import { AccessError, Unreadable, boundedJson } from '../server/errors.mjs';
import { isEmail, isObject } from '../server/sets.mjs';

const CF = 'https://api.cloudflare.com/client/v4';
const POLICY_ID = /^[A-Za-z0-9-]+$/;
const ACCOUNT_ID = /^[a-f0-9]{32}$/;
const APP_ID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
// Fields Cloudflare owns; everything else in the live policy goes back unchanged.
const READ_ONLY = ['id', 'created_at', 'updated_at', 'uid', 'app_count'];

const exactly = (value, fields, optional = []) => isObject(value) && Object.keys(value).every(name => fields.includes(name) || optional.includes(name)) &&
  fields.every(name => Object.hasOwn(value, name));
const text = value => typeof value === 'string';
const list = value => Array.isArray(value);
/** A value in the shape asked, else Unreadable: an answer this module can not read. */
const read = (value, check) => { if (!check(value)) throw new Unreadable(); return value; };

/** Setup's key for the sign-in list, from its JSON. Version 3 adds the previews app: that list plus GitHub pushers.
 *  Null until setup has supplied it, or when it is not in this shape. */
export function loginAuthority(json) {
  let value;
  try { value = JSON.parse(json ?? ''); } catch { return null; }
  const staging = value?.staging;
  const ok = exactly(value, ['version', 'token', 'accountId', 'policyId'], ['staging']) && [2, 3].includes(value.version) &&
    text(value.token) && value.token.length > 0 && text(value.accountId) && ACCOUNT_ID.test(value.accountId) &&
    text(value.policyId) && POLICY_ID.test(value.policyId) &&
    (staging === undefined || (exactly(staging, ['appId', 'policyId']) && text(staging.appId) && APP_ID.test(staging.appId) &&
      text(staging.policyId) && POLICY_ID.test(staging.policyId))) &&
    (value.version === 3) === (staging !== undefined);
  return ok ? value : null;
}

/** Fixed provider origin only. A redirect comes back unfollowed and fails like any non-2xx answer, so it never
 *  receives the key. */
export async function provider(path, token, method = 'GET', body) {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('..')) throw new AccessError('provider_destination_invalid');
  const response = await fetch(`${CF}${path}`, { method, redirect: 'manual', signal: AbortSignal.timeout(30_000),
    headers: { ...(token && { Authorization: `Bearer ${token}` }), Accept: 'application/json', 'Content-Type': 'application/json',
      'User-Agent': 'WongStack-employee-access' },
    ...(body && { body: JSON.stringify(body) }) });
  if (!response.ok) throw new AccessError(response.status === 404 ? 'provider_not_found' : 'provider_unavailable');
  if (response.status === 204) return null;
  return boundedJson(response, 1_048_576);
}

const envelope = value => read(value, item => isObject(item) && item.success === true).result;
const emailRule = rule => exactly(rule, ['email']) && exactly(rule.email, ['email']) && isEmail(rule.email.email);
// Cloudflare's app-scoped policy list can leave `session_duration` out: an absent field stays absent on the write.
const isPolicy = value => isObject(value) && text(value.id) && text(value.name) && value.decision === 'allow' &&
  list(value.include) && value.include.every(emailRule) && list(value.exclude) && list(value.require) &&
  (value.session_duration === undefined || text(value.session_duration)) &&
  (value.app_count === undefined || typeof value.app_count === 'number') && (value.reusable === undefined || typeof value.reusable === 'boolean');
const isApp = value => isObject(value) && text(value.id) && text(value.aud) && list(value.destinations) &&
  value.destinations.every(item => isObject(item) && text(item.type) && (item.worker_id === undefined || text(item.worker_id)));
const isListed = value => list(value) && value.every(item => isObject(item) && text(item.id) && text(item.decision) && list(item.include));
const serviceToken = rule => exactly(rule, ['service_token']) && exactly(rule.service_token, ['token_id']) &&
  text(rule.service_token.token_id) && rule.service_token.token_id.length > 0;
const sorted = values => [...values].sort().join('\n');
const emails = policy => policy.include.map(rule => rule.email.email.trim().toLowerCase());
const controls = value => JSON.stringify(Object.fromEntries(Object.entries(value)
  .filter(([field]) => field !== 'include' && !READ_ONLY.includes(field)).sort(([a], [b]) => a.localeCompare(b))));

/** One application and its human policy, read and reviewed. An unreviewed allow or bypass policy must never become
 *  another way in. */
async function review(authority, appId, policyId, owned) {
  const path = `/accounts/${authority.accountId}/access/apps/${appId}`;
  const app = read(envelope(await provider(path, authority.token)), isApp);
  if (app.id !== appId || !owned(app)) throw new AccessError('login_resource_mismatch');
  const policies = read(envelope(await provider(`${path}/policies?per_page=1000`, authority.token)), isListed);
  if (policies.length > 2 || policies.some(policy => policy.id !== policyId &&
    (policy.decision !== 'non_identity' || !policy.include.length || !policy.include.every(serviceToken)))) {
    throw new AccessError('login_policy_review_required');
  }
  const policy = read(policies.find(item => item.id === policyId), isPolicy);
  if (policy.reusable || (policy.app_count !== undefined && policy.app_count !== 1)) throw new AccessError('login_policy_review_required');
  return { path, policy };
}

/** The sign-in list on Cloudflare Access. `config`: `key()` gives setup's key JSON; `appId`, `audience` and
 *  `workerId` name the live app's application; `previews({ store })` gives the emails the previews app adds, such as
 *  GitHub pushers. */
export function cloudflareList(config) {
  const authority = () => loginAuthority(config.key());

  /** The live app's application, then the previews app's once split: each reviewed alike. */
  async function applications(key) {
    const { appId, audience, workerId } = config;
    if (!appId || !audience || !workerId) throw new AccessError('login_resource_mismatch');
    // The live app's application must be this app's own and cover this server.
    const live = await review(key, appId, key.policyId, app => app.aud === audience &&
      app.destinations.some(destination => destination.type === 'worker' && destination.worker_id === workerId));
    if (!key.staging) return [live];
    // The server knows no previews audience or server, so the previews app is judged by its recorded id alone.
    return [live, await review(key, key.staging.appId, key.staging.policyId, () => true)];
  }

  /** Each application's list, live app first: the owner and active people; the previews app adds its own. */
  async function desiredLists(store, owner, count) {
    const [people, previews] = await Promise.all([store.listed(), config.previews?.({ store }) ?? []]);
    const listed = values => [...new Set(values)].sort();
    return Array.from({ length: count }, (_, at) => listed(at === 0 ? [owner, ...people] : [owner, ...people, ...previews]));
  }

  /** Read each live policy, change only its email list, and send the rest back unchanged. */
  async function updatePolicy(key, { store, owner, holder }, live, generation) {
    const desired = await desiredLists(store, owner, live.length);
    const body = (policy, at) => ({ ...Object.fromEntries(Object.entries(policy).filter(([field]) => !READ_ONLY.includes(field))),
      include: desired[at].map(email => ({ email: { email } })) });
    // No call has begun when this refuses, so no write's outcome is unknown.
    const intent = await store.beginWrite({ generation, holder });
    if (!intent) throw new AccessError('provider_lease_expired');
    try {
      for (const [at, { path, policy }] of live.entries()) await provider(`${path}/policies/${policy.id}`, key.token, 'PUT', body(policy, at));
      await store.endWrite(intent, 'completed');
    } catch (error) {
      await store.endWrite(intent, 'unknown');
      throw error;
    }
    const checked = await applications(key);
    if (checked.some(({ policy }, at) => sorted(emails(policy)) !== sorted(desired[at]) || controls(policy) !== controls(live[at].policy))) {
      throw new AccessError('login_policy_readback_pending');
    }
  }

  /** One provider attempt. False means a newer change arrived meanwhile, so go round again. */
  async function attempt(key, options, { generation, scope }) {
    const { store, holder, kind } = options;
    if (!await store.leaseCurrent(holder)) throw new AccessError('provider_lease_expired');
    const live = await applications(key);
    if (kind === 'policy') await updatePolicy(key, options, live, generation);
    else for (const { path } of scope === 'previews' ? live.slice(1) : live) envelope(await provider(`${path}/revoke_tokens`, key.token, 'POST', {}));
    const current = await store.step(kind);
    if (!current || current.generation !== generation || !await store.leaseCurrent(holder)) {
      // Even a later step's earlier success can be undone by this stale write.
      await store.stepStale(kind);
      return false;
    }
    // An earlier write whose outcome is unknown keeps the list unconfirmed until it can no longer land.
    if (kind === 'policy' && await store.unresolvedWrites()) {
      await store.stepUnresolved();
      return true;
    }
    await store.stepDone({ kind, generation, holder,
      outcome: kind === 'policy' ? 'policy_readback_matches' : 'session_revocation_accepted_propagation_unverified' });
    return true;
  }

  return {
    ready: () => authority() !== null,
    /** Whether the previews app has its own list yet: an older single sign-in app has none to widen. */
    split: () => authority()?.version === 3,
    /** Everyone the live app's list admits now, for the first open's import. */
    async admitted() {
      const key = authority();
      if (!key) return [];
      return emails((await applications(key))[0].policy);
    },
    /** One sign-in list step, `policy` or `sessions`, under the caller's lease. Nothing without the key, or before
     *  permissions start: until the first open has listed everyone already admitted, a write could drop a teammate. */
    async reconcile(options) {
      const key = authority();
      const { store, kind } = options;
      if (!key || !(await store.started()).policy) return;
      for (let round = 0; round < 3; round++) {
        const work = await store.step(kind);
        if (!work || work.status === 'ready') return;
        try {
          if (await attempt(key, options, work)) return;
        } catch (error) {
          await store.stepFailed({ kind, generation: work.generation,
            code: error instanceof AccessError ? error.code : 'login_provider_unavailable' });
          return;
        }
      }
    },
    /** Whether the previews app's list differs from the saved people and its own extras: a rerun of setup rewrites it
     *  without them. One read, and none while a list write waits; an unreadable list counts as matching. */
    async drifted({ store, owner }) {
      const key = authority();
      if (!key?.staging || await store.stepWaiting()) return false;
      try {
        const path = `/accounts/${key.accountId}/access/apps/${key.staging.appId}/policies?per_page=1000`;
        const found = read(envelope(await provider(path, key.token)), value => list(value) && value.every(item => isObject(item) && text(item.id)))
          .find(policy => policy.id === key.staging.policyId);
        return sorted(emails(read(found, isPolicy))) !== sorted((await desiredLists(store, owner, 2))[1]);
      } catch { return false; }
    },
  };
}
