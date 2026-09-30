#!/usr/bin/env node
// Read-only publication gate. Never modifies an Access policy or publishes content.
import { isDeepStrictEqual } from 'node:util';
import { privateDeployment, accessConflicts } from './lib-access-config.mjs';
import { findWranglerConfig, parseConfig, redirectedConfig } from './lib-wrangler-config.mjs';
import { isMain, parseCli, usageError } from './lib-cli.mjs';

const memory = [{ behavior: 'public', path_pattern: '/_memory/*' }];

export async function checkPrivateAccess(config, environment, cf, generated) {
  const production = privateDeployment(config, 'production');
  const staging = privateDeployment(config, 'staging');
  const target = environment === 'production' ? production : staging;
  if (generated && !isDeepStrictEqual(privateDeployment(generated, environment), target)) throw new Error('built configuration differs from the protected source Worker');
  if (production.open || staging.open) return checkOpen(config, environment, cf, production, staging);
  if (production.appId !== staging.appId || production.audience !== staging.audience || production.teamDomain !== staging.teamDomain || production.workerId === staging.workerId) throw new Error('production and staging must share one private app with distinct Workers');
  const account = config.account_id ?? process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!/^[a-f0-9]{32}$/i.test(account ?? '')) throw new Error('the Cloudflare account ID is missing');
  const root = `/accounts/${account}`;
  const list = async path => {
    const items = [];
    for (let page = 1; ; page++) {
      const batch = await cf(`${path}?per_page=50&page=${page}`);
      if (!Array.isArray(batch)) throw new Error('provider resource list is unavailable');
      items.push(...batch);
      if (batch.length < 50) return items;
    }
  };
  const workers = [];
  for (const expected of [production, staging]) {
    const worker = await cf(`${root}/workers/workers/${expected.name}`);
    if (worker.id !== expected.workerId || worker.name !== expected.name) throw new Error('the actual Worker ID does not match protected configuration');
    workers.push(worker);
    const secrets = await cf(`${root}/workers/scripts/${expected.name}/secrets`);
    if (!Array.isArray(secrets) || secrets.some(secret => ['SKIP_AUTH', 'WONG_ENVIRONMENT'].includes(secret.name))) throw new Error('deployed secrets override authentication configuration');
  }
  const scripts = await cf(`${root}/workers/scripts`);
  for (const worker of workers) worker.routes = scripts.find(script => script.id === worker.name)?.routes ?? [];
  const { subdomain } = await cf(`${root}/workers/subdomain`);
  if (!subdomain) throw new Error('the default Worker hostname is unavailable');
  const appPath = `${root}/access/apps/${target.appId}`;
  const app = await cf(appPath);
  const anchor = `${production.name}.${subdomain}.workers.dev`;
  const desired = [
    { type: 'worker', worker_id: production.workerId, overrides: memory },
    { type: 'worker', worker_id: staging.workerId },
    { type: 'public', uri: anchor, overrides: memory },
  ];
  const destinations = app.destinations ?? [];
  if (app.id !== target.appId || app.aud !== target.audience || app.type !== 'self_hosted' || app.domain !== anchor || destinations.length !== desired.length || desired.some(item => !destinations.some(value => isDeepStrictEqual(value, item)))) throw new Error('Access coverage or its memory exception is missing or broader than this workspace');
  const policies = await list(`${appPath}/policies`);
  const human = policies.filter(policy => policy.decision === 'allow');
  const machine = policies.filter(policy => policy.decision === 'non_identity');
  if (policies.length !== 2 || human.length !== 1 || machine.length !== 1 || !app.policies?.some(policy => policy.id === human[0].id) || !app.policies?.some(policy => policy.id === machine[0].id)) throw new Error('the separate human and machine policies are missing or unreviewed');
  if (human[0].include?.length < 1 || !Array.isArray(human[0].include) || human[0].include.some(rule => Object.keys(rule).length !== 1 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rule.email?.email ?? '') || /(?:\.invalid|@(?:[^@]*\.)?noreply\.github\.com)$/i.test(rule.email.email)) || !Array.isArray(machine[0].include) || machine[0].include.length !== 1 || Object.keys(machine[0].include[0]).length !== 1 || !machine[0].include[0].service_token?.token_id || policies.some(policy => (policy.exclude?.length ?? 0) || (policy.require?.length ?? 0))) throw new Error('workspace policies must use exact reachable emails and one separate service token');
  if (accessConflicts(await list(`${root}/access/apps`), workers, subdomain, app.id).length) throw new Error('another Access application overlaps this workspace; review hostname/path/preview precedence');
  return { environment, worker: target.name, protection: 'configured', humanLogin: 'unverified' };
}

const OPEN_WARNING = 'this workspace is open without login: anyone with its link can see it. Add a card to Cloudflare and rerun provision to make it private: wiki/stack/cloudflare-access.md#open-until-the-card';

/** Open until the card: no Access to check, but the Workers and secrets rule still hold. */
async function checkOpen(config, environment, cf, production, staging) {
  if (!production.open || !staging.open) throw new Error('production and staging must both be private or both open without login');
  if (!production.name || !staging.name || production.name === staging.name) throw new Error('production and staging need distinct Worker names');
  const account = config.account_id ?? process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!/^[a-f0-9]{32}$/i.test(account ?? '')) throw new Error('the Cloudflare account ID is missing');
  const root = `/accounts/${account}`;
  // The first deploy creates the Workers, so check secrets only on those that exist.
  const scripts = await cf(`${root}/workers/scripts`);
  if (!Array.isArray(scripts)) throw new Error('provider resource list is unavailable');
  for (const name of [production.name, staging.name]) {
    if (!scripts.some(script => script.id === name)) continue;
    const secrets = await cf(`${root}/workers/scripts/${name}/secrets`);
    if (!Array.isArray(secrets) || secrets.some(secret => ['SKIP_AUTH', 'WONG_ENVIRONMENT'].includes(secret.name))) throw new Error('deployed secrets override authentication configuration');
  }
  return { environment, worker: environment === 'production' ? production.name : staging.name, protection: 'open', humanLogin: 'none' };
}

async function main() {
  const usage = 'usage: node scripts/check-private-access.mjs --environment <production|staging> [--source-only]';
  const { values } = parseCli({ usage, options: { environment: { type: 'string' }, 'source-only': { type: 'boolean' } } });
  if (!['production', 'staging'].includes(values.environment)) usageError(usage);
  if (!process.env.CLOUDFLARE_API_TOKEN) throw new Error('the CI/host Cloudflare credential is missing');
  const path = findWranglerConfig();
  const redirected = values['source-only'] ? null : redirectedConfig(path);
  const cf = async route => {
    const response = await fetch(`https://api.cloudflare.com/client/v4${route}`, { headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` } });
    const body = await response.json();
    if (!response.ok || !body.success) throw new Error(`Cloudflare read-only protection check failed (${response.status}); finish private setup or restore CI Access: Apps and Policies Read`);
    return body.result;
  };
  const result = await checkPrivateAccess(parseConfig(path), values.environment, cf, redirected && parseConfig(redirected));
  if (result.protection === 'open') console.warn(`private-access: WARNING ${OPEN_WARNING}`);
  console.log(JSON.stringify(result));
}
if (isMain(import.meta.url)) main().catch(error => {
  console.error(`private-access: ${error.message}; no content or preview published`);
  process.exitCode = 1;
});
