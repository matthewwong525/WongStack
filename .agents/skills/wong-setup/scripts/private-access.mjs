import { accessConflicts } from '../../../../scripts/lib-access-config.mjs';
// Private provisioning for interactive setup.
import { isDeepStrictEqual } from 'node:util';
export class AccessSetupError extends Error {
  constructor(message) {
    super(message);
    this.reason = 'access';
  }
}

/** A reachable login identity, separate from git's optional private author address. */
export function ownerIdentity(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /(?:\.invalid|@(?:[^@]*\.)?noreply\.github\.com)$/i.test(email)) {
    throw new AccessSetupError('private setup needs a reachable owner email; pass --owner-email with the verified owner address and run again');
  }
  return email;
}

/** Reuse account identity settings; add only missing organization and one-time PIN. */
export async function accessOrganization(cf, { account, base, note }) {
  const path = `/accounts/${account}/access`;
  const onboarding = `finish Zero Trust onboarding at https://one.dash.cloudflare.com/${account}/, then run private setup again; no business content was published`;
  let organization;
  try {
    organization = await cf('GET', `${path}/organizations`).catch(error => {
      if (error.status === 404) return null;
      throw error;
    });
    if (!organization?.auth_domain) {
      organization = await cf('POST', `${path}/organizations`, {
        name: `WongStack ${base}`, auth_domain: `${base}-${account.slice(0, 8)}.cloudflareaccess.com`,
      });
      note('created', 'Zero Trust organization');
    } else note('reused', 'Zero Trust organization');
    if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/i.test(organization?.auth_domain ?? '')) {
      throw new AccessSetupError(onboarding);
    }
    const providers = await cf('GET', `${path}/identity_providers?per_page=1000`);
    let pin = providers.find(provider => provider.type === 'onetimepin');
    if (!pin) {
      pin = await cf('POST', `${path}/identity_providers`, { name: 'WongStack email PIN', type: 'onetimepin', config: {} });
      note('created', 'one-time PIN identity provider');
    } else note('reused', 'one-time PIN identity provider');
    if (!pin?.id) throw new AccessSetupError(onboarding);
    return { teamDomain: organization.auth_domain, identityProviderId: pin.id };
  } catch (error) {
    if (error instanceof AccessSetupError) throw error;
    throw Object.assign(new AccessSetupError(`${error.message}; ${onboarding}`), { cause: error });
  }
}

/** Enumerate every page; a shared account must not hide a precedence conflict on page two. */
export async function accessList(cf, path) {
  const result = [];
  for (let page = 1; ; page++) {
    const items = await cf('GET', `${path}?per_page=50&page=${page}`);
    if (!Array.isArray(items)) throw new AccessSetupError(`Cloudflare did not return a resource list for ${path}`);
    result.push(...items);
    if (items.length < 50) return result;
  }
}

const notFound = async fn => fn().catch(error => {
  if (error.status === 404) return null;
  throw error;
});

/** A missing Worker gets only an unavailable response; existing content is never overwritten. */
async function bootstrapWorker(cf, { root, name, state, checkpoint, note, today, adoptExisting, loginAnchor }) {
  state.workers ??= {};
  let worker = await notFound(() => cf('GET', `${root}/workers/workers/${name}`));
  const remembered = state.workers[name];
  if (worker && !remembered && !adoptExisting) throw new AccessSetupError(`Worker ${name} already exists and is not owned by this install; choose a free base`);
  if (worker && remembered?.id && worker.id !== remembered.id) throw new AccessSetupError(`Worker ${name} has a different ID; review ownership before continuing`);
  if (!worker) {
    state.workers[name] = { name, pending: true, ...(loginAnchor && { bootstrapLoginPending: true }) };
    checkpoint();
    const form = new FormData();
    form.set('metadata', new Blob([JSON.stringify({ main_module: 'unavailable.mjs', compatibility_date: today })], { type: 'application/json' }));
    form.set('unavailable.mjs', new Blob(["export default {fetch(){return new Response('Workspace setup is incomplete',{status:503})}}"], { type: 'application/javascript+module' }), 'unavailable.mjs');
    await cf('PUT', `${root}/workers/scripts/${name}`, form);
    await cf('POST', `${root}/workers/scripts/${name}/subdomain`, { enabled: false, previews_enabled: false });
    worker = await cf('GET', `${root}/workers/workers/${name}`);
    note('created', `unavailable Worker ${name}`);
  } else {
    if (remembered?.pending) await cf('POST', `${root}/workers/scripts/${name}/subdomain`, { enabled: false, previews_enabled: false });
    note('reused', `Worker ${name}`);
  }
  if (worker.name !== name || !/^[a-f0-9]{32}$/i.test(worker.id ?? '')) throw new AccessSetupError(`Cloudflare did not return the actual ID for Worker ${name}; no content was published`);
  state.workers[name] = { name, id: worker.id, ...(state.workers[name]?.bootstrapLoginPending && { bootstrapLoginPending: true }) };
  checkpoint();
  return worker;
}

/** The owned app on record, or the one a stopped run was creating; an unrecorded app is never adopted. */
function findOwned(apps, record, name, recover) {
  let owned = apps.find(app => app.id === record?.appId);
  if (!owned && record?.pendingName === name) owned = apps.find(app => app.name === name && recover(app));
  if (owned && owned.name !== name) throw new AccessSetupError('the recorded Access application has changed ownership; review it before continuing');
  return owned;
}

const createApp = (cf, root, { name, domain, destinations }) => cf('POST', `${root}/access/apps`, {
  name, type: 'self_hosted', session_duration: '720h', domain, ...(destinations && { destinations }), policies: [],
});

/** Two owned apps: the live one covers the production Worker and its default-address login anchor, the previews one
 * the staging Worker alone, so a preview's sign-in never opens the live app. Records the previews app as `staging`. */
export async function provisionAccess(cf, { account, appName, names, subdomain, state, checkpoint, note, today, adoptExisting }) {
  const root = `/accounts/${account}`;
  const workers = [];
  for (const name of [names.worker, names.staging]) {
    workers.push(await bootstrapWorker(cf, { root, name, state, checkpoint, note, today, adoptExisting, loginAnchor: name === names.worker }));
  }
  const scripts = await cf('GET', `${root}/workers/scripts`);
  for (const worker of workers) worker.routes = scripts.find(script => script.id === worker.name)?.routes ?? [];
  const [production, staging] = workers;
  const host = worker => `${worker.name}.${subdomain}.workers.dev`;
  const holds = (app, worker) => app.destinations?.some(d => d.type === 'worker' && d.worker_id === worker.id);
  const previewsName = `${appName} previews`;
  const apps = await accessList(cf, `${root}/access/apps`);
  let live = findOwned(apps, state.access, appName, app => holds(app, production));
  let previews = findOwned(apps, state.access?.staging, previewsName, app => app.domain === host(staging));
  const conflicts = accessConflicts(apps, workers, subdomain, [live?.id, previews?.id]);
  if (conflicts.length) throw new AccessSetupError(`Access applications ${conflicts.map(app => app.id).join(', ')} overlap this workspace; review their hostname/path/preview precedence before continuing`);
  if ((!live && apps.some(app => app.name === appName)) || (!previews && apps.some(app => app.name === previewsName))) {
    throw new AccessSetupError('an unowned Access application already uses this install name; review it before continuing');
  }
  if (!live) {
    state.access = { pendingName: appName, ...(state.access?.staging && { staging: state.access.staging }) };
    checkpoint();
    live = await createApp(cf, root, { name: appName, domain: host(production), destinations: [{ type: 'worker', worker_id: production.id }, { type: 'public', uri: host(production) }] });
    note('created', `Access application ${appName}`);
  } else note('reused', `Access application ${appName}`);
  if (!live.id || !live.aud || !holds(live, production)) {
    throw new AccessSetupError('Cloudflare did not establish the live Worker destination; business content remains unavailable');
  }
  state.access = { ...state.access, appId: live.id, audience: live.aud, workers: workers.map(({ name, id }) => ({ name, id })) };
  delete state.access.pendingName;
  checkpoint();
  if (!previews) {
    // Leaving the live app's sign-in: what staging holds was open to branch code, so it is noted before anything moves.
    if (holds(live, staging)) notePreviewKeys(state, (await cf('GET', `${root}/workers/scripts/${staging.name}/secrets`)).map(secret => secret.name));
    state.access.staging = { pendingName: previewsName };
    checkpoint();
    // Bare at first: Access refuses a Worker two apps claim, so it takes the staging Worker after the live app lets go.
    previews = await createApp(cf, root, { name: previewsName, domain: host(staging) });
    note('created', `Access application ${previewsName}`);
  } else note('reused', `Access application ${previewsName}`);
  if (!previews.id || !previews.aud) throw new AccessSetupError('Cloudflare did not create the previews sign-in; business content remains unavailable');
  state.access.staging = { ...state.access.staging, appId: previews.id, audience: previews.aud };
  delete state.access.staging.pendingName;
  checkpoint();
  return { accountId: account, ...state.access, coverage: 'configured', humanLogin: 'unverified' };
}

export const HUMAN_SESSION_DURATION = '720h';
// The routes the Worker checks the sign-in on itself: git sends it as a password, which the edge can not read.
const GIT_OVERRIDE = { behavior: 'public', path_pattern: '/api/access/code/git/*' };
const LIVE_OVERRIDES = [{ behavior: 'public', path_pattern: '/_memory/*' }, GIT_OVERRIDE];

/** Activate the new unavailable production anchor once; later publication choices stay untouched. */
async function bootstrapLogin(cf, { account, access, state, checkpoint, note }) {
  const worker = access.workers[0];
  const owned = state.workers?.[worker.name];
  if (!owned?.bootstrapLoginPending) return;
  if (owned.id !== worker.id) throw new AccessSetupError('the bootstrap login Worker has changed ownership; review it before continuing');
  const path = `/accounts/${account}/workers/scripts/${worker.name}/subdomain`;
  const current = await cf('GET', path);
  if (typeof current.enabled !== 'boolean' || typeof current.previews_enabled !== 'boolean') {
    throw new AccessSetupError('Cloudflare did not return the bootstrap publication settings; run private setup again');
  }
  if (current.enabled === false && current.previews_enabled === false) {
    await cf('POST', path, { enabled: true, previews_enabled: false });
    const checked = await cf('GET', path);
    if (checked.enabled !== true || checked.previews_enabled !== false) {
      throw new AccessSetupError('Cloudflare did not activate the protected bootstrap login anchor; run private setup again');
    }
    note('updated', 'protected unavailable production login anchor');
  }
  delete owned.bootstrapLoginPending;
  checkpoint();
}

const matchesFields = (actual, expected) => actual && Object.entries(expected).every(([key, value]) => isDeepStrictEqual(actual[key], value));

/** Build the latest exact allowlist; synthetic extra-workspace rows never grant an identity. */
export function humanEmails(ownerEmail, teammates = []) {
  const owner = ownerIdentity(ownerEmail);
  const real = teammates.filter(email => typeof email !== 'string' || !email.trim().toLowerCase().endsWith('.invalid')).map(ownerIdentity);
  return [...new Set([owner, ...real])].sort();
}

/** One app's own checker token, saved in .env under `prefix`: `CF_ACCESS` live, `CF_ACCESS_STAGING` for previews.
 * `keep` uses the recorded token as it is: never made, rotated or saved, whatever this machine's .env holds. */
async function machineCredential(cf, { root, record, prefix, label, keep, checkpoint, credentials, saveCredentials, note }) {
  const name = `WongStack ${record.appId} verification`;
  const tokens = await accessList(cf, `${root}/service_tokens`);
  let token = tokens.find(item => item.id === record.serviceTokenId);
  if (!token && record.pendingServiceName === name) token = tokens.find(item => item.name === name);
  if (token && token.name !== name) throw new AccessSetupError('the recorded machine token has changed ownership; review it before continuing');
  if (keep) {
    if (!token) throw new AccessSetupError(`the ${label} verification service token on record is gone; run setup's provision step to make a new one`);
    note('reused', `${label} verification service token`);
  } else if (!token) {
    if (tokens.some(item => item.name === name)) throw new AccessSetupError('an unowned service token uses this install name; review it before continuing');
    record.pendingServiceName = name;
    checkpoint();
    token = await cf('POST', `${root}/service_tokens`, { name, duration: '8760h' });
    record.serviceTokenId = token.id;
    checkpoint();
    await saveCredentials(token, prefix);
    note('created', `${label} verification service token, in .env`);
  } else if (!credentials[`${prefix}_CLIENT_SECRET`] || credentials[`${prefix}_CLIENT_ID`] !== token.client_id) {
    // Only this recorded token may rotate after an interrupted one-time secret handoff.
    const rotated = await cf('POST', `${root}/service_tokens/${token.id}/rotate`, {});
    await saveCredentials(rotated, prefix);
    note('updated', `${label} verification service secret recovered in .env`);
  } else note('reused', `${label} verification service token in .env`);
  if (!token.id || token.enabled === false) throw new AccessSetupError('the verification service token is unavailable; restore it before continuing');
  record.serviceTokenId = token.id;
  delete record.pendingServiceName;
  checkpoint();
  return token;
}

async function ownedPolicy(cf, { path, policies, name, id, body, note }) {
  const current = policies.find(policy => policy.id === id) ?? policies.find(policy => policy.name === name);
  if (current && current.name !== name) throw new AccessSetupError('a recorded workspace policy has changed ownership; review it before continuing');
  if (current && !id && !isDeepStrictEqual(current.include, body.include)) {
    throw new AccessSetupError(`policy ${current.id} has an unrecorded permission set; review it before continuing`);
  }
  if (current) {
    const desired = { ...body, session_duration: current.session_duration ?? body.session_duration };
    if (Object.entries(desired).some(([key, value]) => !isDeepStrictEqual(current[key], value))) {
      const updated = await cf('PUT', `${path}/${current.id}`, desired);
      note('updated', `Access policy ${name}`);
      return updated;
    }
    note('reused', `Access policy ${name}`);
    return current;
  }
  const created = await cf('POST', path, body);
  note('created', `Access policy ${name}`);
  return created;
}

/** An owned app and its policies, refused when it holds a policy this install did not make. */
async function reviewApp(cf, root, record) {
  const path = `${root}/apps/${record.appId}`;
  const app = await cf('GET', path);
  const policies = await accessList(cf, `${path}/policies`);
  const expectedIds = new Set([record.humanPolicyId, record.machinePolicyId].filter(Boolean));
  const expectedNames = new Set([`${app.name} people`, `${app.name} verification`]);
  if (policies.some(policy => !expectedIds.has(policy.id) && !expectedNames.has(policy.name))) {
    throw new AccessSetupError('the owned Access application contains an unreviewed policy; review it before continuing');
  }
  return { path, app, policies };
}

/** One app's exact people list and its own checker token, each in a policy of its own. */
async function appPolicies(cf, { root, side, emails, checkpoint, credentials, saveCredentials, note }) {
  const { path, app, policies, record } = side;
  const machine = await machineCredential(cf, { root, record, prefix: side.prefix, label: side.label, keep: side.keep, checkpoint, credentials, saveCredentials, note });
  const people = { name: `${app.name} people`, decision: 'allow', include: emails.map(email => ({ email: { email } })), exclude: [], require: [] };
  const verification = { name: `${app.name} verification`, decision: 'non_identity', include: [{ service_token: { token_id: machine.id } }], exclude: [], require: [] };
  const human = await ownedPolicy(cf, {
    path: `${path}/policies`, policies, name: people.name, id: record.humanPolicyId, note,
    body: { ...people, session_duration: app.session_duration ?? HUMAN_SESSION_DURATION },
  });
  record.humanPolicyId = human.id;
  checkpoint();
  const service = await ownedPolicy(cf, { path: `${path}/policies`, policies, name: verification.name, id: record.machinePolicyId, note, body: verification });
  record.machinePolicyId = service.id;
  checkpoint();
  if (!human.id || !service.id) throw new AccessSetupError('Cloudflare did not retain both exact workspace policies; content remains unavailable');
  side.expected = [{ ...people, id: human.id }, { ...verification, id: service.id }];
}

/** One app's own Worker and default host, its login methods, and its policies in order. */
async function placeApp(cf, { side, idps, note }) {
  const { path, app, worker, overrides } = side;
  const destinations = [{ type: 'worker', worker_id: worker.id, overrides }, { type: 'public', uri: app.domain, overrides }];
  side.desired = { name: app.name, type: 'self_hosted', domain: app.domain, destinations, session_duration: app.session_duration ?? HUMAN_SESSION_DURATION, allowed_idps: idps };
  if (Object.entries(side.desired).some(([key, value]) => !isDeepStrictEqual(app[key], value))) {
    await cf('PUT', path, { ...side.desired, policies: side.expected.map(({ id }) => ({ id })) });
    note('updated', side.placed);
  }
}

/** Reads one app back: its Worker, login, and exactly its two policies. */
async function confirmApp(cf, side) {
  const checked = await cf('GET', side.path);
  if (!matchesFields(checked, { ...side.desired, id: side.record.appId, aud: side.record.audience })) {
    throw new AccessSetupError('Cloudflare did not retain the private workspace configuration; content remains unavailable');
  }
  const confirmed = await accessList(cf, `${side.path}/policies`);
  if (confirmed.length !== 2 || !side.expected.every(policy => confirmed.some(actual => matchesFields(actual, policy)))) {
    throw new AccessSetupError('Cloudflare did not retain both exact workspace policies; content remains unavailable');
  }
  return checked;
}

/** Each app gets the same people and login methods, its own checker token and Worker; the staging Worker moves last,
 * as Access refuses a Worker two apps claim. `keepLiveChecker` leaves the live checker token as it is. */
export async function provisionAccessPolicies(cf, { account, ownerEmail, teammateEmails, access, state, checkpoint, credentials, saveCredentials, note, keepLiveChecker = false }) {
  const root = `/accounts/${account}/access`;
  const [production, staging] = access.workers;
  const live = { record: state.access, worker: production, overrides: LIVE_OVERRIDES, prefix: 'CF_ACCESS', label: 'workspace', keep: keepLiveChecker, placed: 'memory and project-download exceptions and workspace email login' };
  const previews = { record: state.access.staging, worker: staging, overrides: [GIT_OVERRIDE], prefix: 'CF_ACCESS_STAGING', label: 'preview', placed: `previews sign-in on ${staging.name}` };
  for (const side of [live, previews]) Object.assign(side, await reviewApp(cf, root, side.record));
  const existingHuman = live.policies.find(policy => policy.id === state.access.humanPolicyId);
  const teammates = teammateEmails ?? (existingHuman?.include ?? []).map(rule => rule.email?.email).filter(Boolean);
  const emails = humanEmails(ownerEmail, teammates);
  for (const side of [previews, live]) await appPolicies(cf, { root, side, emails, checkpoint, credentials, saveCredentials, note });
  // The live app keeps the login methods it has; a new app, which has none yet, gets the email PIN.
  const idps = live.app.allowed_idps?.length ? live.app.allowed_idps : [access.identityProviderId];
  for (const side of [live, previews]) await placeApp(cf, { side, idps, note });
  const checked = await confirmApp(cf, live);
  await confirmApp(cf, previews);
  await bootstrapLogin(cf, { account, access, state, checkpoint, note });
  return { ...access, ...state.access, sessionDuration: checked.session_duration };
}

/** The production Worker secret Access reads its sign-in list key from. Staging never holds it. */
export const LOGIN_KEY_SECRET = 'WONG_ACCESS_LOGIN_MANAGEMENT';
/** The secret the read-only Cloudflare key is read from, on production alone. */
export const CLOUDFLARE_READ_SECRET = 'WONG_CLOUDFLARE_READ';

/** Adds keys staging held on the live app's sign-in to `state.stagingHeld`, which the Access step names for rotation
 * until it has once; a newly held read-only key is marked to roll, so a rerun rolls it even after staging lost it. */
export function notePreviewKeys(state, names) {
  const added = names.filter(name => !(state.stagingHeld ?? []).includes(name));
  if (!added.length) return;
  state.stagingHeld = [...(state.stagingHeld ?? []), ...added];
  if (added.includes(CLOUDFLARE_READ_SECRET)) state.cloudflareReadKey = { ...state.cloudflareReadKey, pending: true };
}

/** One account key the live app holds as a Worker secret, reused while it holds it and its recorded `ids` match, else
 * rolled. `recorded`, the install record's entry, stands in for absent state; a 401 or 403 is `missing`. */
async function workerKey(cf, { account, name, worker, secret, version, ids = {}, recorded, slot, label, policies, state, checkpoint, note }) {
  const tokens = `/accounts/${account}/tokens`;
  const secrets = `/accounts/${account}/workers/scripts/${worker}/secrets`;
  try {
    const found = (await cf('GET', `${tokens}?per_page=100`)).find(token => token.name === name);
    const holds = (await cf('GET', secrets)).some(item => item.name === secret);
    const known = state[slot] ?? (recorded?.status === 'ready' && recorded.id === found?.id ? recorded : {});
    if (found && holds && matchesFields(known, ids) && !known.pending) {
      note('reused', `${label} ${name}`);
      return { status: 'ready', id: found.id, ...ids };
    }
    state[slot] = { name, pending: true };
    checkpoint();
    // A key's value can not be read back, so an interrupted run or a lost secret rolls it.
    const minted = found ? { id: found.id, value: await cf('PUT', `${tokens}/${found.id}/value`, {}) } : await cf('POST', tokens, { name, policies: await policies() });
    if (!minted?.id || typeof minted.value !== 'string' || !minted.value) throw new AccessSetupError(`Cloudflare did not return the ${label}; run setup again`);
    await cf('PUT', secrets, { name: secret, type: 'secret_text', text: JSON.stringify({ version, token: minted.value, accountId: account, ...ids }) });
    state[slot] = { id: minted.id, name, ...ids };
    checkpoint();
    note(found ? 'updated' : 'created', `${label} ${name}, stored in the live app only`);
    return { status: 'ready', id: minted.id, ...ids };
  } catch (error) {
    if (error.status !== 401 && error.status !== 403) throw error;
    return { status: 'missing' };
  }
}

/** The live app's own key for both apps' sign-in lists, stored in the production Worker alone. Cloudflare scopes
 * the key to the account; the app calls only its own two applications and people policies. */
export const loginManagementKey = (cf, { policyId, staging, ...rest }) => workerKey(cf, {
  ...rest, secret: LOGIN_KEY_SECRET, version: 3, ids: { policyId, staging }, slot: 'loginKey', label: 'sign-in list key',
});

/** The key behind the app's Cloudflare look-ups, on production alone. It reads settings, logs and usage:
 * it can change nothing, and reads no stored data. */
export const cloudflareReadKey = (cf, options) => workerKey(cf, {
  ...options, secret: CLOUDFLARE_READ_SECRET, version: 1, slot: 'cloudflareReadKey', label: 'read-only Cloudflare key',
});
