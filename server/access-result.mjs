// A private installer result for the authenticated host-to-cloud channel. Nothing here prints secrets.
import { createHash, randomUUID } from 'node:crypto';
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { cloudflare, ProvisionError } from '../.agents/skills/wong-setup/scripts/provision.mjs';
import { accessList } from '../.agents/skills/wong-setup/scripts/private-access.mjs';

const ID = /^[A-Za-z0-9_-]{1,128}$/;
const TOKEN_ID = /^[a-f0-9]{32}$/i;
const fail = message => { throw new ProvisionError('repo', message); };
const within = (parent, path) => path === parent || path.startsWith(`${parent}${sep}`);
const pathInfo = path => {
  try { return lstatSync(path); } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
};

/** Validate the job-derived destination before any content can be published. */
export function managementDestination(input, { home, repoDir, sourceDir }) {
  if (input === undefined) return null;
  const recipient = input?.recipient;
  if (input?.version !== 1 || !recipient || !['ownerId', 'vmId', 'jobId', 'connectionId'].every(key => typeof recipient[key] === 'string' && ID.test(recipient[key])) || !Number.isSafeInteger(recipient.generation) || recipient.generation < 1) {
    fail('the management result needs version 1 and the trusted host recipient; reconnect with an updated host');
  }
  if (Object.keys(recipient).some(key => !['ownerId', 'vmId', 'jobId', 'connectionId', 'generation'].includes(key))) fail('the management recipient has unsupported fields');
  const path = join(resolve(home), '.local/state/wongstack/access-results', `${recipient.jobId}.json`);
  if (input.path !== path || within(resolve(repoDir), path) || within(resolve(sourceDir), path)) fail('the management result must use the trusted host job path outside the repository');
  const cleanupTokenIds = input.cleanupTokenIds ?? [];
  if (!Array.isArray(cleanupTokenIds) || cleanupTokenIds.length > 32 || !cleanupTokenIds.every(id => typeof id === 'string' && TOKEN_ID.test(id))) fail('management cleanup needs only recorded account-token IDs');
  // Reject symlinks, including a missing file under a symlinked parent.
  let component = resolve(home);
  if (pathInfo(component)?.isSymbolicLink()) fail('the private management destination cannot contain a symlink');
  for (const part of relative(component, path).split(sep)) {
    component = join(component, part);
    if (pathInfo(component)?.isSymbolicLink()) fail('the private management destination cannot contain a symlink');
  }
  if (existsSync(dirname(path))) {
    const info = lstatSync(dirname(path));
    if (!info.isDirectory() || (info.mode & 0o777) !== 0o700 || info.uid !== process.getuid()) fail('the management result directory must belong to the workspace user with mode 0700');
  }
  if (existsSync(path)) readPrivate(path);
  return { path, recipient: { ...recipient }, cleanupTokenIds: [...new Set(cleanupTokenIds)] };
}

function readPrivate(path) {
  const info = lstatSync(path);
  if (!info.isFile() || (info.mode & 0o777) !== 0o600 || info.uid !== process.getuid() || info.size > 16 * 1024) fail('the management result must be a regular private file owned by the workspace user');
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fail('the private management result is invalid; recover through the trusted host'); }
}

function writePrivate(path, value) {
  const text = `${JSON.stringify(value)}\n`;
  if (Buffer.byteLength(text) > 16 * 1024) fail('the management result exceeds the private handoff size limit');
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${randomUUID()}.tmp`;
  const fd = openSync(temporary, 'wx', 0o600);
  try {
    writeFileSync(fd, text);
    fsyncSync(fd);
  } finally { closeSync(fd); }
  renameSync(temporary, path);
}

/** Canonical checked-out source identity, never inferred from job data or the template default. */
export async function checkedOutSource(sourceDir, exec) {
  const [origin, head] = await Promise.all([
    exec('git', ['-C', sourceDir, 'remote', 'get-url', 'origin']),
    exec('git', ['-C', sourceDir, 'rev-parse', 'HEAD']),
  ]);
  const remote = origin.stdout.trim().replace(/\.git$/, '');
  const match = /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100})$/i.exec(remote);
  const commit = head.stdout.trim();
  if (!match || !/^[a-f0-9]{40}$/i.test(commit)) fail('the managed installer needs an actual pinned GitHub source origin and commit');
  return { repo: match[1], commit: commit.toLowerCase() };
}

const expectedPolicies = (account, permissionId) => [{ effect: 'allow', resources: { [`com.cloudflare.api.account.${account}`]: '*' }, permission_groups: [{ id: permissionId }] }];
const restricted = (token, account, permissionId) => {
  const policies = token?.policies?.map(({ effect, resources, permission_groups }) => ({ effect, resources, permission_groups: permission_groups.map(({ id }) => ({ id })) }));
  return isDeepStrictEqual(policies, expectedPolicies(account, permissionId));
};

/** A retry must prove its existing file belongs to this job before provisioning. */
export function validateExistingManagementResult(destination, metadata) {
  if (!destination || !existsSync(destination.path)) return;
  const existing = readPrivate(destination.path);
  for (const [field, value] of Object.entries({ version: 1, recipient: destination.recipient, ...metadata })) {
    if (!isDeepStrictEqual(existing[field], value)) fail('the private management result belongs to another job, recipient, or source; recover through the trusted host');
  }
}

/** Mint only account-scoped Access policy authority and retain delivery outside every repo file. */
export async function writeManagementResult({ destination, source, report, ownerEmail, repo, token, api, fetch, dir, exec }) {
  if (!destination) return;
  const { access } = report;
  const metadata = {
    version: 1, recipient: destination.recipient, source, accountId: access.accountId, repo, ownerEmail,
    appId: access.appId, aud: access.audience, teamDomain: access.teamDomain,
    anchorHostname: new URL(report.urls.production).hostname,
    policyIds: { human: access.humanPolicyId, machine: access.machinePolicyId },
    workers: { production: access.workers[0], staging: access.workers[1] }, sessionDuration: access.sessionDuration,
  };
  const cf = cloudflare(token, { api, fetch });
  const groups = await cf('GET', '/user/tokens/permission_groups?per_page=1000');
  const permissionId = groups.find(group => group.name === 'Access: Apps and Policies Write' && group.scopes?.includes('com.cloudflare.api.account'))?.id;
  if (!permissionId) fail('Cloudflare lists no account-scoped Access management permission');
  const root = `/accounts/${access.accountId}/tokens`;
  const common = (await exec('git', ['-C', dir, 'rev-parse', '--path-format=absolute', '--git-common-dir'])).stdout.trim();
  const markerPath = join(common, 'wong-stack-management.json');
  const markers = existsSync(markerPath) ? JSON.parse(readFileSync(markerPath, 'utf8')) : {};
  const connection = createHash('sha256').update(destination.recipient.connectionId).digest('hex').slice(0, 16);
  const prefix = `${report.base}-access-${connection}-`;
  const name = `${prefix}${destination.recipient.generation}`;
  const key = `${access.accountId}:${destination.recipient.connectionId}:${destination.recipient.generation}`;
  let existing = existsSync(destination.path) ? readPrivate(destination.path) : null;
  if (existing) {
    if (!Object.entries(metadata).every(([field, value]) => isDeepStrictEqual(existing[field], value))) fail('the private management result belongs to another job, recipient, or source; recover through the trusted host');
    const current = await cf('GET', `${root}/${existing.tokenId}`);
    if (!restricted(current, access.accountId, permissionId) || current.name !== name || typeof existing.token !== 'string' || !/^[A-Za-z0-9_-]+$/.test(existing.token)) fail('the retained management credential does not match this restricted connection');
  } else {
    const tokens = await accessList(cf, root);
    let owned = tokens.find(item => item.id === markers[key]?.tokenId);
    if (!owned && markers[key]?.pendingName === name) owned = tokens.find(item => item.name === name);
    if (owned) {
      const current = await cf('GET', `${root}/${owned.id}`);
      if (current.name !== name || !restricted(current, access.accountId, permissionId)) fail('the recorded management token changed ownership or permissions; reconnect before continuing');
      existing = { tokenId: owned.id, token: await cf('PUT', `${root}/${owned.id}/value`, {}) };
    } else {
      if (tokens.some(item => item.name === name)) fail('an unowned management token uses this connection name; review it before continuing');
      markers[key] = { pendingName: name };
      writeFileSync(markerPath, JSON.stringify(markers));
      const made = await cf('POST', root, { name, policies: expectedPolicies(access.accountId, permissionId) });
      existing = { tokenId: made.id, token: made.value };
    }
    if (!TOKEN_ID.test(existing.tokenId ?? '') || !/^[A-Za-z0-9_-]+$/.test(existing.token ?? '')) fail('Cloudflare did not return a restricted management credential');
    markers[key] = { tokenId: existing.tokenId };
    writeFileSync(markerPath, JSON.stringify(markers));
    writePrivate(destination.path, { ...metadata, ...existing, cleanup: { revokedTokenIds: [], pendingTokenIds: destination.cleanupTokenIds } });
  }
  const revokedTokenIds = [];
  const pendingTokenIds = [];
  for (const id of destination.cleanupTokenIds) {
    if (id === existing.tokenId) { pendingTokenIds.push(id); continue; }
    try {
      const previous = await cf('GET', `${root}/${id}`);
      if (!previous.name?.startsWith(prefix) || !restricted(previous, access.accountId, permissionId)) { pendingTokenIds.push(id); continue; }
      await cf('DELETE', `${root}/${id}`);
      revokedTokenIds.push(id);
    } catch (error) {
      if (error.status === 404) revokedTokenIds.push(id);
      else pendingTokenIds.push(id);
    }
  }
  writePrivate(destination.path, { ...metadata, tokenId: existing.tokenId, token: existing.token, cleanup: { revokedTokenIds, pendingTokenIds } });
}
