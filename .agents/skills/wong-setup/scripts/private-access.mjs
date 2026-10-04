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

/** The two real Worker IDs and default-address login anchor share one owned application. */
export async function provisionAccess(cf, { account, repo, base, names, subdomain, state, checkpoint, note, today, adoptExisting }) {
  const root = `/accounts/${account}`;
  const workers = [];
  for (const name of [names.worker, names.staging]) {
    workers.push(await bootstrapWorker(cf, { root, name, state, checkpoint, note, today, adoptExisting, loginAnchor: name === names.worker }));
  }
  const scripts = await cf('GET', `${root}/workers/scripts`);
  for (const worker of workers) worker.routes = scripts.find(script => script.id === worker.name)?.routes ?? [];
  const apps = await accessList(cf, `${root}/access/apps`);
  const appName = `WongStack ${repo} (${base})`;
  let owned = apps.find(app => app.id === state.access?.appId);
  if (!owned && state.access?.pendingName === appName) {
    owned = apps.find(app => app.name === appName && workers.every(worker => app.destinations?.some(d => d.type === 'worker' && d.worker_id === worker.id)));
  }
  if (owned && owned.name !== appName) throw new AccessSetupError('the recorded Access application has changed ownership; review it before continuing');
  const conflicts = accessConflicts(apps, workers, subdomain, owned?.id);
  if (conflicts.length) throw new AccessSetupError(`Access applications ${conflicts.map(app => app.id).join(', ')} overlap this workspace; review their hostname/path/preview precedence before continuing`);
  if (!owned && apps.some(app => app.name === appName)) throw new AccessSetupError('an unowned Access application already uses this install name; review it before continuing');
  if (!owned) {
    state.access = { pendingName: appName };
    checkpoint();
    owned = await cf('POST', `${root}/access/apps`, {
      name: appName, type: 'self_hosted', session_duration: '720h',
      domain: `${names.worker}.${subdomain}.workers.dev`,
      destinations: [...workers.map(worker => ({ type: 'worker', worker_id: worker.id })), { type: 'public', uri: `${names.worker}.${subdomain}.workers.dev` }],
      policies: [],
    });
    note('created', `Access application ${appName}`);
  } else note('reused', `Access application ${appName}`);
  if (!owned.id || !owned.aud || !workers.every(worker => owned.destinations?.some(d => d.type === 'worker' && d.worker_id === worker.id))) {
    throw new AccessSetupError('Cloudflare did not establish both Worker destinations; business content remains unavailable');
  }
  state.access = { ...state.access, appId: owned.id, audience: owned.aud, workers: workers.map(({ name, id }) => ({ name, id })) };
  delete state.access.pendingName;
  checkpoint();
  return { accountId: account, ...state.access, coverage: 'configured', humanLogin: 'unverified' };
}

export const HUMAN_SESSION_DURATION = '720h';
const MEMORY_OVERRIDE = [{ behavior: 'public', path_pattern: '/_memory/*' }];

/** Activate the new unavailable production anchor once; later publication choices stay untouched. */
async function bootstrapLogin(cf, { account, access, state, checkpoint, note }) {
  const worker = access.workers[0];
  const owned = state.workers[worker.name];
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

async function machineCredential(cf, { root, state, checkpoint, credentials, saveCredentials, note }) {
  const name = `WongStack ${state.access.appId} verification`;
  const tokens = await accessList(cf, `${root}/service_tokens`);
  let token = tokens.find(item => item.id === state.access.serviceTokenId);
  if (!token && state.access.pendingServiceName === name) token = tokens.find(item => item.name === name);
  if (token && token.name !== name) throw new AccessSetupError('the recorded machine token has changed ownership; review it before continuing');
  if (!token) {
    if (tokens.some(item => item.name === name)) throw new AccessSetupError('an unowned service token uses this install name; review it before continuing');
    state.access.pendingServiceName = name;
    checkpoint();
    token = await cf('POST', `${root}/service_tokens`, { name, duration: '8760h' });
    state.access.serviceTokenId = token.id;
    checkpoint();
    await saveCredentials(token);
    note('created', 'workspace verification service token, in .env');
  } else if (!credentials.CF_ACCESS_CLIENT_SECRET || credentials.CF_ACCESS_CLIENT_ID !== token.client_id) {
    // Only this recorded token may rotate after an interrupted one-time secret handoff.
    const rotated = await cf('POST', `${root}/service_tokens/${token.id}/rotate`, {});
    await saveCredentials(rotated);
    note('updated', 'workspace verification service secret recovered in .env');
  } else note('reused', 'workspace verification service token in .env');
  if (!token.id || token.enabled === false) throw new AccessSetupError('the verification service token is unavailable; restore it before continuing');
  state.access.serviceTokenId = token.id;
  delete state.access.pendingServiceName;
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

/** Separate exact human permissions, machine authentication, and only the production memory exception. */
export async function provisionAccessPolicies(cf, { account, ownerEmail, teammateEmails, access, state, checkpoint, credentials, saveCredentials, note }) {
  const root = `/accounts/${account}/access`;
  const appPath = `${root}/apps/${access.appId}`;
  const app = await cf('GET', appPath);
  const policies = await accessList(cf, `${appPath}/policies`);
  const expectedIds = new Set([state.access.humanPolicyId, state.access.machinePolicyId].filter(Boolean));
  const expectedNames = new Set([`${app.name} people`, `${app.name} verification`]);
  if (policies.some(policy => !expectedIds.has(policy.id) && !expectedNames.has(policy.name))) {
    throw new AccessSetupError('the owned Access application contains an unreviewed policy; review it before continuing');
  }
  const machine = await machineCredential(cf, { root, state, checkpoint, credentials, saveCredentials, note });
  const existingHuman = policies.find(policy => policy.id === state.access.humanPolicyId);
  const teammates = teammateEmails ?? (existingHuman?.include ?? []).map(rule => rule.email?.email).filter(Boolean);
  const emails = humanEmails(ownerEmail, teammates);
  const human = await ownedPolicy(cf, {
    path: `${appPath}/policies`, policies, name: `${app.name} people`, id: state.access.humanPolicyId, note,
    body: { name: `${app.name} people`, decision: 'allow', include: emails.map(email => ({ email: { email } })), exclude: [], require: [], session_duration: app.session_duration ?? HUMAN_SESSION_DURATION },
  });
  state.access.humanPolicyId = human.id;
  checkpoint();
  const service = await ownedPolicy(cf, {
    path: `${appPath}/policies`, policies, name: `${app.name} verification`, id: state.access.machinePolicyId, note,
    body: { name: `${app.name} verification`, decision: 'non_identity', include: [{ service_token: { token_id: machine.id } }], exclude: [], require: [] },
  });
  state.access.machinePolicyId = service.id;
  checkpoint();
  const destinations = access.workers.map((worker, index) => ({ type: 'worker', worker_id: worker.id, ...(index === 0 ? { overrides: MEMORY_OVERRIDE } : {}) }));
  destinations.push({ type: 'public', uri: app.domain, overrides: MEMORY_OVERRIDE });
  const desired = { name: app.name, type: 'self_hosted', domain: app.domain, destinations, session_duration: app.session_duration ?? HUMAN_SESSION_DURATION, allowed_idps: [access.identityProviderId] };
  if (Object.entries(desired).some(([key, value]) => !isDeepStrictEqual(app[key], value))) {
    await cf('PUT', appPath, { ...desired, policies: [{ id: human.id }, { id: service.id }] });
    note('updated', 'production memory exception and workspace email login');
  }
  const checked = await cf('GET', appPath);
  if (!matchesFields(checked, { ...desired, id: access.appId, aud: access.audience })) {
    throw new AccessSetupError('Cloudflare did not retain the private workspace configuration; content remains unavailable');
  }
  const confirmed = await accessList(cf, `${appPath}/policies`);
  const expected = [
    { id: human.id, name: `${app.name} people`, decision: 'allow', include: emails.map(email => ({ email: { email } })), exclude: [], require: [] },
    { id: service.id, name: `${app.name} verification`, decision: 'non_identity', include: [{ service_token: { token_id: machine.id } }], exclude: [], require: [] },
  ];
  if (!human.id || !service.id || confirmed.length !== 2 || !expected.every(policy => confirmed.some(actual => matchesFields(actual, policy)))) {
    throw new AccessSetupError('Cloudflare did not retain both exact workspace policies; content remains unavailable');
  }
  await bootstrapLogin(cf, { account, access, state, checkpoint, note });
  return { ...access, ...state.access, sessionDuration: checked.session_duration };
}
