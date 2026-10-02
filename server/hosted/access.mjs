import { accessConflicts } from '../../scripts/lib-access-config.mjs';
import { need } from './security.mjs';

const fieldsMatch = (row, expected) => Object.entries(expected).every(([key, value]) => JSON.stringify(row?.[key]) === JSON.stringify(value));
export async function accessSetup(state, provider, checkpoint) {
  const root = provider.path('access');
  const organization = await provider.request(`${root}/organizations`);
  need(/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(organization?.auth_domain || ''), 'Platform Zero Trust organization is unavailable', 502);
  const idps = await provider.request(`${root}/identity_providers?per_page=1000`);
  const pin = idps.find(row => row.type === 'onetimepin');
  need(pin?.id, 'Platform verified email login is unavailable', 502);
  const workers = [];
  for (const environment of ['production', 'staging', 'memory']) {
    const name = state.resources.find(row => row.kind === 'worker' && row.environment === environment).name;
    const row = await provider.request(provider.path(`workers/workers/${name}`));
    need(row?.name === name && /^[a-f0-9]{32}$/.test(row.id), 'Owned Worker identity unreadable', 502);
    workers.push({ name, id: row.id });
  }
  const subdomain = await provider.request(provider.path('workers/subdomain'));
  need(/^[a-z0-9-]+$/.test(subdomain?.subdomain || ''), 'Platform Workers subdomain unavailable', 502);
  const apps = await list(provider, `${root}/apps`);
  state.access ??= { teamDomain: organization.auth_domain, audience: null, appId: null, pendingName: `WongStack hosted ${state.id}` };
  const appName = `WongStack hosted ${state.id}`;
  let app = apps.find(row => row.id === state.access.appId);
  if (!app && state.access.pendingName === appName) app = apps.find(row => row.name === appName && workers.every(worker => row.destinations?.some(destination => destination.type === 'worker' && destination.worker_id === worker.id)));
  need(!accessConflicts(apps, workers, subdomain.subdomain, app?.id).length, 'Another Access application overlaps project Workers');
  need(!app || app.name === appName, 'Access application ownership mismatch');
  if (!app) {
    need(!apps.some(row => row.name === appName), 'Access application name already owned');
    await checkpoint();
    app = await provider.request(`${root}/apps`, 'POST', { name: appName, type: 'self_hosted', session_duration: '24h', domain: `${workers[0].name}.${subdomain.subdomain}.workers.dev`, destinations: workers.map(worker => ({ type: 'worker', worker_id: worker.id })), allowed_idps: [pin.id], policies: [] });
  }
  need(app?.id && app.aud && workers.every(worker => app.destinations?.some(row => row.worker_id === worker.id)), 'Access application receipt missing', 502);
  state.access = { ...state.access, appId: app.id, audience: app.aud, teamDomain: organization.auth_domain, workers, domain: app.domain };
  delete state.access.pendingName;
  await checkpoint();
  await policies(state, provider, checkpoint);
  const observed = await provider.request(`${root}/apps/${app.id}`);
  need(observed?.id === app.id && observed.aud === app.aud && observed.name === appName && observed.type === 'self_hosted' && observed.domain === app.domain && Array.isArray(observed.destinations) && observed.destinations.length === workers.length && workers.every(worker => observed.destinations.some(row => row.type === 'worker' && row.worker_id === worker.id)) && Array.isArray(observed.allowed_idps) && observed.allowed_idps.length === 1 && observed.allowed_idps[0] === pin.id, 'Exact Access application readback failed', 502);
  state.access.verified = true;
  await checkpoint();
  return state.access;
}
async function list(provider, path) {
  const out = [];
  for (let page = 1; page <= 100; page++) {
    const rows = await provider.request(`${path}?per_page=50&page=${page}`);
    need(Array.isArray(rows), 'Access resource list unreadable', 502); out.push(...rows);
    if (rows.length < 50) return out;
  }
  throw new Error('Access resource pagination exceeded bound');
}
async function ownedPolicy(provider, root, current, desired, id) {
  const row = current.find(each => each.id === id || each.name === desired.name);
  need(!row || row.name === desired.name, 'Access policy ownership mismatch');
  return row ? fieldsMatch(row, desired) ? row : provider.request(`${root}/${row.id}`, 'PUT', desired) : provider.request(root, 'POST', desired);
}
export async function policies(state, provider, checkpoint) {
  const root = provider.path('access');
  const access = state.access;
  need(access?.appId, 'Project Access application required');
  const tokens = await list(provider, `${root}/service_tokens`);
  let token = tokens.find(row => row.id === access.serviceTokenId);
  const name = `WongStack hosted ${state.id} verification`;
  if (!token) {
    need(!tokens.some(row => row.name === name), 'Unrecorded verification token requires reconciliation');
    access.pendingServiceToken = true; await checkpoint();
    token = await provider.request(`${root}/service_tokens`, 'POST', { name, duration: '8760h' });
    need(token?.id && token.client_id && token.client_secret, 'Verification token receipt missing', 502);
    access.serviceTokenId = token.id; access.clientId = token.client_id; access.clientSecret = token.client_secret; delete access.pendingServiceToken; await checkpoint();
  }
  need(token.name === name && token.enabled !== false && access.clientId === token.client_id && access.clientSecret, 'Verification credential requires operator reconciliation');
  const path = `${root}/apps/${access.appId}/policies`;
  const current = await list(provider, path);
  const humanName = `WongStack hosted ${state.id} people`;
  need(current.every(row => [humanName, name].includes(row.name)), 'Project contains unreviewed Access policies');
  const emails = [...new Set([state.owner.email, ...Object.values(state.grants).filter(grant => grant.status === 'active').map(grant => grant.email)])].sort();
  const human = { name: humanName, decision: 'allow', include: emails.map(email => ({ email: { email } })), exclude: [], require: [], session_duration: '24h' };
  const machine = { name, decision: 'non_identity', include: [{ service_token: { token_id: access.serviceTokenId } }], exclude: [], require: [] };
  access.humanPolicyId = (await ownedPolicy(provider, path, current, human, access.humanPolicyId)).id;
  access.machinePolicyId = (await ownedPolicy(provider, path, current, machine, access.machinePolicyId)).id;
  await checkpoint();
  const checked = await list(provider, path);
  need(checked.length === 2 && checked.some(row => fieldsMatch(row, { ...human, id: access.humanPolicyId })) && checked.some(row => fieldsMatch(row, { ...machine, id: access.machinePolicyId })), 'Exact Access policy readback failed', 502);
}
export async function revokeHuman(state, provider, email, checkpoint) {
  await policies(state, provider, checkpoint);
  // Project-scoped token invalidation preserves other applications in the platform account.
  await provider.request(provider.path(`access/apps/${state.access.appId}/revoke_tokens`), 'POST');
  state.access.revokedEmail = email; state.access.revocationAcknowledgedAt = Date.now();
  await checkpoint();
}
export const verificationHeaders = state => ({ 'CF-Access-Client-Id': state.access.clientId, 'CF-Access-Client-Secret': state.access.clientSecret });
